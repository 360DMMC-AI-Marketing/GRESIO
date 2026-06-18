const OpenAI = require('openai');
const env = require('../config/env');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Bug = require('../models/Bug');
const DecisionJournal = require('../models/DecisionJournal');
const AiAnalysis = require('../models/AiAnalysis');

let _openai = null;

function getClient() {
  if (!env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

async function chat(messages, options = {}) {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2000,
    response_format: options.responseFormat ? { type: 'json_object' } : undefined,
  });
  return data.choices[0].message.content;
}

async function generateReportSummary(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error('Project not found');
  const tasks = await Task.find({ project: projectId }).lean();
  const sprints = await Sprint.find({ project: projectId }).lean();
  const bugs = await Bug.find({ project: projectId }).lean();
  const decisions = await DecisionJournal.find({ project: projectId }).lean();

  const done = tasks.filter(t => t.status === 'done').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  const openBugs = bugs.filter(b => b.status !== 'fixed' && b.status !== 'closed').length;
  const fixedBugs = bugs.filter(b => b.status === 'fixed' || b.status === 'closed').length;

  const prompt = `You are a professional project management consultant. Write a concise weekly project summary for the client.

Project: ${project.name}
Client: ${project.client || 'N/A'}
Phase: ${project.phase}
Progress: ${project.progress}%
Status: ${project.status}

Metrics:
- Total tasks: ${tasks.length} (${done} done, ${inProgress} in progress, ${todo} to do)
- Overdue tasks: ${overdue}
- Sprints completed: ${sprints.filter(s => s.status === 'completed').length}
- Bugs: ${openBugs} open, ${fixedBugs} fixed in period
- Key decisions logged: ${decisions.length}

Write a professional summary covering:
1. Work completed this period
2. Current status and progress
3. Blockers or risks (if any)
4. Next steps and priorities

Keep it concise (2-3 paragraphs). Tone: professional, client-facing.`;

  return chat([
    { role: 'system', content: 'You are a professional project management consultant.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.4 });
}

async function estimateTaskDuration(projectId, title, description) {
  const similarTasks = await Task.find({
    project: projectId,
    status: { $ne: 'todo' },
    $or: [
      { title: { $regex: title.split(' ').slice(0, 3).join('|'), $options: 'i' } },
      { description: { $regex: title.split(' ').slice(0, 3).join('|'), $options: 'i' } },
    ],
  }).limit(5).lean();

  const examples = similarTasks.map(t =>
    `- "${t.title}" took ${t.estimatedHours || 'unknown'} hours (actual: ${t.loggedHours || 'unknown'}h)`
  ).join('\n');

  const prompt = `Based on these similar past tasks from the same project:

${examples || 'No similar tasks found — use your general knowledge.'}

New task: "${title}"
Description: "${description || 'N/A'}"

Estimate how many hours this task will take. Return ONLY a JSON object with a single field "hours" (a number).`;

  const result = await chat([
    { role: 'system', content: 'You are a project estimation expert. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { responseFormat: true, temperature: 0.2 });

  if (!result) return null;
  try {
    const parsed = JSON.parse(result);
    return parsed.hours || null;
  } catch { return null; }
}

async function detectProjectRisks(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error('Project not found');
  const tasks = await Task.find({ project: projectId }).lean();
  const bugs = await Bug.find({ project: projectId }).lean();
  const sprints = await Sprint.find({ project: projectId }).lean();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const openBugs = bugs.filter(b => b.status !== 'fixed' && b.status !== 'closed').length;
  const completedSprints = sprints.filter(s => s.status === 'completed').length;
  const velocity = completedSprints > 0
    ? Math.round(tasks.filter(t => t.status === 'done').length / completedSprints)
    : 0;

  const data = {
    projectName: project.name,
    phase: project.phase,
    progress: project.progress,
    completionRate: completionRate + '%',
    totalTasks,
    doneTasks,
    overdueTasks,
    openBugs,
    velocity: velocity + ' tasks/sprint',
    deadline: project.deadline || 'none',
    daysRemaining: project.deadline
      ? Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : 'no deadline',
  };

  const prompt = `Analyze this project health data and identify risks. For each risk: name it, explain why it matters, and suggest what to do.

Data: ${JSON.stringify(data, null, 2)}

Return a JSON array of risks: [{ "risk": "string", "explanation": "string", "recommendation": "string", "severity": "low"|"medium"|"high" }]`;

  const result = await chat([
    { role: 'system', content: 'You are a project risk analyst. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { responseFormat: true, temperature: 0.3 });

  if (!result) return [];
  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function chatWithProject(projectId, messages, conversationHistory = []) {
  const project = await Project.findById(projectId).populate('members', 'name email role').lean();
  if (!project) throw new Error('Project not found');
  const tasks = await Task.find({ project: projectId }).limit(20).sort({ createdAt: -1 }).lean();
  const sprints = await Sprint.find({ project: projectId }).lean();
  const bugs = await Bug.find({ project: projectId }).limit(10).sort({ createdAt: -1 }).lean();
  const decisions = await DecisionJournal.find({ project: projectId }).limit(10).sort({ createdAt: -1 }).lean();

  const taskSummary = tasks.map(t => `[${t.status}] ${t.title}${t.dueDate ? ' (due: ' + new Date(t.dueDate).toLocaleDateString() + ')' : ''}`).join('\n');
  const sprintSummary = sprints.map(s => `${s.name}: ${s.status} (${s.startDate ? new Date(s.startDate).toLocaleDateString() : '?'} - ${s.endDate ? new Date(s.endDate).toLocaleDateString() : '?'})`).join('\n');
  const bugSummary = bugs.map(b => `[${b.status}] ${b.title}`).join('\n');
  const decisionSummary = decisions.map(d => `- ${d.decision} (${d.outcome || 'pending'})`).join('\n');

  const systemPrompt = `You are an AI project assistant for GRESIO. You have access to this project's data:

Project: ${project.name}
Type: ${project.projectType}
Phase: ${project.phase}
Progress: ${project.progress}%
Status: ${project.status}
Client: ${project.client || 'N/A'}
Description: ${project.description || 'N/A'}
Team: ${project.members?.map(m => m.name + ' (' + m.role + ')').join(', ') || 'N/A'}

Recent Tasks (last 20):
${taskSummary || 'No tasks'}

Sprints:
${sprintSummary || 'No sprints'}

Recent Bugs:
${bugSummary || 'No bugs'}

Key Decisions:
${decisionSummary || 'No decisions'}

Answer questions about the project concisely and accurately. If you don't know something, say so.`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    ...messages,
  ];

  return chat(apiMessages, { temperature: 0.4, maxTokens: 1500 });
}

async function generateProjectTemplate(companyType, projectGoals) {
  const prompt = `You are a project planning expert. Create a project plan for a ${companyType} company.

Project goals: "${projectGoals}"

Generate a complete project template as JSON:
{
  "name": "Project name",
  "description": "Short description",
  "phases": [
    {
      "name": "Phase name",
      "tasks": [
        { "title": "Task title", "description": "Task description", "estimatedHours": 4 }
      ]
    }
  ],
  "suggestedRoles": ["role1", "role2"]
}

Generate 4-6 phases with 3-6 tasks each. Make it realistic and actionable.`;

  const result = await chat([
    { role: 'system', content: 'You are a project planning expert. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { responseFormat: true, temperature: 0.5, maxTokens: 3000 });

  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch { return null; }
}

async function interpretCommand(command) {
  const prompt = `You are a project management AI assistant. Parse the following user command and return a structured action plan as JSON.

Command: "${command}"

Return a JSON object with:
{
  "action": "create"|"update"|"launch"|"report"|"add"|"assign"|"unknown",
  "entity": "project"|"task"|"sprint"|"report"|"member"|"unknown",
  "params": { ... any extracted parameters },
  "summary": "Short human-readable summary of what will be done"
}

Extract all relevant parameters from the command (project name, task title, assignee, deadline, etc.).`;

  const result = await chat([
    { role: 'system', content: 'You are a project management AI. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { responseFormat: true, temperature: 0.2 });

  if (!result) return { action: 'unknown', entity: 'unknown', params: {}, summary: 'Could not parse command' };
  try {
    return JSON.parse(result);
  } catch { return { action: 'unknown', entity: 'unknown', params: {}, summary: 'Could not parse command' }; }
}

async function executeAction(actionPlan, userId) {
  const { action, entity, params } = actionPlan;
  const User = require('../models/User');
  const user = await User.findById(userId).lean();

  switch (action) {
    case 'create': {
      if (entity === 'project') {
        const Project = require('../models/Project');
        const project = await Project.create({
          name: params.name || 'New Project',
          description: params.description || '',
          projectType: params.projectType || 'software',
          deadline: params.deadline || undefined,
          client: params.client || '',
          domain: user.domain,
          members: [userId],
        });
        return { success: true, message: `Created project "${project.name}"`, entities: [{ type: 'project', id: project._id, name: project.name }] };
      }
      if (entity === 'task') {
        const Task = require('../models/Task');
        const task = await Task.create({
          title: params.title || 'New Task',
          description: params.description || '',
          project: params.projectId,
          assignee: params.assignee || userId,
          status: 'todo',
          priority: params.priority || 'medium',
        });
        return { success: true, message: `Created task "${task.title}"`, entities: [{ type: 'task', id: task._id, name: task.title }] };
      }
      if (entity === 'sprint') {
        const SprintModel = require('../models/Sprint');
        const sprint = await SprintModel.create({
          name: params.name || 'New Sprint',
          project: params.projectId,
          startDate: params.startDate || new Date(),
          endDate: params.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'active',
        });
        return { success: true, message: `Created sprint "${sprint.name}"`, entities: [{ type: 'sprint', id: sprint._id, name: sprint.name }] };
      }
      break;
    }
    case 'launch': {
      if (entity === 'project') {
        const projectDoc = await require('../models/Project').findById(params.projectId);
        if (!projectDoc) return { success: false, message: 'Project not found' };
        projectDoc.phase = 'launched';
        projectDoc.launchedAt = new Date();
        await projectDoc.save();
        return { success: true, message: `Launched project "${projectDoc.name}"`, entities: [{ type: 'project', id: projectDoc._id, name: projectDoc.name }] };
      }
      break;
    }
    case 'report': {
      if (entity === 'report') {
        const { generateReport } = require('../controllers/reportController');
        const report = await generateReportInternal(params.projectId, 'client');
        return { success: true, message: 'Report generated', entities: [{ type: 'report', id: report?._id }] };
      }
      break;
    }
    case 'add': {
      if (params.projectId && params.title) {
        const Task = require('../models/Task');
        const task = await Task.create({
          title: params.title,
          description: params.description || '',
          project: params.projectId,
          assignee: params.assignee || userId,
          status: 'todo',
        });
        return { success: true, message: `Added task "${task.title}"`, entities: [{ type: 'task', id: task._id, name: task.title }] };
      }
      break;
    }
  }

  return { success: false, message: `Unsupported action: ${action} ${entity}` };
}

async function generateReportInternal(projectId, type) {
  try {
    const { buildReportData } = require('../controllers/reportController');
    const data = await buildReportData(projectId, type);
    return data;
  } catch { return null; }
}

module.exports = {
  generateReportSummary,
  estimateTaskDuration,
  detectProjectRisks,
  chatWithProject,
  generateProjectTemplate,
  interpretCommand,
  executeAction,
};
