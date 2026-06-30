const { Router } = require('express');
const router = Router();
const { auth, requireEnterprise } = require('../middleware/auth');
const Project = require('../models/Project');
const ProjectViability = require('../models/ProjectViability');
const StrategyGoal = require('../models/StrategyGoal');
const viabilityService = require('../services/viabilityService');
const briefingService = require('../services/briefingService');
const patternMatcherService = require('../services/patternMatcherService');
const strategyBridgeService = require('../services/strategyBridgeService');
const oracleNotifier = require('../services/oracleNotifier');
const teamInsightService = require('../services/teamInsightService');

router.use(auth);
router.use(requireEnterprise);

router.get('/oracle', async (req, res, next) => {
  try {
    const board = await viabilityService.getOracleBoard(req.user.domain);
    const stats = {
      total: board.length,
      atRisk: board.filter(v => (v.score || 0) < 55).length,
      recommendedKill: board.filter(v => v.recommendation === 'kill').length,
      projectedSavings: board.reduce((sum, v) => sum + (v.projectedSavings || 0), 0),
      averageScore: board.length > 0 ? Math.round(board.reduce((sum, v) => sum + (v.score || 0), 0) / board.length) : 0,
    };
    res.json({ projects: board, stats });
  } catch (err) { next(err); }
});

router.get('/oracle/:projectId', async (req, res, next) => {
  try {
    const viability = await viabilityService.getSingleOracle(req.params.projectId);
    if (!viability) return res.status(404).json({ error: 'Project viability not found' });
    res.json(viability);
  } catch (err) { next(err); }
});

router.get('/briefing', async (req, res, next) => {
  try {
    const briefing = await briefingService.generateBriefing(req.user.domain);
    res.json(briefing);
  } catch (err) { next(err); }
});

router.get('/briefing/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });
    const result = await briefingService.deepSearch(req.user.domain, q);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/kill', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const result = await viabilityService.getKillRecommendation(projectId);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/kill/execute', async (req, res, next) => {
  try {
    const { projectId, reason } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.isActive = false;
    project.settings.isArchived = true;
    project.settings.archivedAt = new Date();
    project.status = 'completed';
    await project.save();

    const savings = await viabilityService.computeProjectedSavings(
      { domain: project.domain, members: project.members },
      project.viability?.score || 50, 0
    );

    try {
      const CorporateMemory = require('../models/CorporateMemory');
      await CorporateMemory.create({
        domain: project.domain, type: 'lesson',
        title: `Kill Analysis: ${project.name}`,
        body: [
          `Project "${project.name}" killed on ${new Date().toISOString().split('T')[0]}.`,
          `Viability score: ${project.viability?.score || 'N/A'}/100.`,
          `Projected savings: $${savings.toLocaleString()}.`,
          reason ? `Reason: ${reason}` : '',
          `Signals: ${(project.viability?.earlySignals || []).map(s => s.message).join(', ')}`,
        ].filter(Boolean).join('\n'),
        tags: [...(project.techStack || []), project.projectType, 'killed', 'postmortem'],
        projectId: project._id, projectName: project.name, outcome: 'failure', createdBy: req.user._id,
      });
    } catch (memErr) { console.error('[Kill] Postmortem error:', memErr.message); }

    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const { getIO } = require('../socket/ioProvider');
      const io = getIO();
      const admins = await User.find({ domain: project.domain, role: 'admin' }).select('_id').lean();
      const recipients = [...new Set([
        ...(project.members || []).map(m => m.toString()),
        ...admins.map(a => a._id.toString()),
      ])];
      const docs = recipients.map(user => ({
        user, domain: project.domain, type: 'project_killed',
        title: `Project Killed: ${project.name}`,
        message: reason ? `${project.name} killed. Reason: ${reason}. Savings: ~$${savings.toLocaleString()}.` : `${project.name} killed. Savings: ~$${savings.toLocaleString()}.`,
        link: '/cerebrum/decisions',
        metadata: { projectId: String(project._id), savings, reason: reason || '' },
      }));
      const created = await Notification.insertMany(docs);
      for (const n of created) { try { if (io) io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} }
    } catch (notifErr) { console.error('[Kill] Notification error:', notifErr.message); }

    res.json({
      success: true, projectId: project._id, projectName: project.name, savings,
      message: `"${project.name}" archived. ~$${savings.toLocaleString()} projected savings.`,
    });
  } catch (err) { next(err); }
});

router.post('/kill/undo', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (project.settings.archivedAt && Date.now() - new Date(project.settings.archivedAt).getTime() > 30000) {
      return res.status(400).json({ error: 'Undo window has expired (30 seconds)' });
    }

    project.isActive = true;
    project.settings.isArchived = false;
    project.settings.restoredAt = new Date();
    project.settings.archivedAt = undefined;
    project.status = 'on_track';
    await project.save();

    res.json({ success: true, projectId: project._id, projectName: project.name, message: `"${project.name}" restored.` });
  } catch (err) { next(err); }
});

router.get('/memory/search', async (req, res, next) => {
  try {
    const { q, type } = req.query;
    const filter = { domain: req.user.domain };
    if (type) filter.type = type;

    if (q) {
      const results = await patternMatcherService.searchCorporateMemory(req.user.domain, q);
      return res.json({ results });
    }

    const results = await patternMatcherService.searchCorporateMemory(req.user.domain, '');
    res.json({ results });
  } catch (err) { next(err); }
});

router.get('/memory/patterns/:projectId', async (req, res, next) => {
  try {
    const patterns = await patternMatcherService.findSimilarPatterns(req.params.projectId, req.user.domain);
    const signature = await patternMatcherService.getFailureSignature(req.params.projectId);
    res.json({ patterns, signature });
  } catch (err) { next(err); }
});

router.post('/memory/ingest', async (req, res, next) => {
  try {
    const { type, title, body, tags, projectId, outcome } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    let projectName = '';
    if (projectId) {
      const project = await Project.findById(projectId).select('name').lean();
      if (project) projectName = project.name;
    }

    const memory = await patternMatcherService.ingestMemory({
      domain: req.user.domain,
      type,
      title,
      body: body || '',
      tags: tags || [],
      projectId: projectId || null,
      projectName,
      createdBy: req.user._id,
      outcome: outcome || '',
    });

    res.json({ memory });
  } catch (err) { next(err); }
});

router.get('/memory/expertise', async (req, res, next) => {
  try {
    const expertise = await patternMatcherService.getExpertiseMap(req.user.domain);
    res.json({ expertise });
  } catch (err) { next(err); }
});

router.get('/team-insights', async (req, res, next) => {
  try {
    const insights = await teamInsightService.getTeamInsights(req.user.domain);
    res.json(insights);
  } catch (err) { next(err); }
});

router.get('/strategy/alignment', async (req, res, next) => {
  try {
    const alignment = await strategyBridgeService.computeAlignment(req.user.domain);
    res.json(alignment);
  } catch (err) { next(err); }
});

router.get('/strategy/rebalance', async (req, res, next) => {
  try {
    const rebalance = await strategyBridgeService.getRecommendedRebalance(req.user.domain);
    res.json({ recommendations: rebalance });
  } catch (err) { next(err); }
});

router.get('/strategy/goals', async (req, res, next) => {
  try {
    const goals = await StrategyGoal.find({ domain: req.user.domain, active: true }).sort({ weight: -1 }).lean();
    res.json({ goals });
  } catch (err) { next(err); }
});

router.post('/strategy/goals', async (req, res, next) => {
  try {
    const { title, description, category, weight, kpis, periodEnd } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const goal = await StrategyGoal.create({
      domain: req.user.domain,
      title,
      description: description || '',
      category: category || '',
      weight: weight || 50,
      kpis: kpis || [],
      periodEnd: periodEnd || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ goal });
  } catch (err) { next(err); }
});

router.post('/predict/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const aiService = require('../services/aiService');
    const reply = await aiService.chatWithProject(projectId, [{ role: 'user', content: message }]);

    res.json({ reply });
  } catch (err) { next(err); }
});

module.exports = router;
