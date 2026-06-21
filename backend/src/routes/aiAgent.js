const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const Project = require('../models/Project');

router.post('/command', auth, async (req, res) => {
  try {
    const { command, projectId } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });

    const actionPlan = await aiService.interpretCommand(command);

    if (actionPlan.action === 'unknown') {
      return res.json({
        success: false,
        message: 'Could not understand command. Examples: "create project X", "add task Y to project Z", "generate report".',
      });
    }

    // Merge projectId from body if provided (e.g., from voiceActionRouter when on a project page)
    if (projectId && !actionPlan.params.projectId) {
      actionPlan.params.projectId = projectId;
    }

    const result = await aiService.executeAction(actionPlan, req.user._id);
    res.json(result);
  } catch (err) {
    console.error('AI Agent command error:', err);
    res.json({ success: false, message: `Error: ${err.message}` });
  }
});

router.get('/suggestions', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    let dynamicSuggestions = [];

    if (projectId) {
      dynamicSuggestions = await aiService.generateProactiveSuggestions(projectId);
    }

    const baseSuggestions = [
      { command: 'Create a project called Website Redesign for ACME Corp', label: '📋 Create project' },
      { command: 'Launch the current project', label: '🚀 Launch project' },
      { command: 'Add task: Fix login button alignment', label: '📌 Add task' },
      { command: 'Generate a weekly report', label: '📊 Generate report' },
      { command: 'What tasks are overdue?', label: '⚠️ Check overdue' },
      { command: 'Who has the most tasks assigned?', label: '👤 Team workload' },
    ];

    const allSuggestions = [...dynamicSuggestions, ...baseSuggestions];
    res.json({ suggestions: allSuggestions });
  } catch (err) {
    console.error('AI Agent suggestions error:', err);
    res.json({ suggestions: [] });
  }
});

module.exports = router;
