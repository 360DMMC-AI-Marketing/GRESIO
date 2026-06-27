const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const jiraService = require('../services/jiraService');

function getCreds(req) {
  return {
    baseUrl: req.headers['x-jira-base-url'] || req.body?.baseUrl || req.query?.baseUrl || '',
    email: req.headers['x-jira-email'] || req.body?.email || req.query?.email || '',
    apiToken: req.headers['x-jira-api-token'] || req.body?.apiToken || req.query?.apiToken || '',
  };
}

router.use(auth);
router.use(authorize('admin'));

router.get('/projects', async (req, res, next) => {
  try {
    const { baseUrl, email, apiToken } = getCreds(req);
    if (!baseUrl || !email || !apiToken) return res.status(400).json({ error: 'baseUrl, email, and apiToken are required' });
    const projects = await jiraService.getProjects(baseUrl, email, apiToken);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { projectKey } = req.query;
    const { baseUrl, email, apiToken } = getCreds(req);
    if (!projectKey) return res.status(400).json({ error: 'projectKey required' });
    const users = await jiraService.getUsers(projectKey, baseUrl, email, apiToken);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { projectKeys } = req.body;
    if (!projectKeys || !projectKeys.length) return res.status(400).json({ error: 'projectKeys array required' });
    const { baseUrl, email, apiToken } = getCreds(req);
    if (!baseUrl || !email || !apiToken) return res.status(400).json({ error: 'baseUrl, email, and apiToken are required' });
    const results = { projects: [], totalTasks: 0, errors: [] };
    for (const projectKey of projectKeys) {
      try {
        const result = await jiraService.importProject(projectKey, req.user._id, req.user.domain || req.user.email, baseUrl, email, apiToken);
        results.projects.push(result);
        results.totalTasks += result.taskCount;
      } catch (e) {
        results.errors.push(`Project ${projectKey}: ${e.message}`);
      }
    }
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
