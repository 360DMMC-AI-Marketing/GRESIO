const AutopsyEvent = require('../models/AutopsyEvent');
const Project = require('../models/Project');
const patternMatcherService = require('./patternMatcherService');

async function findSimilarProjects(projectId, domain, limit = 5) {
  const results = await patternMatcherService.findSimilarPatterns(projectId, domain);
  const enriched = await Promise.all(results.map(async (r) => {
    const otherEvents = await AutopsyEvent.find({ projectId: r.projectId }).sort({ timestamp: 1 }).lean();
    const otherDuration = otherEvents.length > 1
      ? (new Date(otherEvents[otherEvents.length - 1].timestamp) - new Date(otherEvents[0].timestamp)) / 86400000
      : 1;

    return {
      project: {
        _id: r.projectId,
        name: r.name,
        status: r.status,
        progress: null,
        phase: null,
      },
      similarity: r.similarity,
      patterns: {
        eventCount: r.totalEvents || otherEvents.length,
        duration: Math.round(otherDuration),
        dominantEvents: getDominantEvents(otherEvents),
      },
      warnings: r.warnings || [],
    };
  }));

  return enriched.slice(0, limit);
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
