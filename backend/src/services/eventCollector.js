const AutopsyEvent = require('../models/AutopsyEvent');
const Project = require('../models/Project');

async function collect({ projectId, domain, eventType, actor, before, after, reason }) {
  if (!projectId || !eventType) return;

  try {
    let daysSinceProjectStart = 0;
    if (projectId) {
      const project = await Project.findById(projectId).select('createdAt').lean();
      if (project?.createdAt) {
        daysSinceProjectStart = Math.floor((Date.now() - new Date(project.createdAt)) / 86400000);
      }
    }

    await AutopsyEvent.create({
      projectId,
      domain,
      timestamp: new Date(),
      eventType,
      actor,
      before: before || undefined,
      after: after || undefined,
      reason: reason || '',
      daysSinceProjectStart,
    });
  } catch (err) {
    console.error('[EventCollector] Failed to collect event:', err.message);
  }
}

async function getProjectEvents(projectId, limit = 500) {
  return AutopsyEvent.find({ projectId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('actor', 'name email avatar')
    .lean();
}

async function getProjectTimeline(projectId) {
  return AutopsyEvent.find({ projectId })
    .sort({ timestamp: 1 })
    .populate('actor', 'name email avatar')
    .lean();
}

async function getEventsByDomain(domain, eventTypes, limit = 200) {
  const filter = { domain };
  if (eventTypes?.length) filter.eventType = { $in: eventTypes };
  return AutopsyEvent.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('actor', 'name email avatar')
    .populate('projectId', 'name')
    .lean();
}

module.exports = { collect, getProjectEvents, getProjectTimeline, getEventsByDomain };
