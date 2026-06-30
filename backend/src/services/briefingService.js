const ProjectViability = require('../models/ProjectViability');
const Project = require('../models/Project');
const AutopsyEvent = require('../models/AutopsyEvent');
const DecisionJournal = require('../models/DecisionJournal');
const CorporateMemory = require('../models/CorporateMemory');
const StrategyGoal = require('../models/StrategyGoal');
const User = require('../models/User');
const viabilityService = require('./viabilityService');
const correlationService = require('./correlationService');

const SOURCE_LABELS = {
  clickup: { label: 'ClickUp', color: '#7B68EE' },
  jira: { label: 'Jira', color: '#0052CC' },
  github: { label: 'GitHub', color: '#24292F' },
  stripe: { label: 'Stripe', color: '#635BFF' },
  teams: { label: 'Teams', color: '#6264A7' },
  outlook: { label: 'Outlook', color: '#0078D4' },
  internal: { label: 'Internal', color: '#6B7280' },
};

const EVENT_SOURCE_MAP = {
  scope_change: 'clickup', task_complete: 'clickup', task_create: 'clickup',
  deadline_shift: 'jira', sprint_start: 'jira', sprint_end: 'jira',
  blocker: 'github', pr_merge: 'github', commit: 'github',
  status_change: 'teams', comment: 'teams',
  budget_update: 'stripe', payment: 'stripe',
};

function findSource(eventType) {
  return EVENT_SOURCE_MAP[eventType] || 'internal';
}

async function generateBriefing(domain) {
  const board = await viabilityService.getOracleBoard(domain);
  const viabilities = board.filter(v => v.projectId && v.projectId._id);

  const [
    projects, events, decisions,
    goals, users, memories,
  ] = await Promise.all([
    Project.find({ domain, isActive: true })
      .select('name status progress phase startDate deadline settings.priority members')
      .lean(),
    AutopsyEvent.find({ domain })
      .sort({ timestamp: -1 })
      .limit(2000)
      .lean(),
    DecisionJournal.find({ domain })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    StrategyGoal.find({ domain, active: true })
      .sort({ weight: -1 })
      .lean(),
    User.find({ domain, isActive: true })
      .select('name role email avatar activityScore status assignedProjects')
      .lean(),
    CorporateMemory.find({ domain })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const health = computeHealthScore(viabilities, projects, users);
  const mtdCost = computeMTDCost(projects, events);
  const causalChains = computeCausalChains(projects, events, decisions);
  const actions = await generateActions(viabilities, projects, goals, users);
  const risks = aggregateRisks(viabilities, events, projects);
  const hiddenInsights = await correlationService.findHiddenInsights(domain);

  return {
    generatedAt: new Date(),
    domain,
    health,
    mtdCost,
    causalChains,
    hiddenInsights,
    actions,
    risks,
    stats: {
      totalProjects: projects.length,
      totalViabilities: viabilities.length,
      atRiskCount: viabilities.filter(v => (v.score || 0) < 55).length,
      killRecommended: viabilities.filter(v => v.recommendation === 'kill').length,
      totalSavings: viabilities.reduce((s, v) => s + (v.projectedSavings || 0), 0),
      averageScore: viabilities.length > 0
        ? Math.round(viabilities.reduce((s, v) => s + (v.score || 0), 0) / viabilities.length)
        : 0,
      activeGoals: goals.length,
      teamSize: users.length,
    },
  };
}

function computeHealthScore(viabilities, projects, users) {
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalUsers = users.length;
  const activeRatio = totalUsers > 0 ? activeUsers / totalUsers : 0;

  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalProjects = projects.length;
  const completionRatio = totalProjects > 0 ? completedProjects / totalProjects : 0;

  const atRiskCount = viabilities.filter(v => (v.score || 0) < 55).length;
  const atRiskClamped = Math.min(atRiskCount, Math.max(totalProjects, 1));
  const projectHealthRatio = totalProjects > 0 ? (totalProjects - atRiskClamped) / totalProjects : 0;

  const viabilityAvg = viabilities.length > 0
    ? viabilities.reduce((s, v) => s + (v.score || 0), 0) / viabilities.length
    : 50;

  let score = Math.round(
    (activeRatio * 0.15 +
    completionRatio * 0.20 +
    projectHealthRatio * 0.25 +
    (viabilityAvg / 100) * 0.40) * 100
  );

  score = Math.min(100, Math.max(0, score));

  let label = 'Critical';
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';
  else if (score >= 20) label = 'Poor';

  return { score, label };
}

function computeMTDCost(projects, events) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeProjects = projects.filter(p => p.isActive !== false && p.status !== 'completed');
  const avgDailyCost = 5000;
  const daysInMonth = now.getDate();
  const baseCost = activeProjects.length * avgDailyCost * daysInMonth;

  const budgetEvents = events.filter(e =>
    e.eventType === 'budget_update' || e.eventType === 'payment'
  );
  const stripeTotal = budgetEvents.reduce((s, e) => {
    if (e.after && e.after.amount) return s + Number(e.after.amount);
    return s;
  }, 0);

  const total = baseCost + stripeTotal;
  const change = computeCostChange(events, daysInMonth);

  return {
    monthToDate: total,
    dailyBurn: Math.round(total / Math.max(1, daysInMonth)),
    projectsCount: activeProjects.length,
    stripeCharges: stripeTotal,
    estimatedBase: baseCost,
    change,
    currency: 'USD',
  };
}

function computeCostChange(events, daysInMonth) {
  const halfPoint = Math.floor(daysInMonth / 2);
  const eventsWithDays = events.filter(e => e.daysSinceProjectStart !== undefined);
  const firstHalf = eventsWithDays.filter(e => e.daysSinceProjectStart <= halfPoint).length;
  const secondHalf = eventsWithDays.filter(e => e.daysSinceProjectStart > halfPoint).length;
  if (firstHalf === 0) return 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}

function computeCausalChains(projects, events, decisions) {
  const chains = [];

  const projectMap = {};
  for (const p of projects) {
    projectMap[p._id.toString()] = p;
  }

  const eventsByProject = {};
  for (const e of events) {
    const pid = e.projectId?.toString();
    if (!pid) continue;
    if (!eventsByProject[pid]) eventsByProject[pid] = [];
    eventsByProject[pid].push(e);
  }

  const projectIds = Object.keys(eventsByProject);
  const projectScores = {};
  for (const pid of projectIds) {
    const evts = eventsByProject[pid];
    const scopeChanges = evts.filter(e => e.eventType === 'scope_change').length;
    const blockers = evts.filter(e => e.eventType === 'blocker').length;
    const deadlineShifts = evts.filter(e => e.eventType === 'deadline_shift').length;
    const taskCompletions = evts.filter(e => e.eventType === 'task_complete').length;
    projectScores[pid] = { scopeChanges, blockers, deadlineShifts, taskCompletions, total: evts.length };
  }

  const sorted = projectIds.sort((a, b) => {
    const sa = projectScores[a];
    const sb = projectScores[b];
    return (sb.blockers + sb.deadlineShifts) - (sa.blockers + sa.deadlineShifts);
  });

  for (let i = 0; i < Math.min(sorted.length, 5); i++) {
    const pid = sorted[i];
    const evts = eventsByProject[pid];
    const scores = projectScores[pid];
    const proj = projectMap[pid];

    if (scores.scopeChanges === 0 && scores.blockers === 0 && scores.deadlineShifts === 0) continue;

    const sortedEvents = [...evts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const chainLinks = [];
    for (const e of sortedEvents) {
      if (['scope_change', 'blocker', 'deadline_shift'].includes(e.eventType)) {
        const source = findSource(e.eventType);

        let label = e.eventType.replace(/_/g, ' ');
        label = label.replace(/\b\w/g, c => c.toUpperCase());

        chainLinks.push({
          eventType: e.eventType,
          label,
          source,
          sourceLabel: SOURCE_LABELS[source]?.label || 'Internal',
          actor: e.actor?.toString() || 'unknown',
          timestamp: e.timestamp,
          reason: e.reason || '',
          reference: e._id?.toString(),
        });
      }
    }

    if (chainLinks.length > 0) {
      chains.push({
        projectId: pid,
        projectName: proj?.name || 'Unknown',
        projectStatus: proj?.status || 'unknown',
        links: chainLinks,
        severity: scores.blockers + scores.deadlineShifts > 5 ? 'high'
          : scores.blockers + scores.deadlineShifts > 2 ? 'medium'
          : 'low',
        evidenceCount: chainLinks.length,
      });
    }
  }

  return chains.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] || 0) - (order[b.severity] || 0);
  });
}

async function generateActions(viabilities, projects, goals, users) {
  const actions = [];

  for (const v of viabilities) {
    if (v.recommendation === 'kill' && (v.score || 0) < 35) {
      const proj = v.projectId || {};
      const savings = v.projectedSavings || 0;
      const reasons = (v.earlySignals || [])
        .filter(s => s.severity === 'high' || s.severity === 'critical')
        .slice(0, 3)
        .map(s => ({
          message: s.message,
          severity: s.severity,
          source: s.source || findSource(s.type),
        }));

      actions.push({
        type: 'kill',
        priority: savings > 50000 ? 'critical' : 'high',
        title: `Kill "${proj.name || 'Unknown'}"`,
        description: `Project scores ${v.score}/100 with ${v.trajectory} trajectory. ${savings > 0 ? `Projected savings: $${savings.toLocaleString()}.` : ''}`,
        impact: savings,
        currency: 'USD',
        projectId: v.projectId?._id?.toString() || v.projectId?.toString(),
        projectName: proj.name || 'Unknown',
        evidence: reasons,
        sourceCount: reasons.length,
      });
    }

    if (v.recommendation === 'adjust' && (v.score || 0) < 55 && (v.score || 0) >= 35) {
      const proj = v.projectId || {};
      const riskFactors = (v.riskFactors || []).slice(0, 3).map(r => ({
        factor: r.factor,
        impact: r.impact,
        description: r.description,
        category: r.category || 'internal',
      }));

      const potentialLoss = Math.round(((100 - (v.score || 50)) / 100) * 50000);

      actions.push({
        type: 'adjust',
        priority: (v.score || 0) < 45 ? 'high' : 'medium',
        title: `Adjust "${proj.name || 'Unknown'}"`,
        description: `Score declining (${v.score}/100). ${riskFactors.length > 0 ? `Key risks: ${riskFactors.map(r => r.factor).join(', ')}.` : ''} Potential loss if unaddressed: ~$${potentialLoss.toLocaleString()}.`,
        impact: potentialLoss,
        currency: 'USD',
        projectId: v.projectId?._id?.toString() || v.projectId?.toString(),
        projectName: proj.name || 'Unknown',
        evidence: riskFactors,
        sourceCount: riskFactors.length,
      });
    }
  }

  for (const g of goals) {
    const kpisOffTrack = (g.kpis || []).filter(k => k.current < k.target * 0.7);
    if (kpisOffTrack.length > 0) {
      actions.push({
        type: 'strategy',
        priority: 'medium',
        title: `Re-align "${g.title}"`,
        description: `${kpisOffTrack.length} KPI(s) below 70% target: ${kpisOffTrack.map(k => `${k.name} (${k.current}/${k.target})`).join(', ')}.`,
        impact: 0,
        currency: 'USD',
        goalId: g._id.toString(),
        goalTitle: g.title,
        evidence: kpisOffTrack.map(k => ({
          factor: k.name,
          impact: Math.round((1 - k.current / Math.max(1, k.target)) * 100),
          description: `${k.name}: ${k.current} / ${k.target} (${Math.round((k.current / Math.max(1, k.target)) * 100)}%)`,
        })),
        sourceCount: kpisOffTrack.length,
      });
    }
  }

  const overloadedUsers = users.filter(u =>
    u.activityScore > 80 && (u.assignedProjects || []).length > 3
  );
  if (overloadedUsers.length > 0) {
    actions.push({
      type: 'resource',
      priority: 'medium',
      title: `${overloadedUsers.length} team member(s) overloaded`,
      description: `${overloadedUsers.map(u => u.name).join(', ')} have high activity scores (>80) across multiple projects. Consider redistributing workload.`,
      impact: overloadedUsers.length * 15000,
      currency: 'USD',
      evidence: overloadedUsers.slice(0, 5).map(u => ({
        name: u.name,
        role: u.role,
        activityScore: u.activityScore,
        projectsCount: u.assignedProjects?.length || 0,
      })),
      sourceCount: overloadedUsers.length,
    });
  }

  actions.sort((a, b) => {
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const pa = pOrder[a.priority] || 3;
    const pb = pOrder[b.priority] || 3;
    if (pa !== pb) return pa - pb;
    return (b.impact || 0) - (a.impact || 0);
  });

  return actions.slice(0, 15);
}

function aggregateRisks(viabilities, events, projects) {
  const riskCounts = {};

  for (const v of viabilities) {
    for (const r of (v.riskFactors || [])) {
      const cat = r.category || 'internal';
      if (!riskCounts[cat]) riskCounts[cat] = { count: 0, totalImpact: 0, items: [] };
      riskCounts[cat].count++;
      riskCounts[cat].totalImpact += (r.impact || 0);
      if (riskCounts[cat].items.length < 5) {
        riskCounts[cat].items.push({
          factor: r.factor,
          impact: r.impact,
          description: r.description,
        });
      }
    }
  }

  const bySource = Object.entries(riskCounts).map(([source, data]) => ({
    source,
    sourceLabel: SOURCE_LABELS[source]?.label || 'Internal',
    count: data.count,
    averageImpact: data.count > 0 ? Math.round(data.totalImpact / data.count) : 0,
    items: data.items,
  }));

  const activeBlockers = events.filter(e => e.eventType === 'blocker');
  const recentDeadlineShifts = events.filter(e =>
    e.eventType === 'deadline_shift' &&
    e.timestamp && (new Date() - new Date(e.timestamp)) < 7 * 86400000
  );

  return {
    bySource,
    totalActiveRisks: viabilities.reduce((s, v) => s + (v.riskFactors || []).length, 0),
    activeBlockersLast7Days: recentDeadlineShifts.length,
    deadlineShiftsLast7Days: recentDeadlineShifts.length,
    projectsAtRisk: projects.filter(p => p.status === 'at_risk' || p.status === 'delayed').length,
    totalBlockers: activeBlockers.length,
  };
}

async function deepSearch(domain, query) {
  if (!query || query.trim().length === 0) {
    return { results: [] };
  }

  const q = query.trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [memories, decisions, projects, viabilities] = await Promise.all([
    CorporateMemory.find({
      domain,
      $or: [
        { title: regex },
        { body: regex },
        { tags: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    DecisionJournal.find({
      domain,
      $or: [
        { decision: regex },
        { rationale: regex },
        { tags: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    Project.find({
      domain,
      $or: [
        { name: regex },
        { description: regex },
      ],
    })
      .select('name status progress phase startDate deadline')
      .limit(10)
      .lean(),

    ProjectViability.find({ domain })
      .populate('projectId', 'name status progress phase')
      .lean(),
  ]);

  const results = [];

  for (const m of memories) {
    results.push({
      type: 'memory',
      id: m._id.toString(),
      title: m.title,
      snippet: m.body ? m.body.slice(0, 200) : '',
      tags: m.tags,
      projectName: m.projectName || '',
      outcome: m.outcome,
      relevance: computeRelevance(q, m.title + ' ' + m.body),
      source: 'Corporate Memory',
      url: `/cerebrum/memory?id=${m._id}`,
    });
  }

  for (const d of decisions) {
    results.push({
      type: 'decision',
      id: d._id.toString(),
      title: d.decision,
      snippet: d.rationale ? d.rationale.slice(0, 200) : '',
      tags: d.tags,
      projectName: '',
      outcome: d.outcome || '',
      relevance: computeRelevance(q, d.decision + ' ' + (d.rationale || '')),
      source: 'Decision Journal',
      url: `/cerebrum/decisions?id=${d._id}`,
    });
  }

  for (const p of projects) {
    const viability = viabilities.find(v =>
      v.projectId?._id?.toString() === p._id.toString()
    );
    results.push({
      type: 'project',
      id: p._id.toString(),
      title: p.name,
      snippet: p.description ? p.description.slice(0, 200) : `${p.status} — ${p.progress}% complete`,
      tags: [p.status, p.phase, p.projectType].filter(Boolean),
      projectName: p.name,
      outcome: '',
      relevance: computeRelevance(q, p.name + ' ' + (p.description || '')),
      source: 'Project',
      url: `/projects/${p._id}`,
      score: viability?.score || null,
    });
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return { results: results.slice(0, 20) };
}

function computeRelevance(query, text) {
  const words = query.toLowerCase().split(/\s+/);
  const lowerText = text.toLowerCase();
  let score = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (lowerText.includes(w)) {
      score += 10;
      const regex = new RegExp(w, 'gi');
      const matches = lowerText.match(regex);
      if (matches) score += matches.length * 2;
    }
  }
  if (lowerText.startsWith(query.toLowerCase())) score += 20;
  if (lowerText.includes(query.toLowerCase())) score += 10;
  return score;
}

module.exports = {
  generateBriefing,
  computeCausalChains,
  computeMTDCost,
  generateActions,
  deepSearch,
};
