const { Router } = require('express');
const router = Router();
const { auth } = require('../middleware/auth');
const Company = require('../models/Company');
const Project = require('../models/Project');
const ProjectViability = require('../models/ProjectViability');
const StrategyGoal = require('../models/StrategyGoal');
const viabilityService = require('../services/viabilityService');
const patternMatcherService = require('../services/patternMatcherService');
const strategyBridgeService = require('../services/strategyBridgeService');
const oracleNotifier = require('../services/oracleNotifier');

router.use(auth);

router.use(async (req, res, next) => {
  try {
    const company = await Company.findOne({ domain: req.user.domain });
    if (!company || company.plan !== 'enterprise') {
      return res.status(403).json({ error: 'Cerebrum requires the Enterprise plan' });
    }
    next();
  } catch (err) { next(err); }
});

router.get('/oracle', async (req, res, next) => {
  try {
    const board = await viabilityService.getOracleBoard(req.user.domain);
    const stats = {
      total: board.length,
      atRisk: board.filter(v => v.score < 55).length,
      recommendedKill: board.filter(v => v.recommendation === 'kill').length,
      projectedSavings: board.reduce((sum, v) => sum + (v.projectedSavings || 0), 0),
      averageScore: board.length > 0 ? Math.round(board.reduce((sum, v) => sum + v.score, 0) / board.length) : 0,
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

router.post('/kill', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const result = await viabilityService.getKillRecommendation(projectId);
    res.json(result);
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

    const project = await Project.findById(projectId).select('name').lean();
    const viability = await viabilityService.getSingleOracle(projectId);
    const patterns = await patternMatcherService.findSimilarPatterns(projectId, req.user.domain);

    const aiService = require('../services/aiService');
    const context = `Project: ${project?.name || 'Unknown'}\nViability Score: ${viability?.score || 'N/A'}/100\nRecommendation: ${viability?.recommendation || 'unknown'}\nPatterns Found: ${patterns.length} similar projects\n\nUser Question: ${message}`;

    const reply = await aiService.chat('You are Cerebrum, the corporate project intelligence system. Answer concisely based on the context provided.', [{ role: 'user', content: context }]);

    res.json({ reply, context: `Project viability: ${viability?.score || 'N/A'}/100 | ${patterns.length} similar patterns found` });
  } catch (err) { next(err); }
});

module.exports = router;
