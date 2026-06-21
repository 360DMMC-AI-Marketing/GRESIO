const OpenAI = require('openai');
const env = require('../config/env');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Bug = require('../models/Bug');
const DecisionJournal = require('../models/DecisionJournal');
const Activity = require('../models/Activity');
const User = require('../models/User');

let _openai = null;
let _mockMode = false;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    _mockMode = true;
    return null;
  }
  _mockMode = false;
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

function getLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

const mockResponses = {
  greetings: /^(hello|hi|hey|bonjour|salut|coucou)/i,
  projectStatus: /(project|projet).*(status|progress|state|état|avancement)/i,
  tasksList: /(list|show|affiche|donne).*(task|tâche)/i,
  taskCreate: /(create|crée|ajoute|add|new).*(task|tâche)/i,
  taskUpdate: /(mark|update|change|set|passe).*(task|tâche|status|done|terminé)/i,
  report: /(report|rapport|summary|résumé|generate)/i,
  risk: /(risk|risque|danger|health|santé)/i,
  overload: /(overload|overworked|surcharge|too many|trop)/i,
  deadline: /(deadline|due|échéance|date limite)/i,
  member: /(member|team|membre|équipe|assign)/i,
};

async function mockChat(messages, options = {}) {
  const lastMsg = getLastUserMessage(messages);
  const isJson = options.responseFormat;

  if (isJson) {
    const allText = messages.map(m => m.content).join(' ');
    const userMsg = getLastUserMessage(messages);

    if (allText.includes('estimate') || allText.includes('duration') || allText.includes('hours')) {
      return JSON.stringify({ hours: 8 });
    }
    if (allText.includes('risk') || allText.includes('risque') || allText.includes('health')) {
      return JSON.stringify([
        { risk: 'Delayed tasks', explanation: 'Some tasks are past their deadline', recommendation: 'Review and reassign', severity: 'medium' },
        { risk: 'Team overload', explanation: 'One team member has too many open tasks', recommendation: 'Distribute workload', severity: 'high' },
      ]);
    }
    if (allText.includes('parse') || allText.includes('command') || allText.includes('interpret') || allText.includes('Parse')) {
      const cmdMatch = userMsg.match(/Command:\s+"([^"]+)"/);
      const cmd = cmdMatch ? cmdMatch[1] : userMsg;
      if (/create|crée|ajoute|add|new/i.test(cmd)) {
        const title = cmd.replace(/create|crée|ajoute|add|new\s+(task|tâche)\s+/i, '').trim();
        return JSON.stringify({ action: 'create', entity: title ? 'task' : 'project', params: { title: title || cmd }, summary: `Create ${title || 'item'}` });
      }
      if (/report|rapport/i.test(cmd)) {
        return JSON.stringify({ action: 'report', entity: 'report', params: {}, summary: 'Generate report' });
      }
      if (/assign|attribue/i.test(cmd)) {
        return JSON.stringify({ action: 'assign', entity: 'task', params: { title: cmd.replace(/assign\s+(the\s+)?/i, '').replace(/\s+to\s+.*/, '').trim(), assignee: cmd.match(/to\s+(.+)/i)?.[1]?.trim() || 'member' }, summary: 'Assign task' });
      }
      if (/mark|done|terminé|update/i.test(cmd)) {
        return JSON.stringify({ action: 'update', entity: 'task', params: { status: 'done' }, summary: 'Update task status' });
      }
      return JSON.stringify({ action: 'unknown', entity: 'unknown', params: {}, summary: 'Question or unknown command' });
    }
    if (allText.includes('template') || allText.includes('plan') || allText.includes('phases')) {
      return JSON.stringify({
        name: 'New Project',
        description: 'Generated project plan',
        phases: [{ name: 'Planning', tasks: [{ title: 'Define scope', description: 'Set project boundaries', estimatedHours: 4 }] }],
        suggestedRoles: ['Project Manager', 'Developer'],
      });
    }
    return JSON.stringify({ success: true, message: 'Done' });
  }

  // Conversational responses
  if (mockResponses.greetings.test(lastMsg)) {
    return 'Hey! How can I help you with your projects today?';
  }
  if (mockResponses.projectStatus.test(lastMsg)) {
    return 'Let me check your project status... I can see the project is progressing well. Most tasks are on track. Would you like me to pull up a specific project?';
  }
  if (mockResponses.tasksList.test(lastMsg)) {
    return 'Here are your current tasks: I can see there are several in progress and a few to do. Head to the Tasks tab to see the full list with details.';
  }
  if (mockResponses.taskCreate.test(lastMsg)) {
    return 'Sure, I can create that task for you. Just tell me the title, project, and who to assign it to.';
  }
  if (mockResponses.report.test(lastMsg)) {
    return "I'll generate a report for you. Which project would you like the report for?";
  }
  if (mockResponses.risk.test(lastMsg)) {
    return "I've analyzed the project health. There are a couple of things to watch: one team member has a heavy load, and a few tasks are overdue. Want me to suggest specific actions?";
  }
  if (mockResponses.deadline.test(lastMsg)) {
    return "Let me check the deadlines... There are tasks due this week. I'd recommend prioritizing those. Want me to list them out?";
  }
  return "I'm your GRESIO AI assistant. I can help you manage projects, create tasks, generate reports, and more. What would you like to do?";
}

async function chat(messages, options = {}) {
  const client = getClient();
  if (!client) {
    if (_mockMode) return mockChat(messages, options);
    return null;
  }
  const { data } = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2000,
    response_format: options.responseFormat ? { type: 'json_object' } : undefined,
  });
  return data.choices[0].message.content;
}

// -------------------------------------------------- //
//  ACTIVITY LOGGING                                  //
// -------------------------------------------------- //

async function logAction({ userId, userName, domain, projectId, action, entity, entityName, details, success }) {
  try {
    const description = `${userName || 'AI Agent'} ${action} ${entity}${entityName ? ' "' + entityName + '"' : ''}`;
    await Activity.create({
      user: userId,
      domain: domain || 'unknown',
      project: projectId || null,
      type: 'agent_action',
      source: 'agent',
      description,
      metadata: {
        action,
        entity,
        entityName,
        details: details || {},
        success: success !== false,
        timestamp: new Date().toISOString(),
      },
      score: 2,
    });
  } catch (err) {
    console.error('Failed to log agent action:', err.message);
  }
}

// -------------------------------------------------- //
//  PROJECT CONTEXT BUILDER (Full Project Memory)     //
// -------------------------------------------------- //

async function buildProjectContext(projectId) {
  const project = await Project.findById(projectId).populate('members', 'name email role').lean();
  if (!project) return null;

  const tasks = await Task.find({ project: projectId }).sort({ createdAt: -1 }).lean();
  const sprints = await Sprint.find({ project: projectId }).sort({ startDate: -1 }).lean();
  const bugs = await Bug.find({ project: projectId }).sort({ createdAt: -1 }).lean();
  const decisions = await DecisionJournal.find({ project: projectId }).sort({ createdAt: -1 }).limit(10).lean();
  const recentActivity = await Activity.find({ project: projectId }).sort({ createdAt: -1 }).limit(15).populate('user', 'name').lean();

  // Task breakdown
  const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0, delayed: 0 };
  const blockedTasks = [];
  const overdueTasks = [];
  const upcomingDeadlines = [];
  const assigneeLoad = {};
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const t of tasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

    if (t.status === 'delayed') {
      blockedTasks.push(t.title);
    }

    if (t.dueDate && t.status !== 'done') {
      const due = new Date(t.dueDate);
      if (due < now) {
        overdueTasks.push({ title: t.title, due: due.toLocaleDateString(), assignee: t.assignee });
      }
      if (due >= now && due <= nextWeek) {
        upcomingDeadlines.push({ title: t.title, due: due.toLocaleDateString(), assignee: t.assignee });
      }
    }

    if (t.assignee && t.status !== 'done') {
      const assigneeKey = t.assignee.toString();
      assigneeLoad[assigneeKey] = (assigneeLoad[assigneeKey] || 0) + 1;
    }
  }

  // Get user names for assignee loads
  const assigneeIds = Object.keys(assigneeLoad);
  const assigneeUsers = assigneeIds.length > 0
    ? await User.find({ _id: { $in: assigneeIds } }).select('name').lean()
    : [];
  const loadByUser = {};
  for (const u of assigneeUsers) {
    loadByUser[u.name] = assigneeLoad[u._id.toString()];
  }

  const teamActivityStr = recentActivity.map(a => {
    const userName = a.user?.name || 'Someone';
    return `${userName}: ${a.description} (${new Date(a.createdAt).toLocaleDateString()})`;
  }).join('\n');

  const overloadedUsers = Object.entries(loadByUser)
    .filter(([, count]) => count > 5)
    .map(([name, count]) => `${name} (${count} open tasks)`);

  const activeSprint = sprints.find(s => s.status === 'active');
  const activeSprintInfo = activeSprint
    ? `Active Sprint: "${activeSprint.name}" (${new Date(activeSprint.startDate).toLocaleDateString()} - ${new Date(activeSprint.endDate).toLocaleDateString()})\nGoal: ${activeSprint.goal || 'No specific goal'}`
    : 'No active sprint';

  return {
    project,
    tasks,
    sprints,
    bugs,
    decisions,
    statusCounts,
    blockedTasks,
    overdueTasks,
    upcomingDeadlines,
    assigneeLoad: loadByUser,
    overloadedUsers,
    activeSprintInfo,
    teamActivityStr,
  };
}

function formatProjectContext(ctx) {
  const p = ctx.project;
  let str = '';

  str += `Project: ${p.name}\n`;
  str += `Type: ${p.projectType} | Phase: ${p.phase} | Progress: ${p.progress}% | Status: ${p.status}\n`;
  str += `Client: ${p.client || 'N/A'} | Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No deadline'}\n`;
  str += `Team: ${p.members?.map(m => m.name + ' (' + m.role + ')').join(', ') || 'No members'}\n`;
  str += `Description: ${p.description || 'N/A'}\n\n`;

  str += `Task Overview: ${ctx.tasks.length} total`;
  if (ctx.statusCounts) {
    str += ` (${ctx.statusCounts.done || 0} done, ${ctx.statusCounts.in_progress || 0} in progress, ${ctx.statusCounts.todo || 0} to do, ${ctx.statusCounts.review || 0} in review, ${ctx.statusCounts.delayed || 0} delayed)`;
  }
  str += '\n';

  if (ctx.overdueTasks.length > 0) {
    str += `\n⚠️ Overdue tasks:\n`;
    for (const t of ctx.overdueTasks) {
      str += `  - "${t.title}" (due ${t.due})\n`;
    }
  }

  if (ctx.upcomingDeadlines.length > 0) {
    str += `\n📅 Upcoming deadlines (next 7 days):\n`;
    for (const t of ctx.upcomingDeadlines) {
      str += `  - "${t.title}" (due ${t.due})\n`;
    }
  }

  if (ctx.blockedTasks.length > 0) {
    str += `\n🚫 Blocked/Delayed tasks:\n`;
    for (const t of ctx.blockedTasks) {
      str += `  - "${t}"\n`;
    }
  }

  if (ctx.overloadedUsers.length > 0) {
    str += `\n⚠️ Overloaded team members:\n  - ${ctx.overloadedUsers.join('\n  - ')}\n`;
  }

  if (Object.keys(ctx.assigneeLoad).length > 0) {
    str += `\nTask load by assignee:\n`;
    for (const [name, count] of Object.entries(ctx.assigneeLoad)) {
      str += `  - ${name}: ${count} open tasks\n`;
    }
  }

  str += `\n${ctx.activeSprintInfo}\n`;

  if (ctx.bugs && ctx.bugs.length > 0) {
    str += `\nRecent bugs: ${ctx.bugs.length} total\n`;
    for (const b of ctx.bugs.slice(0, 10)) {
      str += `  [${b.status}] ${b.title}\n`;
    }
  }

  if (ctx.decisions && ctx.decisions.length > 0) {
    str += `\nKey decisions:\n`;
    for (const d of ctx.decisions) {
      str += `  - ${d.decision} → ${d.outcome || 'pending'}\n`;
    }
  }

  if (ctx.teamActivityStr) {
    str += `\nRecent team activity:\n${ctx.teamActivityStr}\n`;
  }

  return str;
}

async function generateProactiveSuggestions(projectId) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) return [];

  const suggestions = [];

  // Check if someone is overloaded
  if (ctx.overloadedUsers.length > 0) {
    suggestions.push({
      type: 'workload',
      message: `${ctx.overloadedUsers[0]} has too many open tasks. Want me to reassign some?`,
      command: `Reassign tasks from ${ctx.overloadedUsers[0].split(' (')[0]} to available team members`,
    });
  }

  // Check overdue tasks
  if (ctx.overdueTasks.length > 0) {
    const first = ctx.overdueTasks[0];
    const member = await User.findById(first.assignee).select('name').lean();
    const who = member ? member.name : 'Someone';
    suggestions.push({
      type: 'overdue',
      message: `"${first.title}" is overdue. ${who} is assigned. Want me to follow up or reassign?`,
      command: `Follow up on overdue task "${first.title}"`,
    });
  }

  // Check upcoming deadlines
  if (ctx.upcomingDeadlines.length > 0) {
    const count = ctx.upcomingDeadlines.length;
    const unassigned = ctx.upcomingDeadlines.filter(t => !t.assignee);
    if (unassigned.length > 0) {
      suggestions.push({
        type: 'unassigned',
        message: `${count} tasks due this week — ${unassigned.length} unassigned. Want me to assign them?`,
        command: `Assign unassigned tasks due this week`,
      });
    }
  }

  // Sprint at risk
  const activeSprint = ctx.sprints.find(s => s.status === 'active');
  if (activeSprint && ctx.upcomingDeadlines.length > 0) {
    suggestions.push({
      type: 'sprint_risk',
      message: `Sprint "${activeSprint.name}" has ${ctx.upcomingDeadlines.length} tasks due soon. Want a health check?`,
      command: `Check sprint "${activeSprint.name}" health`,
    });
  }

  return suggestions;
}

// -------------------------------------------------- //
//  PROACTIVE SUGGESTIONS FOR AI                       //
// -------------------------------------------------- //

async function buildSuggestionString(projectId) {
  try {
    const suggestions = await generateProactiveSuggestions(projectId);
    if (suggestions.length === 0) return '';
    let str = '\n\nConsider proactively suggesting:\n';
    for (const s of suggestions) {
      str += `  - ${s.message}\n`;
    }
    return str;
  } catch {
    return '';
  }
}

// -------------------------------------------------- //
//  REPORT SUMMARY (conversational)                   //
// -------------------------------------------------- //

async function generateReportSummary(projectId) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) throw new Error('Project not found');

  const p = ctx.project;
  const done = ctx.statusCounts.done || 0;
  const todo = ctx.statusCounts.todo || 0;
  const inProgress = ctx.statusCounts.in_progress || 0;
  const total = ctx.tasks.length;
  const overdue = ctx.overdueTasks.length;
  const openBugs = ctx.bugs.filter(b => b.status !== 'fixed' && b.status !== 'closed').length;
  const fixedBugs = ctx.bugs.filter(b => b.status === 'fixed' || b.status === 'closed').length;
  const completedSprints = ctx.sprints.filter(s => s.status === 'completed').length;

  const suggestionStr = await buildSuggestionString(projectId);

  const prompt = `You are a friendly project management consultant reporting to the team. Write a warm, conversational weekly project summary.

Project: ${p.name}
Client: ${p.client || 'N/A'}
Phase: ${p.phase}
Progress: ${p.progress}%
Status: ${p.status}

Metrics:
- Total tasks: ${total} (${done} done, ${inProgress} in progress, ${todo} to do)
- Overdue tasks: ${overdue}
- Sprints completed: ${completedSprints}
- Bugs: ${openBugs} open, ${fixedBugs} fixed
- Key decisions logged: ${ctx.decisions.length}

${ctx.overdueTasks.length > 0 ? `Overdue: ${ctx.overdueTasks.map(t => t.title).join(', ')}\n` : ''}
${ctx.upcomingDeadlines.length > 0 ? `Due this week: ${ctx.upcomingDeadlines.map(t => t.title).join(', ')}\n` : ''}
${ctx.blockedTasks.length > 0 ? `Delayed: ${ctx.blockedTasks.join(', ')}\n` : ''}
${ctx.overloadedUsers.length > 0 ? `Overloaded: ${ctx.overloadedUsers.join(', ')}\n` : ''}
${suggestionStr}

Write a friendly, team-oriented summary. Celebrate wins. Acknowledge challenges. Use natural language.
Mention specific people and tasks where relevant.
Keep it to 2-3 paragraphs. Use emojis sparingly but effectively.`;

  return chat([
    { role: 'system', content: 'You are a friendly project management consultant who talks like a helpful teammate. Be warm, specific, and proactive.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.5 });
}

// -------------------------------------------------- //
//  TASK ESTIMATION                                   //
// -------------------------------------------------- //

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

// -------------------------------------------------- //
//  RISK DETECTION (conversational)                   //
// -------------------------------------------------- //

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

// -------------------------------------------------- //
//  PROJECT CHAT (full project memory, conversational)//
// -------------------------------------------------- //

async function chatWithProject(projectId, messages, conversationHistory = []) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) throw new Error('Project not found');

  const contextStr = formatProjectContext(ctx);

  const systemPrompt = `You are GRESIO AI. You answer questions about this project using the data below. Do ONLY what the user literally asks. Do NOT add extra suggestions or actions.

Project context:
${contextStr}

RULES:
1. Answer only what was asked. Do not add extra information or suggestions.
2. If the user says "do X", only do X — do not add Y and Z.
3. If the user asks a question, answer it with the data provided. No extra commentary.
4. If the user asks to create/assign/update something, respond with ACTION: lines.
5. Be concise. One or two sentences per answer.
6. Use natural language, but no emojis or celebrations unless the user does.
7. Never ask "Want me to..." or "What's next?" unless the user explicitly asks.`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    ...messages,
  ];

  return chat(apiMessages, { temperature: 0.5, maxTokens: 2000 });
}

// -------------------------------------------------- //
//  TEMPLATE GENERATION                               //
// -------------------------------------------------- //

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

// -------------------------------------------------- //
//  COMMAND INTERPRETATION (conversational)           //
// -------------------------------------------------- //

async function interpretCommand(command) {
  const prompt = `Parse the user's project management command into a structured action plan.

Command: "${command}"

Return JSON:
{
  "action": "create"|"update"|"launch"|"report"|"add"|"assign"|"unknown",
  "entity": "project"|"task"|"sprint"|"report"|"member"|"unknown",
  "params": { ... },
  "summary": "brief description"
}

Extract these params when present:
- name / title: the item name (project name, task title, sprint name)
- description: optional description
- assignee: person's name
- deadline / due / dueDate: date
- priority: high/medium/low
- projectId: if a project is mentioned by name or ID
- client: client/company name for projects
- sprint: sprint name
- goal: sprint goal
- status: status to set (todo/in_progress/review/done/delayed)
- type: task type (task/bug/test_case)

Examples:
- "create a project called website redesign for acme" → {"action":"create","entity":"project","params":{"name":"website redesign","client":"acme"}}
- "add task fix login bug to project x, assign to sarah, priority high" → {"action":"add","entity":"task","params":{"title":"fix login bug","projectId":"project x","assignee":"sarah","priority":"high"}}
- "generate a weekly report" → {"action":"report","entity":"report","params":{}}
- "assign the login task to john" → {"action":"assign","entity":"task","params":{"title":"login task","assignee":"john"}}
- "create sprint sprint 5 with goal launch mvp" → {"action":"create","entity":"sprint","params":{"name":"sprint 5","goal":"launch mvp"}}
- "create task implement api for project x due next friday" → {"action":"create","entity":"task","params":{"title":"implement api","projectId":"project x","deadline":"next friday"}}
- "mark task fix login as done" → {"action":"update","entity":"task","params":{"title":"fix login","status":"done"}}
- "what tasks are overdue" → {"action":"unknown","entity":"unknown","params":{},"summary":"question about overdue tasks"}`;

  const result = await chat([
    { role: 'system', content: 'You parse project management commands into JSON. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { responseFormat: true, temperature: 0.2 });

  const unknown = { action: 'unknown', entity: 'unknown', params: {}, summary: 'Could not parse command.' };
  if (!result) return unknown;
  try {
    return JSON.parse(result);
  } catch {
    return unknown;
  }
}

// -------------------------------------------------- //
//  ACTION EXECUTION (conversational + activity log)  //
// -------------------------------------------------- //

async function executeAction(actionPlan, userId) {
  const { action, entity, params } = actionPlan;
  const user = await User.findById(userId).lean();
  const userName = user?.name || 'A team member';
  const domain = user?.domain || 'unknown';

  switch (action) {
    case 'create': {
      if (entity === 'project') {
        const Project = require('../models/Project');
        try {
          const project = await Project.create({
            name: params.name || 'New Project',
            description: params.description || '',
            projectType: params.projectType || 'software',
            deadline: params.deadline || undefined,
            client: params.client || '',
            domain,
            members: [userId],
          });

          await logAction({
            userId, userName, domain, projectId: project._id,
            action: 'created', entity: 'project', entityName: project.name,
            details: { client: params.client, deadline: params.deadline }, success: true,
          });

          const deadlineStr = params.deadline ? ` due ${new Date(params.deadline).toLocaleDateString()}` : '';
          return {
            success: true,
            message: `Created project "${project.name}".`,
            entities: [{ type: 'project', id: project._id, name: project.name }],
          };
        } catch (err) {
          return { success: false, message: `Could not create project "${params.name}". ${err.message.includes('validation') ? 'Required fields missing.' : 'Try again.'}` };
        }
      }
      if (entity === 'task') {
        const Task = require('../models/Task');
        try {
          let assigneeId = params.assignee || userId;
          let assigneeName = userName;

          if (params.assignee && params.assignee !== userId) {
            const assigneeUser = typeof params.assignee === 'string'
              ? await User.findOne({ name: { $regex: new RegExp('^' + params.assignee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).select('name _id').lean()
              : null;
            if (assigneeUser) {
              assigneeId = assigneeUser._id;
              assigneeName = assigneeUser.name;
            }
          }

          const task = await Task.create({
            title: params.title || 'New Task',
            description: params.description || '',
            project: params.projectId,
            assignee: assigneeId,
            status: 'todo',
            priority: params.priority || 'medium',
          });

          await logAction({
            userId, userName, domain, projectId: params.projectId,
            action: 'created', entity: 'task', entityName: task.title,
            details: { assignee: assigneeName, priority: params.priority, description: params.description }, success: true,
          });

          const sprintInfo = params.sprint ? ` in sprint "${params.sprint}"` : '';
          return {
            success: true,
            message: `Created task "${task.title}".`,
            entities: [{ type: 'task', id: task._id, name: task.title }],
          };
        } catch (err) {
          return { success: false, message: `Could not create task. ${err.message.includes('validation') ? 'Title or project invalid.' : 'Try again.'}` };
        }
      }
      if (entity === 'sprint') {
        const SprintModel = require('../models/Sprint');
        try {
          const sprint = await SprintModel.create({
            name: params.name || 'New Sprint',
            project: params.projectId,
            startDate: params.startDate || new Date(),
            endDate: params.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            goal: params.goal || '',
            status: 'active',
          });

          await logAction({
            userId, userName, domain, projectId: params.projectId,
            action: 'created', entity: 'sprint', entityName: sprint.name,
            details: { goal: params.goal, startDate: params.startDate, endDate: params.endDate }, success: true,
          });

          return {
            success: true,
            message: `Created sprint "${sprint.name}".`,
            entities: [{ type: 'sprint', id: sprint._id, name: sprint.name }],
          };
        } catch (err) {
          return { success: false, message: `Could not create sprint. Check project is valid.` };
        }
      }
      break;
    }
    case 'launch': {
      if (entity === 'project') {
        const projectDoc = await require('../models/Project').findById(params.projectId);
        if (!projectDoc) {
          const similar = await Project.find({ name: { $regex: params.name || '', $options: 'i' } }).limit(3).select('name').lean();
          const hint = similar.length > 0 ? ` Did you mean "${similar.map(p => p.name).join('", "')}"?` : '';
          return { success: false, message: `I couldn't find that project.${hint}` };
        }
        projectDoc.phase = 'launched';
        projectDoc.launchedAt = new Date();
        await projectDoc.save();

        await logAction({
          userId, userName, domain, projectId: projectDoc._id,
          action: 'launched', entity: 'project', entityName: projectDoc.name,
          details: {}, success: true,
        });

        return { success: true, message: `Launched "${projectDoc.name}".`, entities: [{ type: 'project', id: projectDoc._id, name: projectDoc.name }] };
      }
      break;
    }
    case 'report': {
      if (entity === 'report') {
        const { generateReport } = require('../controllers/reportController');
        try {
          const report = await generateReportInternal(params.projectId, 'client');

          await logAction({
            userId, userName, domain, projectId: params.projectId,
            action: 'generated', entity: 'report', entityName: 'Weekly Report',
            details: { type: 'client' }, success: true,
          });

          return { success: true, message: 'Report generated.', entities: [{ type: 'report', id: report?._id }] };
        } catch {
          const projectList = await Project.find({ domain }).limit(5).select('name _id').lean();
          const hint = projectList.length > 0 ? ` I see these projects: ${projectList.map(p => p.name).join(', ')}. Which one should I generate a report for?` : '';
          return { success: false, message: `Need a project to generate a report.${hint}` };
        }
      }
      break;
    }
    case 'add': {
      if (params.projectId && params.title) {
        const Task = require('../models/Task');
        try {
          let assigneeId = params.assignee || userId;
          let assigneeName = userName;

          if (params.assignee && params.assignee !== userId) {
            const assigneeUser = typeof params.assignee === 'string'
              ? await User.findOne({ name: { $regex: new RegExp('^' + params.assignee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).select('name _id').lean()
              : null;
            if (assigneeUser) {
              assigneeId = assigneeUser._id;
              assigneeName = assigneeUser.name;
            }
          }

          const task = await Task.create({
            title: params.title,
            description: params.description || '',
            project: params.projectId,
            assignee: assigneeId,
            status: 'todo',
          });

          await logAction({
            userId, userName, domain, projectId: params.projectId,
            action: 'added', entity: 'task', entityName: task.title,
            details: { assignee: assigneeName }, success: true,
          });

          return {
            success: true,
            message: `Added "${task.title}".`,
            entities: [{ type: 'task', id: task._id, name: task.title }],
          };
        } catch (err) {
          return { success: false, message: `Could not add task. Check title and project.` };
        }
      }
      break;
    }
    case 'assign': {
      if (entity === 'task' && params.title && params.assignee) {
        const assigneeUser = await User.findOne({ name: { $regex: new RegExp('^' + params.assignee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).select('name _id').lean();
        if (!assigneeUser) {
          const allUsers = await User.find({ domain }).limit(5).select('name').lean();
          const hint = allUsers.length > 0 ? ` Available team members: ${allUsers.map(u => u.name).join(', ')}.` : '';
          return { success: false, message: `Could not find "${params.assignee}" on the team.${hint}` };
        }
        const task = await Task.findOne({ title: { $regex: new RegExp(params.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, project: params.projectId }).lean();
        if (!task) {
          const similar = await Task.find({ project: params.projectId }).limit(5).select('title').lean();
          const hint = similar.length > 0 ? ` Existing tasks: ${similar.map(t => t.title).join(', ')}.` : '';
          return { success: false, message: `I couldn't find a task called "${params.title}".${hint}` };
        }

        await Task.updateOne({ _id: task._id }, { $set: { assignee: assigneeUser._id } });

        await logAction({
          userId, userName, domain, projectId: params.projectId,
          action: 'assigned', entity: 'task', entityName: task.title,
          details: { from: userName, to: assigneeUser.name }, success: true,
        });

        return { success: true, message: `Assigned "${task.title}" to ${assigneeUser.name}.`, entities: [{ type: 'task', id: task._id, name: task.title }] };
      }
      break;
    }
    case 'update': {
      if (entity === 'task' && params.title) {
        const updateFields = {};
        if (params.status) updateFields.status = params.status;
        if (params.priority) updateFields.priority = params.priority;
        if (params.assignee) {
          const assigneeUser = typeof params.assignee === 'string'
            ? await User.findOne({ name: { $regex: new RegExp('^' + params.assignee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).select('name _id').lean()
            : null;
          if (assigneeUser) updateFields.assignee = assigneeUser._id;
        }
        if (Object.keys(updateFields).length === 0) {
          return { success: false, message: `No fields to update for "${params.title}". Specify status, priority, or assignee.` };
        }
        const task = await Task.findOneAndUpdate(
          { title: { $regex: new RegExp(params.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, project: params.projectId },
          { $set: updateFields },
          { new: true }
        ).lean();
        if (!task) {
          return { success: false, message: `Could not find task "${params.title}".` };
        }
        await logAction({
          userId, userName, domain, projectId: params.projectId,
          action: 'updated', entity: 'task', entityName: task.title,
          details: updateFields, success: true,
        });
        return { success: true, message: `Updated "${task.title}".`, entities: [{ type: 'task', id: task._id, name: task.title }] };
      }
      break;
    }
  }

  // If we get here, the action/entity combination is unsupported
  return { success: false, message: `Cannot ${action} ${entity}. Available: create/update project/task/sprint, launch project, generate report, add task, assign/mark status.` };
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
  generateProactiveSuggestions,
  buildProjectContext,
  formatProjectContext,
};
