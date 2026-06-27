const aiService = require('../services/aiService');
const ProjectChat = require('../models/ProjectChat');
const Project = require('../models/Project');
const { getDomainProjectIds } = require('../config/planLimits');

async function verifyProjectAccess(projectId, req) {
  const projectIds = await getDomainProjectIds(req.user.domain, req.user);
  if (!projectIds.some(pid => pid.toString() === projectId)) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
}

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    await verifyProjectAccess(req.params.projectId, req);

    let chatDoc = await ProjectChat.findOne({ project: req.params.projectId });
    if (!chatDoc) {
      chatDoc = await ProjectChat.create({ project: req.params.projectId, messages: [] });
    }

    const history = chatDoc.messages.map(m => ({ role: m.role, content: m.content }));
    const userMsg = { role: 'user', content: message, timestamp: new Date() };

    const reply = await aiService.chatWithProject(req.params.projectId, [{ role: 'user', content: message }], history);

    if (reply) {
      chatDoc.messages.push(userMsg);
      chatDoc.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
      if (chatDoc.messages.length > 50) {
        chatDoc.messages = chatDoc.messages.slice(-50);
      }
      await chatDoc.save();
    }

    res.json({ reply: reply || 'AI not available. Set OPENAI_API_KEY.', history: chatDoc.messages.slice(-10) });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(err.status || 500).json({ reply: `Error: ${err.message}`, history: [] });
  }
};

exports.history = async (req, res) => {
  try {
    await verifyProjectAccess(req.params.projectId, req);
    const chatDoc = await ProjectChat.findOne({ project: req.params.projectId });
    res.json({ messages: chatDoc?.messages?.slice(-20) || [] });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.chatStream = async (req, res) => {
  try {
    const { message } = req.query;
    if (!message) return res.status(400).json({ error: 'Message query param is required' });

    const { projectId } = req.params;
    if (projectId) await verifyProjectAccess(projectId, req);
    let chatDoc = projectId ? await ProjectChat.findOne({ project: projectId }) : null;
    const history = chatDoc?.messages?.map(m => ({ role: m.role, content: m.content })) || [];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const fullReply = [];
    const stream = aiService.chatStream(
      [
        { role: 'system', content: 'You are GRESIO AI. Answer concisely.' },
        ...history.slice(-20),
        { role: 'user', content: message },
      ],
      { temperature: 0.5 }
    );

    for await (const token of stream) {
      fullReply.push(token);
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    const reply = fullReply.join('');
    if (chatDoc && reply) {
      chatDoc.messages.push({ role: 'user', content: message, timestamp: new Date() });
      chatDoc.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
      if (chatDoc.messages.length > 50) chatDoc.messages = chatDoc.messages.slice(-50);
      await chatDoc.save();
    }

    res.write(`data: ${JSON.stringify({ done: true, reply })}\n\n`);
    res.end();
  } catch (err) {
    console.error('AI stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};

exports.clearHistory = async (req, res) => {
  try {
    await verifyProjectAccess(req.params.projectId, req);
    await ProjectChat.deleteOne({ project: req.params.projectId });
    res.json({ message: 'Chat history cleared.' });
  } catch (err) {
    res.status(err.status || 500).json({ error: `Could not clear history: ${err.message}` });
  }
};

exports.generateReportSummary = async (req, res) => {
  try {
    await verifyProjectAccess(req.params.id, req);
    const summary = await aiService.generateReportSummary(req.params.id);
    res.json({ summary: summary || 'Set OPENAI_API_KEY to generate summaries.' });
  } catch (err) {
    res.status(err.status || 500).json({ error: `Could not generate summary: ${err.message}` });
  }
};

exports.estimateTask = async (req, res) => {
  try {
    const { title, description, projectId } = req.body;
    if (!title || !projectId) return res.status(400).json({ error: 'title and projectId required' });
    await verifyProjectAccess(projectId, req);
    const hours = await aiService.estimateTaskDuration(projectId, title, description);
    res.json({ estimatedHours: hours });
  } catch (err) {
    res.status(err.status || 500).json({ error: `Could not estimate: ${err.message}` });
  }
};

exports.detectRisks = async (req, res) => {
  try {
    await verifyProjectAccess(req.params.projectId, req);
    const risks = await aiService.detectProjectRisks(req.params.projectId);
    res.json({ risks });
  } catch (err) {
    res.status(err.status || 500).json({ error: `Could not detect risks: ${err.message}` });
  }
};

exports.generateTemplate = async (req, res) => {
  try {
    const { companyType, goals } = req.body;
    if (!companyType || !goals) return res.status(400).json({ error: 'companyType and goals required' });
    const template = await aiService.generateProjectTemplate(companyType, goals);
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: `Could not generate template: ${err.message}` });
  }
};
