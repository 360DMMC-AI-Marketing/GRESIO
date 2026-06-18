const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');

router.post('/command', auth, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });

    const actionPlan = await aiService.interpretCommand(command);
    if (actionPlan.action === 'unknown') {
      return res.json({ success: false, message: 'Could not understand that command. Try: "Create a project called Website for ACME" or "Add a task Fix login bug to project X"' });
    }

    const result = await aiService.executeAction(actionPlan, req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions', auth, async (req, res) => {
  const suggestions = [
    { command: 'Create a project called Website Redesign for ACME Corp', label: 'Create project' },
    { command: 'Launch the current project', label: 'Launch project' },
    { command: 'Add task: Fix login button alignment', label: 'Add task' },
    { command: 'Generate a weekly report', label: 'Generate report' },
  ];
  res.json({ suggestions });
});

module.exports = router;
