const CorporateMemory = require('../models/CorporateMemory');
const AutopsyEvent = require('../models/AutopsyEvent');
const DecisionJournal = require('../models/DecisionJournal');
const Project = require('../models/Project');
const User = require('../models/User');

async function findSimilarPatterns(projectId, domain) {
  const currentEvents = await AutopsyEvent.find({ projectId }).sort({ timestamp: 1 }).lean();
  if (currentEvents.length < 3) return [];

  const currentPattern = currentEvents.map(e => e.eventType);
  const currentDecisions = await DecisionJournal.find({ project: projectId }).lean();
  const currentTags = [...new Set(currentDecisions.flatMap(d => d.tags || []))];

  const allProjects = await Project.find({
    domain,
    _id: { $ne: projectId },
    isActive: { $in: [true, false] },
  }).select('_id name status progress phase').lean();

  const results = [];

  for (const p of allProjects) {
    const otherEvents = await AutopsyEvent.find({ projectId: p._id }).sort({ timestamp: 1 }).lean();
    if (otherEvents.length < 3) continue;

    const otherPattern = otherEvents.map(e => e.eventType);
    const matches = currentPattern.filter((type, i) => type === otherPattern[i]).length;
    const maxLen = Math.max(currentPattern.length, otherPattern.length);
    const patternScore = maxLen > 0 ? Math.round((matches / maxLen) * 100) : 0;

    const otherDecisions = await DecisionJournal.find({ project: p._id }).lean();
    const otherTags = [...new Set(otherDecisions.flatMap(d => d.tags || []))];
    const sharedTags = currentTags.filter(t => otherTags.includes(t));
    const tagScore = currentTags.length > 0 ? Math.round((sharedTags.length / currentTags.length) * 100) : 0;

    const totalSimilarity = Math.round(patternScore * 0.6 + tagScore * 0.4);

    if (totalSimilarity > 25) {
      const deadlineShifts = otherEvents.filter(e => e.eventType === 'deadline_shift').length;
      const blockers = otherEvents.filter(e => e.eventType === 'blocker').length;
      const scopeChanges = otherEvents.filter(e => e.eventType === 'scope_change').length;

      const warnings = [];
      if (deadlineShifts >= 3) warnings.push('Multiple deadline shifts — planning instability');
      if (blockers >= 4) warnings.push('High blocker frequency — process may be broken');
      if (scopeChanges >= 3) warnings.push('Scope creep detected — common failure indicator');

      results.push({
        projectId: p._id,
        name: p.name,
        similarity: totalSimilarity,
        status: p.status,
        outcome: p.status === 'delayed' || p.progress < 30 ? 'Failed' : p.progress > 70 ? 'Success' : 'Mixed',
        sharedPatterns: sharedTags.slice(0, 5),
        warnings: warnings.slice(0, 3),
        totalEvents: otherEvents.length,
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

async function getFailureSignature(projectId) {
  const events = await AutopsyEvent.find({ projectId }).sort({ timestamp: 1 }).lean();
  if (events.length < 5) return null;

  const eventSequence = events.map(e => ({
    day: e.daysSinceProjectStart || Math.floor((new Date(e.timestamp) - new Date(events[0].timestamp)) / 86400000),
    type: e.eventType,
    reason: e.reason,
    actor: e.actor,
  }));

  const criticalMoments = eventSequence.filter(e =>
    e.type === 'deadline_shift' || e.type === 'scope_change' || e.type === 'blocker'
  );

  const pattern = {
    totalEvents: events.length,
    duration: eventSequence.length > 0 ? eventSequence[eventSequence.length - 1].day : 0,
    criticalCount: criticalMoments.length,
    earlySignals: eventSequence.filter(e => e.day <= 30 && (e.type === 'deadline_shift' || e.type === 'scope_change' || e.type === 'blocker')),
    eventBreakdown: {},
    sequence: eventSequence.map(e => e.type),
  };

  for (const e of events) {
    pattern.eventBreakdown[e.eventType] = (pattern.eventBreakdown[e.eventType] || 0) + 1;
  }

  return pattern;
}

async function searchCorporateMemory(domain, query, limit = 20) {
  if (!query || query.trim().length === 0) {
    return CorporateMemory.find({ domain })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name')
      .lean();
  }

  const textResults = await CorporateMemory.find(
    { domain, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } }).limit(limit).populate('createdBy', 'name').lean();

  if (textResults.length > 0) return textResults;

  const regexResults = await CorporateMemory.find({
    domain,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { body: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
    ],
  }).sort({ createdAt: -1 }).limit(limit).populate('createdBy', 'name').lean();

  return regexResults;
}

async function getExpertiseMap(domain) {
  const allDecisions = await DecisionJournal.find({ domain }).populate('createdBy', 'name email').lean();
  const allEvents = await AutopsyEvent.find({ domain }).populate('actor', 'name email').lean();

  const expertise = {};

  for (const d of allDecisions) {
    if (!d.createdBy) continue;
    const id = d.createdBy._id.toString();
    if (!expertise[id]) {
      expertise[id] = {
        user: { _id: d.createdBy._id, name: d.createdBy.name, email: d.createdBy.email },
        tags: {},
        decisions: 0,
        projects: new Set(),
      };
    }
    for (const tag of d.tags || []) {
      expertise[id].tags[tag] = (expertise[id].tags[tag] || 0) + 1;
    }
    expertise[id].decisions++;
    if (d.project) expertise[id].projects.add(d.project.toString());
  }

  for (const e of allEvents) {
    if (!e.actor) continue;
    const id = e.actor._id.toString();
    if (!expertise[id]) {
      expertise[id] = {
        user: { _id: e.actor._id, name: e.actor.name, email: e.actor.email },
        tags: {},
        decisions: 0,
        projects: new Set(),
      };
    }
    if (e.projectId) expertise[id].projects.add(e.projectId.toString());
  }

  return Object.values(expertise)
    .map(e => ({
      ...e,
      projects: e.projects.size,
      topTags: Object.entries(e.tags).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count })),
    }))
    .sort((a, b) => b.decisions - a.decisions);
}

async function ingestMemory({ domain, type, title, body, tags, projectId, projectName, createdBy, outcome }) {
  return CorporateMemory.create({
    domain,
    type,
    title,
    body,
    tags: tags || [],
    projectId: projectId || null,
    projectName: projectName || '',
    createdBy: createdBy || null,
    outcome: outcome || '',
    lastAccessed: new Date(),
  });
}

async function autoIngestFromDecision(decision, project) {
  if (!decision || !decision.decision) return;

  const tags = decision.tags || [];
  const outcome = await getDecisionOutcome(decision);

  return ingestMemory({
    domain: decision.domain,
    type: 'decision',
    title: decision.decision,
    body: `Rationale: ${decision.rationale || 'None'}\nAlternatives: ${decision.alternatives || 'None'}\nOutcome: ${decision.outcome || 'Pending'}`,
    tags,
    projectId: decision.project,
    projectName: project?.name || '',
    createdBy: decision.createdBy,
    outcome,
  });
}

async function getDecisionOutcome(decision) {
  if (decision.outcome && decision.outcome.toLowerCase().includes('success')) return 'success';
  if (decision.outcome && decision.outcome.toLowerCase().includes('fail')) return 'failure';
  return 'neutral';
}

module.exports = {
  findSimilarPatterns,
  getFailureSignature,
  searchCorporateMemory,
  getExpertiseMap,
  ingestMemory,
  autoIngestFromDecision,
};
