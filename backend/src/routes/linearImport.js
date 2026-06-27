const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const linearService = require('../services/linearService');

function getApiKey(req) {
  return req.headers['x-linear-api-key'] || req.body?.apiKey || req.query?.apiKey || '';
}

router.use(auth);
router.use(authorize('admin'));

router.get('/teams', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) return res.status(400).json({ error: 'Linear API key is required' });
    const teams = await linearService.getTeams(apiKey);
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

router.get('/projects', async (req, res, next) => {
  try {
    const { teamId, apiKey: queryKey } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const apiKey = getApiKey(req);
    const projects = await linearService.getProjects(teamId, apiKey);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

router.get('/issues', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const apiKey = getApiKey(req);
    const issues = await linearService.getIssuesForProject(projectId, apiKey);
    res.json({ issues });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const apiKey = getApiKey(req);
    const result = await linearService.importTeam(teamId, req.user._id, req.user.domain || req.user.email, apiKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
