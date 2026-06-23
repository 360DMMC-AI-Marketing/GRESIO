const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const clickupService = require('../services/clickupService');

router.use(auth);
router.use(authorize('admin'));

router.get('/teams', async (req, res) => {
  try {
    const teams = await clickupService.getAuthorizedTeams();
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/spaces', async (req, res) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const spaces = await clickupService.getTeamSpaces(teamId);
    res.json({ spaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/folders', async (req, res) => {
  try {
    const { spaceId } = req.query;
    if (!spaceId) return res.status(400).json({ error: 'spaceId required' });
    const folders = await clickupService.getSpaceFolders(spaceId);
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists', async (req, res) => {
  try {
    const { folderId, spaceId } = req.query;
    let lists = [];
    if (folderId) {
      lists = await clickupService.getFolderLists(folderId);
    } else if (spaceId) {
      lists = await clickupService.getSpaceLists(spaceId);
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
    const tasks = await clickupService.getListTasks(listId, { includeClosed: true, subtasks: false });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { lists } = req.body;
    if (!lists || !lists.length) return res.status(400).json({ error: 'lists array required' });

    const allData = [];
    for (const list of lists) {
      const tasks = await clickupService.getListTasks(list.id, { includeClosed: true, subtasks: false });
      const statuses = [...new Set(tasks.map(t => t.status?.status).filter(Boolean))];
      const tags = [...new Set(tasks.flatMap(t => t.tags || []).map(t => t.name || t))];
      allData.push({
        id: list.id,
        name: list.name,
        folderName: list.folder?.name || '',
        spaceName: list.space?.name || '',
        taskCount: tasks.length,
        statuses,
        tags,
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description?.substring(0, 500),
          status: t.status?.status,
          priority: t.priority?.priority,
          assignees: t.assignees?.map(a => a.username || a.email) || [],
          tags: (t.tags || []).map(tag => tag.name || tag),
          dueDate: t.due_date,
        })),
      });
    }

    const plan = await clickupService.analyzeForImport(allData);
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !plan.length) return res.status(400).json({ error: 'plan array required' });

    const result = await clickupService.executeImportPlan(plan, req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
