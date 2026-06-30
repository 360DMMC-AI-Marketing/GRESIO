const ProjectViability = require('../models/ProjectViability');
const AutopsyEvent = require('../models/AutopsyEvent');
const DecisionJournal = require('../models/DecisionJournal');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

const SCORE_WEIGHTS = {
  patternMatch: 0.40,
  decisionQuality: 0.25,
  velocityAndBlocking: 0.20,
  teamExperience: 0.15,
};

const DAYS_THRESHOLD = 30;
const VITALS_LOOKBACK_DAYS = 7;

const EVENT_SOURCE_MAP = {
  scope_change: 'clickup',
  task_complete: 'clickup',
  task_create: 'clickup',
  deadline_shift: 'jira',
  sprint_start: 'jira',
  sprint_end: 'jira',
  blocker: 'github',
  pr_merge: 'github',
  commit: 'github',
  status_change: 'teams',
  comment: 'teams',
  budget_update: 'stripe',
  payment: 'stripe',
};

const RISK_SOURCE_MAP = {
  'Blocker Frequency': 'github',
  'Scope Instability': 'clickup',
  'Deadline Drift': 'jira',
  'No Decision Logging': 'teams',
  'Task Overdue': 'clickup',
};
const CRITICAL_SIGNALS = {
  scope_drift: { weight: 25, label: 'Scope Drift' },
  blocker_cluster: { weight: 20, label: 'Blocker Cluster' },
  deadline_shift: { weight: 30, label: 'Deadline Shift' },
  decision_quality: { weight: 15, label: 'Decision Quality' },
  velocity_drop: { weight: 20, label: 'Velocity Drop' },
  team_overload: { weight: 15, label: 'Team Overload' },
};

async function computeViability(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) return null;

  const events = await AutopsyEvent.find({ projectId }).sort({ timestamp: -1 }).lean();
  const decisions = await DecisionJournal.find({ project: projectId }).sort({ createdAt: -1 }).lean();
  const tasks = await Task.find({ project: projectId, isActive: true }).lean();
  const sprints = await Sprint.find({ project: projectId }).sort({ startDate: 1 }).lean();

  const patternScore = await computePatternMatchScore(project, events);
  const decisionScore = computeDecisionQualityScore(decisions, events);
  const velocityScore = computeVelocityAndBlockingScore(tasks, sprints, events);
  const teamScore = await computeTeamExperienceScore(project.domain, projectId, tasks);

  const totalScore = Math.round(
    patternScore * SCORE_WEIGHTS.patternMatch +
    decisionScore * SCORE_WEIGHTS.decisionQuality +
    velocityScore * SCORE_WEIGHTS.velocityAndBlocking +
    teamScore * SCORE_WEIGHTS.teamExperience
  );

  const trajectory = computeTrajectory(projectId, totalScore);
  const earlySignals = await detectEarlySignals(projectId, events);
  const riskFactors = computeRiskFactors(events, decisions, tasks);
  const recommendation = getRecommendation(totalScore, earlySignals);

  const patternMatches = await findSimilarProjects(project.domain, events, decisions);

  const projectDays = events.length > 0
    ? Math.floor((Date.now() - new Date(events[events.length - 1].timestamp)) / 86400000)
    : 1;

  const savings = computeProjectedSavings(project, totalScore, projectDays);

  const existing = await ProjectViability.findOne({ projectId });
  const historyEntry = { date: new Date(), score: totalScore, label: recommendation };
  const history = existing?.history || [];
  history.push(historyEntry);

  const payload = {
    projectId,
    domain: project.domain,
    score: totalScore,
    trajectory,
    recommendation,
    patternMatches: patternMatches.slice(0, 5),
    earlySignals: earlySignals.slice(0, 10),
    riskFactors: riskFactors.slice(0, 8),
    history: history.slice(-50),
    projectedSavings: savings,
    lastComputed: new Date(),
  };

  return ProjectViability.findOneAndUpdate(
    { projectId },
    payload,
    { upsert: true, new: true }
  ).populate('projectId', 'name status progress phase budget');
}

async function computePatternMatchScore(project, events) {
  if (events.length < 3) return 50;

  const currentPattern = events.map(e => e.eventType);
  const allProjects = await Project.find({
    domain: project.domain,
    _id: { $ne: project._id },
    isActive: { $in: [true, false] },
  }).select('_id name status progress phase').lean();

  let bestScore = 0;
  for (const p of allProjects) {
    const otherEvents = await AutopsyEvent.find({ projectId: p._id }).sort({ timestamp: 1 }).lean();
    if (otherEvents.length < 5) continue;

    const otherPattern = otherEvents.map(e => e.eventType);
    const matches = currentPattern.filter((type, i) => type === otherPattern[i]).length;
    const maxLen = Math.max(currentPattern.length, otherPattern.length);
    const sim = maxLen > 0 ? (matches / maxLen) * 100 : 0;

    const failed = p.status === 'delayed' || p.progress < 30;
    if (failed && sim > bestScore) bestScore = sim;
    if (!failed && (100 - sim) > bestScore) bestScore = 100 - sim;
  }

  return Math.max(0, Math.min(100, Math.round(bestScore)));
}

function computeDecisionQualityScore(decisions, events) {
  if (decisions.length === 0 && events.length < 5) return 50;

  let score = 70;

  const decisionRatio = decisions.length / Math.max(events.length, 1);
  if (decisionRatio < 0.1) score -= 15;
  if (decisionRatio > 0.5) score += 10;

  const hasRationale = decisions.filter(d => d.rationale && d.rationale.length > 20).length;
  if (hasRationale < decisions.length * 0.3) score -= 10;

  const scopeChanges = events.filter(e => e.eventType === 'scope_change').length;
  if (scopeChanges > 2) score -= scopeChanges * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeVelocityAndBlockingScore(tasks, sprints, events) {
  if (tasks.length === 0 && events.length < 3) return 50;

  let score = 75;

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  if (completionRate > 50) score += 10;
  else if (completionRate < 20) score -= 15;

  const blockers = events.filter(e => e.eventType === 'blocker').length;
  if (blockers > 3) score -= blockers * 5;
  if (blockers > 6) score -= 10;

  const deadlineShifts = events.filter(e => e.eventType === 'deadline_shift').length;
  if (deadlineShifts > 1) score -= deadlineShifts * 8;

  if (sprints.length > 0) {
    const avgTasksPerSprint = tasks.length / sprints.length;
    if (avgTasksPerSprint < 2) score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

async function computeTeamExperienceScore(domain, projectId, tasks) {
  const assigneeIds = [...new Set(tasks.filter(t => t.assignee).map(t => t.assignee.toString()))];
  if (assigneeIds.length === 0) return 50;

  let totalScore = 0;
  for (const userId of assigneeIds) {
    const userProjects = await Project.countDocuments({
      domain,
      _id: { $ne: projectId },
      isActive: true,
    }).lean();

    if (userProjects > 2) totalScore += 20;
    else if (userProjects > 0) totalScore += 10;
    else totalScore += 5;
  }

  return Math.min(100, Math.round(totalScore / assigneeIds.length * 5));
}

function computeTrajectory(projectId, currentScore) {
  return currentScore > 70 ? 'rising' : currentScore > 40 ? 'stable' : currentScore > 20 ? 'falling' : 'crash';
}

async function detectEarlySignals(projectId, events) {
  const signals = [];
  const eventTypes = {};
  for (const e of events) {
    eventTypes[e.eventType] = (eventTypes[e.eventType] || 0) + 1;
    if (!e.daysSinceProjectStart || e.daysSinceProjectStart > DAYS_THRESHOLD) continue;

    const source = EVENT_SOURCE_MAP[e.eventType] || 'internal';

    if (e.eventType === 'scope_change' && eventTypes[e.eventType] >= 2) {
      signals.push({ type: 'scope_drift', severity: 'medium', day: e.daysSinceProjectStart, message: 'Multiple scope changes detected early', resolved: false, source, reference: e._id?.toString() });
    }
    if (e.eventType === 'blocker' && eventTypes[e.eventType] >= 3) {
      signals.push({ type: 'blocker_cluster', severity: 'high', day: e.daysSinceProjectStart, message: 'Blocker cluster forming', resolved: false, source, reference: e._id?.toString() });
    }
    if (e.eventType === 'deadline_shift' && eventTypes[e.eventType] >= 2) {
      signals.push({ type: 'deadline_shift', severity: 'high', day: e.daysSinceProjectStart, message: 'Deadline shifted multiple times', resolved: false, source, reference: e._id?.toString() });
    }
  }

  return signals;
}

function computeRiskFactors(events, decisions, tasks) {
  const factors = [];

  const blockers = events.filter(e => e.eventType === 'blocker').length;
  if (blockers > 2) factors.push({ factor: 'Blocker Frequency', impact: Math.min(100, blockers * 15), description: `${blockers} blockers logged`, category: RISK_SOURCE_MAP['Blocker Frequency'] || 'internal' });

  const scopeChanges = events.filter(e => e.eventType === 'scope_change').length;
  if (scopeChanges > 1) factors.push({ factor: 'Scope Instability', impact: Math.min(100, scopeChanges * 20), description: `Scope changed ${scopeChanges} times`, category: RISK_SOURCE_MAP['Scope Instability'] || 'internal' });

  const deadlineShifts = events.filter(e => e.eventType === 'deadline_shift').length;
  if (deadlineShifts > 0) factors.push({ factor: 'Deadline Drift', impact: Math.min(100, deadlineShifts * 25), description: `Deadline shifted ${deadlineShifts} times`, category: RISK_SOURCE_MAP['Deadline Drift'] || 'internal' });

  if (decisions.length === 0 && events.length > 5) {
    factors.push({ factor: 'No Decision Logging', impact: 30, description: 'Key decisions are not being recorded', category: RISK_SOURCE_MAP['No Decision Logging'] || 'internal' });
  }

  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  if (overdueTasks > 2) factors.push({ factor: 'Task Overdue', impact: Math.min(100, overdueTasks * 10), description: `${overdueTasks} tasks past due`, category: RISK_SOURCE_MAP['Task Overdue'] || 'internal' });

  return factors;
}

function getRecommendation(score, signals) {
  if (score > 70 && signals.filter(s => s.severity === 'high' || s.severity === 'critical').length === 0) return 'go';
  if (score < 30 || signals.filter(s => s.severity === 'critical').length > 0) return 'kill';
  return 'adjust';
}

async function findSimilarProjects(domain, currentEvents, currentDecisions) {
  if (currentEvents.length < 3) return [];

  const currentPattern = currentEvents.map(e => e.eventType);
  const allProjects = await Project.find({
    domain,
    _id: { $ne: currentEvents[0]?.projectId },
    isActive: { $in: [true, false] },
  }).select('_id name status progress phase').lean();

  const scored = [];
  for (const p of allProjects) {
    const otherEvents = await AutopsyEvent.find({ projectId: p._id }).sort({ timestamp: 1 }).lean();
    if (otherEvents.length < 3) continue;

    const otherPattern = otherEvents.map(e => e.eventType);
    const matches = currentPattern.filter((type, i) => type === otherPattern[i]).length;
    const maxLen = Math.max(currentPattern.length, otherPattern.length);
    const similarity = maxLen > 0 ? Math.round((matches / maxLen) * 100) : 0;

    if (similarity > 30) {
      const deadlineShifts = otherEvents.filter(e => e.eventType === 'deadline_shift').length;
      const blockers = otherEvents.filter(e => e.eventType === 'blocker').length;
      const warnings = [];
      if (deadlineShifts >= 3) warnings.push('Multiple deadline shifts');
      if (blockers >= 4) warnings.push('High blocker frequency');
      if (otherEvents.filter(e => e.eventType === 'scope_change').length >= 3) warnings.push('Scope creep detected');

      scored.push({
        projectId: p._id,
        name: p.name,
        similarity,
        outcome: p.status === 'delayed' || p.progress < 30 ? 'Failed' : p.progress > 70 ? 'Success' : 'Mixed',
        warnings,
      });
    }
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

async function computeVitals(projectId) {
  const cutoff = new Date(Date.now() - VITALS_LOOKBACK_DAYS * 86400000);
  const events = await AutopsyEvent.find({
    projectId,
    timestamp: { $gte: cutoff },
  }).sort({ timestamp: -1 }).lean();

  const completedTasks = events.filter(e => e.eventType === 'task_complete').length;
  const blockers = events.filter(e => e.eventType === 'blocker').length;
  const deadlineShifts = events.filter(e => e.eventType === 'deadline_shift').length;
  const scopeChanges = events.filter(e => e.eventType === 'scope_change').length;
  const statusChanges = events.filter(e => e.eventType === 'status_change').length;

  const pulse = completedTasks > 0 ? Math.min(100, Math.round((completedTasks / 7) * 20)) : 0;
  const temp = blockers > 3 ? Math.max(0, 100 - blockers * 15) : 100;
  const oxygen = deadlineShifts > 2 ? Math.max(0, 100 - deadlineShifts * 20) : 100;

  return {
    pulse: { value: pulse, label: pulse > 60 ? 'Stable' : pulse > 30 ? 'Low' : 'Critical', score: pulse },
    temperature: { value: temp, label: temp > 70 ? 'Normal' : temp > 40 ? 'Warm' : 'Hot', score: temp },
    oxygen: { value: oxygen, label: oxygen > 70 ? 'Good' : oxygen > 40 ? 'Low' : 'Critical', score: oxygen },
    summary: { completedTasks, blockers, deadlineShifts, scopeChanges, statusChanges, totalEvents: events.length },
  };
}

function computeProjectedSavings(project, score, daysElapsed) {
  if (score > 60) return 0;
  const avgProjectCostPerDay = 5000;
  const remainingDays = Math.max(0, 180 - daysElapsed);
  const failureProbability = (100 - score) / 100;
  return Math.round(remainingDays * avgProjectCostPerDay * failureProbability * 0.7);
}

async function getOracleBoard(domain) {
  const viabilities = await ProjectViability.find({ domain })
    .populate('projectId', 'name status progress phase budget')
    .sort({ score: 1 })
    .lean();

  const activeProjects = await Project.find({ domain, isActive: true })
    .select('_id name')
    .lean();

  const missingIds = activeProjects.filter(p => !viabilities.find(v => v.projectId?._id?.toString() === p._id.toString()));

  for (const p of missingIds) {
    const v = await computeViability(p._id);
    if (v) viabilities.push(v.toObject());
  }

  return viabilities.sort((a, b) => a.score - b.score);
}

async function getSingleOracle(projectId) {
  let viability = await ProjectViability.findOne({ projectId })
    .populate('projectId', 'name status progress phase budget')
    .lean();

  if (!viability) {
    viability = await computeViability(projectId);
    if (!viability) return null;
    viability = viability.toObject();
  }

  const vitals = await computeVitals(projectId);

  return { ...viability, vitals };
}

async function getKillRecommendation(projectId) {
  const viability = await getSingleOracle(projectId);
  if (!viability) return { recommendation: 'unknown', reason: 'Insufficient data' };

  const project = await Project.findById(projectId).select('name status progress budget').lean();

  const killReasons = [];
  let savings = 0;

  if (viability.score < 30) {
    killReasons.push(`Viability score is ${viability.score}/100 — critically low`);
  }
  if (viability.trajectory === 'crash') {
    killReasons.push('Project trajectory is in crash mode');
  }
  if ((viability.earlySignals || []).filter(s => s.severity === 'critical' || s.severity === 'high').length > 2) {
    killReasons.push(`${(viability.earlySignals || []).filter(s => s.severity === 'high' || s.severity === 'critical').length} critical early warnings active`);
  }
  const badPatternMatches = (viability.patternMatches || []).filter(m => m.outcome === 'Failed' && m.similarity > 70);
  if (badPatternMatches.length > 0) {
    killReasons.push(`Project matches ${badPatternMatches.length} failed projects with >70% similarity`);
  }

  if (viability.recommendation === 'kill') {
    savings = viability.projectedSavings || computeProjectedSavings(project, viability.score, 0);
    killReasons.push(`Projected savings: ~$${savings.toLocaleString()} if killed now`);
  }

  const shouldKill = viability.recommendation === 'kill' && killReasons.length >= 2;

  return {
    projectId,
    projectName: project?.name || 'Unknown',
    currentScore: viability.score,
    recommendation: shouldKill ? 'kill' : viability.recommendation,
    confidence: shouldKill ? 'high' : 'medium',
    reasons: killReasons.slice(0, 5),
    projectedSavings: savings,
    trajectory: viability.trajectory,
  };
}

module.exports = {
  computeViability,
  computeVitals,
  getOracleBoard,
  getSingleOracle,
  getKillRecommendation,
  computeProjectedSavings,
};
