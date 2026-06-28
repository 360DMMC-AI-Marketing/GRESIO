const AutopsyEvent = require('../models/AutopsyEvent');
const Project = require('../models/Project');

async function findSimilarProjects(projectId, domain, limit = 5) {
  const currentEvents = await AutopsyEvent.find({ projectId }).sort({ timestamp: 1 }).lean();
  if (currentEvents.length < 3) return [];

  const currentPattern = currentEvents.map(e => e.eventType);
  const currentDuration = currentEvents.length > 1
    ? (new Date(currentEvents[currentEvents.length - 1].timestamp) - new Date(currentEvents[0].timestamp)) / 86400000
    : 1;

  const allProjectIds = await Project.find({
    domain,
    _id: { $ne: projectId },
    isActive: { $in: [true, false] },
  }).select('_id name status progress phase').lean();

  const scored = [];

  for (const p of allProjectIds) {
    const otherEvents = await AutopsyEvent.find({ projectId: p._id }).sort({ timestamp: 1 }).lean();
    if (otherEvents.length < 3) continue;

    const otherPattern = otherEvents.map(e => e.eventType);
    const otherDuration = otherEvents.length > 1
      ? (new Date(otherEvents[otherEvents.length - 1].timestamp) - new Date(otherEvents[0].timestamp)) / 86400000
      : 1;

    // Pattern similarity — compare sequences
    const matches = currentPattern.filter((type, i) => type === otherPattern[i]).length;
    const maxLen = Math.max(currentPattern.length, otherPattern.length);
    const patternScore = maxLen > 0 ? (matches / maxLen) * 100 : 0;

    // Event density similarity
    const densityDiff = Math.abs(currentEvents.length / currentDuration - otherEvents.length / otherDuration);
    const densityScore = Math.max(0, 100 - densityDiff * 10);

    // Weighted score
    const totalScore = patternScore * 0.7 + densityScore * 0.3;

    if (totalScore > 30) {
      scored.push({
        project: { _id: p._id, name: p.name, status: p.status, progress: p.progress, phase: p.phase },
        similarity: Math.round(totalScore),
        patterns: {
          eventCount: otherEvents.length,
          duration: Math.round(otherDuration),
          dominantEvents: getDominantEvents(otherEvents),
        },
        warnings: generateWarnings(otherEvents, otherDuration),
      });
    }
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

function getDominantEvents(events) {
  const counts = {};
  for (const e of events) {
    counts[e.eventType] = (counts[e.eventType] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

function generateWarnings(events, duration) {
  const warnings = [];
  const deadlineShifts = events.filter(e => e.eventType === 'deadline_shift').length;
  const blockers = events.filter(e => e.eventType === 'blocker').length;
  const scopeChanges = events.filter(e => e.eventType === 'scope_change').length;

  if (deadlineShifts >= 3) warnings.push('Multiple deadline shifts — planning instability');
  if (blockers >= 4) warnings.push('High blocker frequency — may indicate process issues');
  if (scopeChanges >= 3) warnings.push('Scope creep detected — common failure pattern');
  if (deadlineShifts + blockers + scopeChanges > events.length * 0.5) warnings.push('Majority of events are risk signals — high failure correlation');

  return warnings;
}

async function getTeamMemory(domain) {
  const allProjects = await Project.find({ domain }).select('_id name status progress phase').lean();
  const allEvents = await AutopsyEvent.find({ domain }).sort({ timestamp: 1 }).lean();

  const projectPatterns = {};
  for (const e of allEvents) {
    const pid = e.projectId?.toString();
    if (!pid) continue;
    if (!projectPatterns[pid]) projectPatterns[pid] = [];
    projectPatterns[pid].push(e);
  }

  const failedProjects = allProjects.filter(p =>
    p.status === 'delayed' || p.progress < 30
  );

  const memory = [];
  for (const p of failedProjects) {
    const events = projectPatterns[p._id.toString()] || [];
    if (events.length < 5) continue;

    const earlySignals = events.slice(0, Math.min(10, events.length));
    const signalTypes = {};
    for (const e of earlySignals) {
      signalTypes[e.eventType] = (signalTypes[e.eventType] || 0) + 1;
    }

    memory.push({
      project: p.name,
      earlySignals: Object.entries(signalTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => ({ type, count })),
      totalEvents: events.length,
      outcome: p.status === 'delayed' ? 'Delayed' : 'Underperforming',
    });
  }

  return memory.slice(0, 10);
}

module.exports = { findSimilarProjects, getTeamMemory };
