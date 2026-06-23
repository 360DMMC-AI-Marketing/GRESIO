const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const clickupService = require('../services/clickupService');

function getApiKey(req) {
  return req.headers['x-clickup-api-key'] || req.body?.apiKey || req.query?.apiKey || '';
}

router.use(auth);
router.use(authorize('admin'));

router.get('/teams', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const teams = await clickupService.getAuthorizedTeams(apiKey);
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/spaces', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const apiKey = getApiKey(req);
    const spaces = await clickupService.getTeamSpaces(teamId, apiKey);
    res.json({ spaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/folders', async (req, res) => {
  try {
    const { spaceId } = req.query;
    if (!spaceId) return res.status(400).json({ error: 'spaceId required' });
    const apiKey = getApiKey(req);
    const folders = await clickupService.getSpaceFolders(spaceId, apiKey);
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists', async (req, res) => {
  try {
    const { folderId, spaceId } = req.query;
    const apiKey = getApiKey(req);
    let lists = [];
    if (folderId) {
      lists = await clickupService.getFolderLists(folderId, apiKey);
    } else if (spaceId) {
      lists = await clickupService.getSpaceLists(spaceId, apiKey);
    } else {
      return res.status(400).json({ error: 'folderId or spaceId required' });
    }
    res.json({ lists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { listId } = req.query;
    if (!listId) return res.status(400).json({ error: 'listId required' });
    const apiKey = getApiKey(req);
    const tasks = await clickupService.getListTasks(listId, { includeClosed: true, subtasks: false }, apiKey);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cleanup', async (req, res) => {
  try {
    const result = await clickupService.cleanupImport();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import-all', async (req, res) => {
  try {
    const { teamId, spaceId } = req.body;
    const apiKey = getApiKey(req);
    const result = await clickupService.importAll(req.user._id, { teamId, spaceId, apiKey });
    res.json(result);
  } catch (err) {
    console.error('Import All error:', err.stack || err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !plan.length) return res.status(400).json({ error: 'plan array required' });
    const apiKey = getApiKey(req);
    const result = await clickupService.executeImportPlan(plan, req.user._id, apiKey);
    res.json(result);
  } catch (err) {
    console.error('Import All error:', err.stack || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
