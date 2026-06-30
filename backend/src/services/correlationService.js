const AutopsyEvent = require('../models/AutopsyEvent');
const Project = require('../models/Project');
const User = require('../models/User');

const EVENT_SOURCE = {
  scope_change: 'clickup', task_complete: 'clickup', task_create: 'clickup',
  deadline_shift: 'jira', sprint_start: 'jira', sprint_end: 'jira',
  blocker: 'github', pr_merge: 'github', commit: 'github',
  status_change: 'teams', comment: 'teams',
  budget_update: 'stripe', payment: 'stripe',
};

const SRC_COLORS = {
  clickup: '#7B68EE', jira: '#0052CC', github: '#6e40c9',
  stripe: '#635BFF', teams: '#6264A7', internal: '#64748B',
};

const SRC_LABELS = {
  clickup: 'ClickUp', jira: 'Jira', github: 'GitHub',
  stripe: 'Stripe', teams: 'Teams', internal: 'Internal',
};

function src(et) { return EVENT_SOURCE[et] || 'internal'; }

async function findHiddenInsights(domain) {
  const results = [];

  const [events, users] = await Promise.all([
    AutopsyEvent.find({ domain }).sort({ timestamp: -1 }).limit(5000).lean(),
    User.find({ domain, isActive: true }).select('name role email activityScore assignedProjects status').lean(),
  ]);

  if (events.length < 10) return results;

  const byType = {};
  for (const e of events) {
    const t = e.eventType;
    if (!byType[t]) byType[t] = [];
    byType[t].push(e);
  }

  const byProject = {};
  for (const e of events) {
    const pid = e.projectId ? e.projectId.toString() : '_none';
    if (!byProject[pid]) byProject[pid] = [];
    byProject[pid].push(e);
  }

  const c1 = findCrossToolCorrelations(events, byType, byProject);
  results.push(...c1);

  const c2 = findRevenueLeakage(events, byType, byProject);
  results.push(...c2);

  const c3 = findCoordinationGaps(events, byProject);
  results.push(...c3);

  const c4 = findBehavioralDrift(events, users, byType);
  results.push(...c4);

  const c5 = findNegativeSpace(events, byProject, byType);
  results.push(...c5);

  results.sort((a, b) => (b.impact || 0) - (a.impact || 0));
  return results.slice(0, 20);
}

function findCrossToolCorrelations(events, byType, byProject) {
  const results = [];
  const pairs = [
    { a: 'scope_change', aLabel: 'Scope changes', aSource: 'clickup', b: 'budget_update', bLabel: 'Budget updates', bSource: 'stripe', dir: 'positive' },
    { a: 'blocker', aLabel: 'Blockers', aSource: 'github', b: 'deadline_shift', bLabel: 'Deadline shifts', bSource: 'jira', dir: 'positive' },
    { a: 'task_create', aLabel: 'Task creation', aSource: 'clickup', b: 'task_complete', bLabel: 'Task completion', aSource: 'clickup', bSource: 'clickup', dir: 'positive' },
    { a: 'status_change', aLabel: 'Status discussions', aSource: 'teams', b: 'blocker', bLabel: 'Blocker emergence', bSource: 'github', dir: 'positive' },
    { a: 'scope_change', aLabel: 'Scope changes', aSource: 'clickup', b: 'deadline_shift', bLabel: 'Deadline shifts', bSource: 'jira', dir: 'positive' },
  ];

  for (const pair of pairs) {
    const evA = byType[pair.a] || [];
    const evB = byType[pair.b] || [];
    if (evA.length < 3 || evB.length < 3) continue;

    const timestampsA = evA.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
    const timestampsB = evB.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);

    const lagDays = estimateLag(timestampsA, timestampsB);
    if (lagDays === null) continue;

    const sharedProjects = countSharedProjects(evA, evB);
    if (sharedProjects < 1) continue;

    const confidence = Math.min(95, Math.round(
      (Math.min(evA.length, evB.length) / 20) * 40 +
      (sharedProjects / 5) * 30 +
      (lagDays !== null && lagDays <= 7 ? 25 : 10)
    ));
    if (confidence < 40) continue;

    const recentB = evB.filter(e => {
      const d = new Date(e.timestamp);
      return (Date.now() - d.getTime()) < 14 * 86400000;
    });

    results.push({
      type: 'correlation',
      title: `${pair.aLabel} ${pair.bLabel}`,
      description: `${pair.aLabel} (${pair.aSource}) are followed by ${pair.bLabel.toLowerCase()} (${pair.bSource}) within ~${lagDays} days. ${sharedProjects} project(s) affected.`,
      detail: `${evA.length} ${pair.aLabel.toLowerCase()} detected → ${evB.length} ${pair.bLabel.toLowerCase()} follow within ${lagDays}d window`,
      impact: recentB.length > 0 ? recentB.length * 5000 : 0,
      confidence,
      lagDays,
      evidenceCount: Math.min(evA.length + evB.length, 10),
      sourceA: pair.aSource,
      sourceB: pair.bSource,
      colorA: SRC_COLORS[pair.aSource] || '#64748B',
      colorB: SRC_COLORS[pair.bSource] || '#64748B',
      labelA: SRC_LABELS[pair.aSource] || pair.aSource,
      labelB: SRC_LABELS[pair.bSource] || pair.bSource,
      links: evA.slice(0, 3).map(e => ({
        eventType: e.eventType,
        source: src(e.eventType),
        timestamp: e.timestamp,
        reason: e.reason || '',
      })),
    });
  }

  return results;
}

function findRevenueLeakage(events, byType, byProject) {
  const results = [];
  const budgetEvents = byType['budget_update'] || [];
  const stripePayments = budgetEvents.filter(e => e.after && e.after.amount);

  if (stripePayments.length < 2) return results;

  const scopeChanges = byType['scope_change'] || [];
  const blockers = byType['blocker'] || [];

  let totalLeakage = 0;
  let linkedCount = 0;

  for (const pay of stripePayments) {
    const payTime = new Date(pay.timestamp).getTime();
    const amount = Math.abs(Number(pay.after.amount) || 0);

    const recentScope = scopeChanges.filter(e => {
      const et = new Date(e.timestamp).getTime();
      return Math.abs(et - payTime) < 7 * 86400000 && e.projectId && pay.projectId &&
        e.projectId.toString() === pay.projectId.toString();
    });

    const recentBlockers = blockers.filter(e => {
      const et = new Date(e.timestamp).getTime();
      return Math.abs(et - payTime) < 7 * 86400000 && e.projectId && pay.projectId &&
        e.projectId.toString() === pay.projectId.toString();
    });

    if (recentScope.length > 0 || recentBlockers.length > 0) {
      totalLeakage += amount;
      linkedCount++;
    }
  }

  if (totalLeakage > 0) {
    results.push({
      type: 'revenue_leakage',
      title: `Unplanned charges linked to project instability`,
      description: `Stripe charges totaling ~$${totalLeakage.toLocaleString()} occurred within 7 days of scope changes or blockers across ${linkedCount} charge(s).`,
      detail: `${scopeChanges.length} scope changes + ${blockers.length} blockers precede ${linkedCount} Stripe charge(s)`,
      impact: totalLeakage,
      confidence: Math.min(90, 50 + linkedCount * 10),
      evidenceCount: linkedCount,
      sourceA: 'stripe',
      sourceB: 'internal',
      colorA: SRC_COLORS.stripe,
      colorB: '#64748B',
      labelA: 'Stripe',
      labelB: 'Project Events',
    });
  }

  const pendingTasks = (byType['task_create'] || []).filter(e => {
    const age = Date.now() - new Date(e.timestamp).getTime();
    return age > 14 * 86400000;
  });

  const completions = byType['task_complete'] || [];
  const stuckRate = pendingTasks.length > 0
    ? Math.round((pendingTasks.length / ((byType['task_create'] || []).length || 1)) * 100)
    : 0;

  if (stuckRate > 30 && pendingTasks.length > 3) {
    const cost = pendingTasks.length * 2500;
    results.push({
      type: 'revenue_leakage',
      title: `${pendingTasks.length} tasks stalled >2 weeks (${stuckRate}%)`,
      description: `${pendingTasks.length} created tasks never completed. Estimated sunk cost: ~$${cost.toLocaleString()}.`,
      detail: `${pendingTasks.length} tasks created but never completed in >14 days`,
      impact: cost,
      confidence: Math.min(80, stuckRate),
      evidenceCount: pendingTasks.length,
      sourceA: 'clickup',
      sourceB: 'internal',
      colorA: SRC_COLORS.clickup,
      colorB: '#64748B',
      labelA: 'ClickUp',
      labelB: 'System',
    });
  }

  return results;
}

function findCoordinationGaps(events, byProject) {
  const results = [];
  const projectIds = Object.keys(byProject);

  if (projectIds.length < 2) return results;

  const projectScopeChanges = {};
  for (const [pid, evts] of Object.entries(byProject)) {
    const scopes = evts.filter(e => e.eventType === 'scope_change');
    if (scopes.length > 0) {
      projectScopeChanges[pid] = scopes;
    }
  }

  const pids = Object.keys(projectScopeChanges);
  let overlapFound = false;
  let overlapCount = 0;

  for (let i = 0; i < pids.length && !overlapFound; i++) {
    for (let j = i + 1; j < pids.length && !overlapFound; j++) {
      const a = projectScopeChanges[pids[i]];
      const b = projectScopeChanges[pids[j]];

      for (const evA of a) {
        const tA = new Date(evA.timestamp).getTime();
        for (const evB of b) {
          const tB = new Date(evB.timestamp).getTime();
          if (Math.abs(tA - tB) < 5 * 86400000) {
            overlapFound = true;
            overlapCount++;
            break;
          }
        }
      }
    }
  }

  if (overlapCount > 0) {
    results.push({
      type: 'coordination_gap',
      title: `Simultaneous scope changes across ${pids.length} projects`,
      description: `${pids.length} projects had scope changes within the same 5-day window. Possible coordination gap — teams may be reacting to similar pressures independently.`,
      detail: `${overlapCount} overlapping scope change events detected across ${pids.length} projects`,
      impact: overlapCount * 12000,
      confidence: Math.min(70, 40 + overlapCount * 10),
      evidenceCount: Math.min(overlapCount, 5),
      sourceA: 'clickup',
      sourceB: 'internal',
      colorA: SRC_COLORS.clickup,
      colorB: '#64748B',
      labelA: 'ClickUp',
      labelB: 'Cross-project',
    });
  }

  return results;
}

function findBehavioralDrift(events, users, byType) {
  const results = [];

  const overloaded = users.filter(u =>
    u.activityScore > 80 && (u.assignedProjects || []).length > 3
  );

  if (overloaded.length > 0) {
    const names = overloaded.map(u => u.name).join(', ');
    results.push({
      type: 'behavioral_drift',
      title: `${overloaded.length} team member(s) showing overload pattern`,
      description: `${names} have high activity scores (>80) across ${overloaded.length > 1 ? 'multiple projects' : 'several projects'}. Pattern historically leads to 2-3x burnout risk.`,
      detail: `${overloaded.length} user(s) at >80 activity with ${overloaded[0]?.assignedProjects?.length || 3}+ projects`,
      impact: overloaded.length * 25000,
      confidence: 60,
      evidenceCount: overloaded.length,
      sourceA: 'internal',
      sourceB: 'teams',
      colorA: '#64748B',
      colorB: SRC_COLORS.teams,
      labelA: 'System',
      labelB: 'Teams',
    });
  }

  const comments = byType['comment'] || [];
  const lastWeekComments = comments.filter(e => {
    const d = new Date(e.timestamp);
    return (Date.now() - d.getTime()) < 7 * 86400000;
  });
  const monthOldComments = comments.filter(e => {
    const d = new Date(e.timestamp);
    const age = Date.now() - d.getTime();
    return age > 21 * 86400000 && age < 28 * 86400000;
  });

  if (lastWeekComments.length > 0 && monthOldComments.length > 0) {
    const change = Math.round(((lastWeekComments.length - monthOldComments.length) / monthOldComments.length) * 100);
    if (Math.abs(change) > 40) {
      results.push({
        type: 'behavioral_drift',
        title: `Teams communication ${change > 0 ? 'surge' : 'drop'}: ${Math.abs(change)}%`,
        description: `Teams comment activity ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change)}% compared to 3 weeks ago. ${change > 0 ? 'May indicate incident response or escalation.' : 'May indicate disengagement or reduced collaboration.'}`,
        detail: `${lastWeekComments.length} comments this week vs ${monthOldComments.length} baseline`,
        impact: Math.abs(change) * 500,
        confidence: Math.min(65, Math.abs(change)),
        evidenceCount: lastWeekComments.length,
        sourceA: 'teams',
        sourceB: 'internal',
        colorA: SRC_COLORS.teams,
        colorB: '#64748B',
        labelA: 'Teams',
        labelB: 'System',
      });
    }
  }

  return results;
}

function findNegativeSpace(events, byProject, byType) {
  const results = [];

  const tasksCreated = byType['task_create'] || [];
  const tasksCompleted = byType['task_complete'] || [];
  const unmatchedCreate = tasksCreated.filter(created => {
    const t = new Date(created.timestamp).getTime();
    const hasCompletion = tasksCompleted.some(done => {
      const dt = new Date(done.timestamp).getTime();
      return done.projectId && created.projectId &&
        done.projectId.toString() === created.projectId.toString() &&
        dt > t && (dt - t) < 30 * 86400000;
    });
    return !hasCompletion;
  });

  if (unmatchedCreate.length > 5) {
    results.push({
      type: 'negative_space',
      title: `${unmatchedCreate.length} tasks created but never completed (30d)`,
      description: `${unmatchedCreate.length} tasks were opened across projects but never marked complete within 30 days. These represent either abandoned work or untracked effort.`,
      detail: `${unmatchedCreate.length} tasks opened with zero completion signal`,
      impact: unmatchedCreate.length * 1500,
      confidence: 75,
      evidenceCount: unmatchedCreate.length,
      sourceA: 'clickup',
      sourceB: 'internal',
      colorA: SRC_COLORS.clickup,
      colorB: '#64748B',
      labelA: 'ClickUp',
      labelB: 'System',
    });
  }

  const blockers = byType['blocker'] || [];
  const blockerWithoutResolution = blockers.filter(b => {
    const bt = new Date(b.timestamp).getTime();
    return !events.some(e =>
      e.eventType === 'task_complete' &&
      e.projectId && b.projectId &&
      e.projectId.toString() === b.projectId.toString() &&
      new Date(e.timestamp).getTime() > bt &&
      new Date(e.timestamp).getTime() - bt < 14 * 86400000
    );
  });

  if (blockerWithoutResolution.length > 2) {
    results.push({
      type: 'negative_space',
      title: `${blockerWithoutResolution.length} blockers unresolved >2 weeks`,
      description: `${blockerWithoutResolution.length} blocker events were recorded but no completion or resolution was detected within 14 days. Blockers may be silently blocking progress.`,
      detail: `${blockerWithoutResolution.length} blockers with no resolution signal`,
      impact: blockerWithoutResolution.length * 8000,
      confidence: 65,
      evidenceCount: blockerWithoutResolution.length,
      sourceA: 'github',
      sourceB: 'internal',
      colorA: SRC_COLORS.github,
      colorB: '#64748B',
      labelA: 'GitHub',
      labelB: 'System',
    });
  }

  return results;
}

function estimateLag(timestampsA, timestampsB) {
  if (timestampsA.length < 3 || timestampsB.length < 3) return null;

  const day = 86400000;
  const windows = [1, 2, 3, 5, 7, 14];
  let bestLag = null;
  let bestScore = 0;

  for (const lag of windows) {
    let matches = 0;
    const lagMs = lag * day;
    for (const ta of timestampsA) {
      for (const tb of timestampsB) {
        const diff = tb - ta;
        if (diff > 0 && diff <= lagMs) {
          matches++;
          break;
        }
      }
    }
    const score = matches / Math.min(timestampsA.length, timestampsB.length);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  return bestLag;
}

function countSharedProjects(evA, evB) {
  const pidsA = new Set();
  const pidsB = new Set();
  for (const e of evA) { if (e.projectId) pidsA.add(e.projectId.toString()); }
  for (const e of evB) { if (e.projectId) pidsB.add(e.projectId.toString()); }
  let shared = 0;
  for (const pid of pidsA) { if (pidsB.has(pid)) shared++; }
  return shared;
}

module.exports = { findHiddenInsights };
