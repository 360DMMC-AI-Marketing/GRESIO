const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const clickupService = require('../services/clickupService');

function getApiKey(req) {
  return req.headers['x-clickup-api-key'] || req.body?.apiKey || req.query?.apiKey || '';
}

router.use(auth);
router.use(authorize('admin'));

router.get('/teams', async (req, res, next) => {
  try {
    const apiKey = getApiKey(req);
    if (!apiKey) return res.status(400).json({ error: 'API key is required' });
    const teams = await clickupService.getAuthorizedTeams(apiKey);
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

router.get('/spaces', async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const apiKey = getApiKey(req);
    const spaces = await clickupService.getTeamSpaces(teamId, apiKey);
    res.json({ spaces });
  } catch (err) {
    next(err);
  }
});

router.get('/folders', async (req, res, next) => {
  try {
    const { spaceId } = req.query;
    if (!spaceId) return res.status(400).json({ error: 'spaceId required' });
    const apiKey = getApiKey(req);
    const folders = await clickupService.getSpaceFolders(spaceId, apiKey);
    res.json({ folders });
  } catch (err) {
    next(err);
  }
});

router.get('/lists', async (req, res, next) => {
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
    next(err);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const { listId } = req.query;
    if (!listId) return res.status(400).json({ error: 'listId required' });
    const apiKey = getApiKey(req);
    const tasks = await clickupService.getListTasks(listId, { includeClosed: true, subtasks: false }, apiKey);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/save-config', async (req, res, next) => {
  try {
    const { apiKey, workspaceIds, workspaces } = req.body;
    const Integration = require('../models/Integration');
    let integration = await Integration.findOne({ name: 'clickup' });
    const config = integration?.config || {};
    const existingTimes = config.workspaceSyncTimes || {};
    const workspaceSyncTimes = {};
    (workspaceIds || []).forEach(id => {
      workspaceSyncTimes[id] = existingTimes[id] || null;
    });
    const update = {
      config: { workspaceIds: workspaceIds || [], workspaceSyncTimes, workspaces: workspaces || [] },
      isConnected: true,
    };
    if (apiKey) update.credentials = { apiKey };
    integration = await Integration.findOneAndUpdate(
      { name: 'clickup' },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json({ message: 'Config saved', workspaceIds: workspaceIds || [] });
  } catch (err) { next(err); }
});

router.get('/config', async (req, res, next) => {
  try {
    const Integration = require('../models/Integration');
    const integration = await Integration.findOne({ name: 'clickup' });
    if (!integration) return res.json({ apiKey: '', workspaceIds: [] });
    const creds = integration.getDecryptedCredentials();
    res.json({
      apiKey: creds?.apiKey ? '\u2022\u2022\u2022\u2022' + creds.apiKey.slice(-4) : '',
      workspaceIds: integration.config?.workspaceIds || [],
      workspaces: integration.config?.workspaces || [],
      workspaceSyncTimes: integration.config?.workspaceSyncTimes || {},
      lastSync: integration.lastSync,
    });
  } catch (err) { next(err); }
});

router.post('/cleanup', async (req, res, next) => {
  try {
    const result = await clickupService.cleanupImport();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/import-all', async (req, res, next) => {
  try {
    const { teamId, spaceId } = req.body;
    const apiKey = getApiKey(req);
    const result = await clickupService.importAll(req.user._id, { teamId, spaceId, apiKey });
    res.json(result);
  } catch (err) {
    console.error('Import All error:', err.stack || err.message);
    next(err);
  }
});

router.post('/sync-workspace', async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
    const Integration = require('../models/Integration');
    const integration = await Integration.findOne({ name: 'clickup' });
    if (!integration) return res.status(400).json({ error: 'ClickUp not configured' });
    const creds = integration.getDecryptedCredentials();
    const apiKey = creds?.apiKey || '';
    if (!apiKey) return res.status(400).json({ error: 'No ClickUp API key' });
    const result = await clickupService.incrementalSync(apiKey, [workspaceId], req.user?.domain || '');
    const now = new Date();
    const config = integration.config || {};
    const workspaceSyncTimes = config.workspaceSyncTimes || {};
    workspaceSyncTimes[workspaceId] = now;
    await Integration.findOneAndUpdate(
      { name: 'clickup' },
      { $set: { 'config.workspaceSyncTimes': workspaceSyncTimes, lastSync: now } }
    );
    res.json({ message: 'Sync complete', result });
  } catch (err) { next(err); }
});

router.post('/import', async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!plan || !plan.length) return res.status(400).json({ error: 'plan array required' });
    const apiKey = getApiKey(req);
    const result = await clickupService.executeImportPlan(plan, req.user._id, apiKey);
    res.json(result);
  } catch (err) {
    console.error('Import All error:', err.stack || err.message);
    next(err);
  }
});

module.exports = router;
