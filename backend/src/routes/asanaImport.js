const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const asanaService = require('../services/asanaService');

function getToken(req) {
  return req.headers['x-asana-token'] || req.body?.accessToken || req.query?.accessToken || '';
}

router.use(auth);
router.use(authorize('admin'));

router.get('/workspaces', async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(400).json({ error: 'Asana access token is required' });
    const workspaces = await asanaService.getWorkspaces(token);
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

router.get('/projects', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
    const token = getToken(req);
    const projects = await asanaService.getProjects(workspaceId, token);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

router.get('/sections', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const token = getToken(req);
    const sections = await asanaService.getSections(projectId, token);
    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const token = getToken(req);
    const tasks = await asanaService.getTasksForProject(projectId, token);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { projectIds } = req.body;
    if (!projectIds || !projectIds.length) return res.status(400).json({ error: 'projectIds array required' });
    const token = getToken(req);
    const results = { projects: [], totalTasks: 0, errors: [] };
    for (const projectId of projectIds) {
      try {
        const result = await asanaService.importProject(projectId, req.user._id, req.user.domain || req.user.email, token);
        results.projects.push(result);
        results.totalTasks += result.taskCount;
      } catch (e) {
        results.errors.push(`Project ${projectId}: ${e.message}`);
      }
    }
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
