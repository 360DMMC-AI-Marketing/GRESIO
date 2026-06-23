const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const Project = require('../models/Project');

router.post('/command', auth, async (req, res) => {
  try {
    const { command, projectId } = req.body;
    if (!command) return res.json({ success: false, message: 'I need a command to work with. Try "create a project", "show me tasks", or "go to projects".' });

    const actionPlan = await aiService.interpretCommand(command);

    if (actionPlan.action === 'unknown') {
      return res.json({
        success: false,
        message: "I understood your message but couldn't map it to an action. You can ask me to: create/update projects/tasks/sprints, assign people, generate reports, or navigate anywhere. Want me to show you around?",
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
    res.json({ success: false, message: "Ran into an issue processing that. I can still help you navigate, check project status, or generate reports. What would you like to do?" });
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

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, history, page } = req.body;
    if (!message) return res.json({ reply: "Hey! I'm GRESIO AI. You can ask me about your projects, tasks, team, or tell me where to navigate. What do you need?" });

    const conversationHistory = Array.isArray(history) ? history : [];
    const pageContext = page || '';

    const reply = await aiService.chatWithApp(message, req.user._id, req.user.domain, conversationHistory, pageContext);
    res.json({ reply });
  } catch (err) {
    console.error('AI Agent chat error:', err);
    const fallbackMessages = [
      "I'm here! I can check your projects, navigate to any section, or help you manage tasks. What would you like?",
      "Quick heads up — I hit a snag. But I can still help you navigate around or check project status. Try asking me something!",
      "I'm still learning! In the meantime, try asking me to go to the dashboard, show your projects, or check who's overloaded.",
    ];
    res.json({ reply: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)] });
  }
});

module.exports = router;
