const { Router } = require('express');
const router = Router();
const { auth, authorize } = require('../middleware/auth');
const AutopsyEvent = require('../models/AutopsyEvent');
const Company = require('../models/Company');
const eventCollector = require('../services/eventCollector');
const teamMemoryService = require('../services/teamMemoryService');

router.use(auth);

router.use(async (req, res, next) => {
  try {
    const company = await Company.findOne({ domain: req.user.domain });
    if (!company || company.plan !== 'enterprise') {
      return res.status(403).json({ error: 'Cerebrum features require the Enterprise plan' });
    }
    next();
  } catch (err) { next(err); }
});

router.get('/events/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const events = await eventCollector.getProjectTimeline(projectId);
    res.json({ events });
  } catch (err) { next(err); }
});

router.post('/events', async (req, res, next) => {
  try {
    const { projectId, eventType, before, after, reason } = req.body;
    if (!projectId || !eventType) return res.status(400).json({ error: 'projectId and eventType required' });
    await eventCollector.collect({
      projectId,
      domain: req.user.domain,
      eventType,
      actor: req.user._id,
      before,
      after,
      reason,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/vitals/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 86400000);

    const events = await AutopsyEvent.find({
      projectId,
      timestamp: { $gte: sevenDaysAgo },
    }).sort({ timestamp: -1 }).lean();

    const completedTasks = events.filter(e => e.eventType === 'task_complete').length;
    const blockers = events.filter(e => e.eventType === 'blocker').length;
    const deadlineShifts = events.filter(e => e.eventType === 'deadline_shift').length;
    const statusChanges = events.filter(e => e.eventType === 'status_change').length;

    const pulse = completedTasks > 0 ? Math.min(100, Math.round((completedTasks / 7) * 20)) : 0;
    const temp = blockers > 3 ? Math.max(0, 100 - blockers * 15) : 100;
    const oxygen = deadlineShifts > 2 ? Math.max(0, 100 - deadlineShifts * 20) : 100;

    res.json({
      vitals: {
        pulse: { value: pulse, label: pulse > 60 ? 'Stable' : pulse > 30 ? 'Low' : 'Critical', score: pulse },
        temperature: { value: temp, label: temp > 70 ? 'Normal' : temp > 40 ? 'Warm' : 'Hot', score: temp },
        oxygen: { value: oxygen, label: oxygen > 70 ? 'Good' : oxygen > 40 ? 'Low' : 'Critical', score: oxygen },
      },
      events: events.slice(0, 20),
      summary: {
        completedTasks,
        blockers,
        deadlineShifts,
        statusChanges,
        totalEvents: events.length,
      },
    });
  } catch (err) { next(err); }
});

router.get('/predict/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const allEvents = await AutopsyEvent.find({ projectId })
      .sort({ timestamp: 1 }).lean();

    const deadlineShiftEvents = allEvents.filter(e => e.eventType === 'deadline_shift');
    const blockerEvents = allEvents.filter(e => e.eventType === 'blocker');
    const scopeChanges = allEvents.filter(e => e.eventType === 'scope_change');

    const projectDays = allEvents.length > 0
      ? Math.floor((Date.now() - new Date(allEvents[0].timestamp)) / 86400000)
      : 1;

    const riskScore = Math.min(100,
      (deadlineShiftEvents.length * 15) +
      (blockerEvents.length * 10) +
      (scopeChanges.length * 20) +
      (projectDays > 30 ? 10 : 0)
    );

    const patterns = [];

    if (blockerEvents.length >= 3) {
      patterns.push({
        type: 'frequent_blockers',
        severity: blockerEvents.length >= 5 ? 'high' : 'medium',
        message: `${blockerEvents.length} blockers detected — project may be at risk of delays`,
      });
    }

    if (deadlineShiftEvents.length >= 2) {
      patterns.push({
        type: 'deadline_drift',
        severity: deadlineShiftEvents.length >= 4 ? 'high' : 'medium',
        message: `Deadline shifted ${deadlineShiftEvents.length} times — scope may be unstable`,
      });
    }

    if (scopeChanges.length >= 2) {
      patterns.push({
        type: 'scope_creep',
        severity: 'high',
        message: `Scope changed ${scopeChanges.length} times — this is a common failure pattern`,
      });
    }

    res.json({
      riskScore,
      riskLabel: riskScore > 70 ? 'High' : riskScore > 40 ? 'Medium' : 'Low',
      projectDays,
      patterns,
      recommendation: riskScore > 50
        ? 'Consider reviewing scope and addressing blockers before they compound'
        : 'Project appears on track. Continue monitoring key metrics.',
    });
  } catch (err) { next(err); }
});

router.get('/autopsy/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const allEvents = await AutopsyEvent.find({ projectId })
      .sort({ timestamp: 1 })
      .populate('actor', 'name email')
      .lean();

    if (allEvents.length === 0) {
      return res.json({ autopsy: null, message: 'Not enough data for autopsy' });
    }

    const deadlineShifts = allEvents.filter(e => e.eventType === 'deadline_shift');
    const blockers = allEvents.filter(e => e.eventType === 'blocker');
    const scopeChanges = allEvents.filter(e => e.eventType === 'scope_change');
    const decisions = allEvents.filter(e => e.eventType === 'decision');

    const rootCauses = [];
    if (scopeChanges.length >= 2) {
      rootCauses.push({
        rank: rootCauses.length + 1,
        cause: 'Scope Creep',
        detail: `Scope changed ${scopeChanges.length} times without corresponding deadline adjustment`,
        events: scopeChanges.slice(0, 3).map(e => ({ date: e.timestamp, actor: e.actor?.name })),
      });
    }
    if (blockers.length >= 3) {
      rootCauses.push({
        rank: rootCauses.length + 1,
        cause: 'Unresolved Blockers',
        detail: `${blockers.length} blockers were logged — ${blockers.filter(b => !b.after).length} may still be open`,
        events: blockers.slice(0, 3).map(e => ({ date: e.timestamp, actor: e.actor?.name })),
      });
    }
    if (deadlineShifts.length >= 2) {
      rootCauses.push({
        rank: rootCauses.length + 1,
        cause: 'Deadline Drift',
        detail: `Deadline was adjusted ${deadlineShifts.length} times, indicating unstable planning`,
        events: deadlineShifts.slice(0, 3).map(e => ({ date: e.timestamp, actor: e.actor?.name })),
      });
    }
    if (decisions.length === 0) {
      rootCauses.push({
        rank: rootCauses.length + 1,
        cause: 'No Decision Logging',
        detail: 'No decisions were recorded — key context may be lost',
        events: [],
      });
    }

    const firstEvent = allEvents[0];
    const lastEvent = allEvents[allEvents.length - 1];
    const projectDuration = Math.floor(
      (new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp)) / 86400000
    );

    res.json({
      autopsy: {
        totalEvents: allEvents.length,
        projectDurationDays: projectDuration || 1,
        rootCauses: rootCauses.slice(0, 5),
        timeline: allEvents.slice(-50).map(e => ({
          date: e.timestamp,
          type: e.eventType,
          actor: e.actor?.name || 'System',
          reason: e.reason || '',
        })),
        healthScore: Math.max(0, 100 - (rootCauses.reduce((s, r) => s + (5 - r.rank) * 5, 0))),
      },
    });
  } catch (err) { next(err); }
});

router.get('/similar/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const similar = await teamMemoryService.findSimilarProjects(projectId, req.user.domain);
    res.json({ similar });
  } catch (err) { next(err); }
});

router.get('/team-memory', async (req, res, next) => {
  try {
    const memory = await teamMemoryService.getTeamMemory(req.user.domain);
    res.json({ memory });
  } catch (err) { next(err); }
});

router.post('/chat', async (req, res, next) => {
  try {
    const { projectId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const aiService = require('../services/aiService');
    const reply = await aiService.chatWithProject(projectId, [{ role: 'user', content: message }]);

    const totalEvents = await AutopsyEvent.countDocuments({ projectId });
    res.json({ reply, context: `Based on ${totalEvents} recorded events.` });
  } catch (err) { next(err); }
});

module.exports = router;
