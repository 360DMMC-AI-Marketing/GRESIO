const OpenAI = require('openai');
const env = require('../config/env');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Bug = require('../models/Bug');
const DecisionJournal = require('../models/DecisionJournal');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { embed, embedBatch, cosineSimilarity } = require('./embeddingsService');

let _openai = null;
let _fallbackClient = null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getClient() {
  if (!env.OPENAI_API_KEY) return null;
  if (!_openai) {
    const config = { apiKey: env.OPENAI_API_KEY };
    if (env.OPENAI_BASE_URL) config.baseURL = env.OPENAI_BASE_URL;
    _openai = new OpenAI(config);
  }
  return _openai;
}

function getFallbackClient() {
  if (!env.OPENAI_API_KEY) return null;
  if (!_fallbackClient) {
    _fallbackClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _fallbackClient;
}

function classifyError(err) {
  if (!err) return { type: 'unknown', message: 'No response from AI.' };
  const status = err.status || err.response?.status;
  const msg = (err.message || '').toLowerCase();
  if (status === 429 || msg.includes('rate limit')) return { type: 'rate_limit', message: 'AI service is rate-limited. Please wait a moment and try again.' };
  if (status === 401 || status === 403 || msg.includes('auth') || msg.includes('api key')) return { type: 'auth', message: 'AI service authentication failed. Check API key.' };
  if (status === 502 || status === 503 || msg.includes('overloaded') || msg.includes('unavailable')) return { type: 'overloaded', message: 'AI service is temporarily overloaded. Retrying with fallback...' };
  if (status === 400 && msg.includes('context_length') || msg.includes('token')) return { type: 'context_too_long', message: 'Conversation too long. Will retry with truncated context.' };
  if (status === 408 || msg.includes('timeout')) return { type: 'timeout', message: 'AI request timed out. Retrying...' };
  return { type: 'unknown', message: `AI error: ${err.message}` };
}

function truncateMessages(messages, maxTokens = 8000) {
  const system = messages.filter(m => m.role === 'system');
  const nonSystem = messages.filter(m => m.role !== 'system');
  const reserved = system.reduce((a, m) => a + (m.content?.length || 0), 0);
  let total = reserved;
  const kept = [];
  for (const m of nonSystem.slice(-1)) {
    kept.push(m);
    total += m.content?.length || 0;
  }
  for (const m of nonSystem.slice(0, -1).reverse()) {
    if (total + (m.content?.length || 0) > maxTokens * 4) break;
    kept.unshift(m);
    total += m.content?.length || 0;
  }
  return [...system, ...kept];
}

async function chat(messages, options = {}) {
  const client = getClient();
  if (!client) {
    return options.responseFormat
      ? JSON.stringify({ error: 'AI not configured. Set OPENAI_API_KEY in .env' })
      : 'AI service is not configured. Ask your admin to set the OPENAI_API_KEY.';
  }

  const isKimi = env.OPENAI_BASE_URL?.includes('moonshot');
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const fallbackModel = isKimi ? 'gpt-4o-mini' : null;
  const maxRetries = 2;
  const errors = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const activeModel = attempt === 0 ? model : (attempt === 1 && fallbackModel ? fallbackModel : model);
    const activeClient = activeModel === model ? client : (getFallbackClient() || client);

    try {
      if (attempt > 0) await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 4000));

      let msgs = messages;
      if (attempt > 0) {
        msgs = truncateMessages(messages, 6000);
      }

      const response = await activeClient.chat.completions.create({
        model: activeModel,
        messages: msgs,
        temperature: options.temperature ?? (isKimi ? 0.6 : 0.3),
        max_tokens: options.maxTokens ?? 2000,
        timeout: 30000,
        response_format: options.responseFormat ? { type: 'json_object' } : undefined,
      });

      const msg = response.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content || '';
      if (content) return content;

      if (attempt < maxRetries) {
        errors.push({ attempt, model: activeModel, error: 'Empty response' });
        continue;
      }
      return options.responseFormat ? JSON.stringify({ error: 'Empty AI response' }) : 'I had trouble generating a response. Please try again.';
    } catch (err) {
      const classified = classifyError(err);
      errors.push({ attempt, model: activeModel, type: classified.type, message: classified.message });

      if (fallbackModel && attempt === 0 && classified.type !== 'auth') {
        continue;
      }
      if (attempt < maxRetries && classified.type !== 'auth') {
        continue;
      }

      const lastError = errors[errors.length - 1];
      if (options.responseFormat) return JSON.stringify({ error: lastError.message });
      return lastError.type === 'auth'
        ? 'AI service needs to be configured. Contact your admin.'
        : `I ran into an issue: ${lastError.message}`;
    }
  }

  return options.responseFormat
    ? JSON.stringify({ error: 'AI request failed after retries.' })
    : "I'm having trouble connecting. Please try again in a moment.";
}

async function* chatStream(messages, options = {}) {
  const client = getClient();
  if (!client) {
    yield 'AI service is not configured. Set OPENAI_API_KEY.';
    return;
  }

  const isKimi = env.OPENAI_BASE_URL?.includes('moonshot');
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? (isKimi ? 0.6 : 0.3),
    max_tokens: options.maxTokens ?? 2000,
    stream: true,
    timeout: 30000,
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content || '';
    if (token) yield token;
  }
}

// -------------------------------------------------- //
//  RAG (Semantic Search via Embeddings)              //
// -------------------------------------------------- //

async function ragSearch(query, items, topK = 5) {
  if (!items || items.length === 0) return [];
  try {
    const queryEmbed = await embed(query);
    if (!queryEmbed?.success) return [];

    const texts = items.map(i => i.title || i.name || i.content || JSON.stringify(i));
    const batchEmbed = await embedBatch(texts);
    if (!batchEmbed?.success) return [];

    const scored = items.map((item, i) => ({
      item,
      score: cosineSimilarity(queryEmbed.data, batchEmbed.data[i]),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch {
    return [];
  }
}

async function buildRagContext(projectId, userMessage) {
  try {
    const tasks = await Task.find({ project: projectId }).select('title description status assignee dueDate priority').limit(50).lean();
    const decisions = await DecisionJournal.find({ project: projectId }).select('decision outcome').limit(20).lean();
    const bugs = await Bug.find({ project: projectId }).select('title status').limit(20).lean();
    const sprints = await Sprint.find({ project: projectId }).select('name goal status').limit(10).lean();

    const items = [
      ...tasks.map(t => ({ ...t, _type: 'task', content: `${t.title} ${t.description || ''} ${t.status} ${t.priority || ''}` })),
      ...decisions.map(d => ({ ...d, _type: 'decision', content: `${d.decision} ${d.outcome || ''}` })),
      ...bugs.map(b => ({ ...b, _type: 'bug', content: `${b.title} ${b.status}` })),
    ];

    const results = await ragSearch(userMessage, items, 8);
    if (results.length === 0) return '';

    let str = '\n\n## Semantically Related Items (from embeddings search)\n';
    for (const r of results) {
      const item = r.item;
      if (item._type === 'task') {
        str += `- Task: "${item.title}" [${item.status}] Assignee: ${item.assignee || 'unassigned'}\n`;
      } else if (item._type === 'decision') {
        str += `- Decision: ${item.decision} → ${item.outcome || 'pending'}\n`;
      } else if (item._type === 'bug') {
        str += `- Bug: "${item.title}" [${item.status}]\n`;
      }
    }
    return str;
  } catch {
    return '';
  }
}

// -------------------------------------------------- //
//  RESPONSE VALIDATION (auto-re-prompt on bad JSON)   //
// -------------------------------------------------- //

async function validateAndParseJson(messages, result, parseFn, errorMessage) {
  if (!result) return null;
  try {
    const parsed = JSON.parse(result);
    const validated = parseFn(parsed);
    if (validated !== undefined) return validated;
  } catch {}

  const retryResult = await chat([
    ...messages.slice(0, -1),
    { role: 'assistant', content: result || '' },
    { role: 'user', content: errorMessage || 'Previous response was not valid JSON. Respond with ONLY valid JSON. No extra text, no markdown, no explanation.' },
  ], { responseFormat: true, temperature: 0.1 });

  if (!retryResult) return null;
  try {
    const parsed = JSON.parse(retryResult);
    const validated = parseFn(parsed);
    if (validated !== undefined) return validated;
  } catch {}
  return null;
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
  const autopsyEvents = await require('../models/AutopsyEvent').find({ projectId }).sort({ timestamp: -1 }).limit(20).populate('actor', 'name').lean();

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
    autopsyEvents,
  };
}

function formatProjectContext(ctx) {
  const p = ctx.project;
  const autopsyEvents = ctx.autopsyEvents || [];
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

  if (autopsyEvents.length > 0) {
    str += `\nAutopsy events (event log — recent ${autopsyEvents.length}):\n`;
    for (const e of autopsyEvents) {
      str += `  [${e.eventType}] ${e.actor?.name || 'System'} — ${e.reason || 'No details'} (${new Date(e.timestamp).toLocaleDateString()})\n`;
    }
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

  const messages = [
    { role: 'system', content: 'You are a project estimation expert. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];

  const result = await chat(messages, { responseFormat: true, temperature: 0.2 });
  if (!result) return null;

  return validateAndParseJson(messages, result,
    (parsed) => parsed.hours || null,
    'Previous response was not a valid estimation. Return ONLY {"hours": <number>}.'
  );
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

  const messages = [
    { role: 'system', content: 'You are a project risk analyst. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];

  const result = await chat(messages, { responseFormat: true, temperature: 0.3 });
  if (!result) return [];

  return validateAndParseJson(messages, result,
    (parsed) => Array.isArray(parsed) ? parsed : [],
    'Previous response was not a valid risk array. Return ONLY a JSON array of risk objects.'
  ) || [];
}

// -------------------------------------------------- //
//  PROJECT CHAT (full project memory, conversational)//
// -------------------------------------------------- //

async function chatWithProject(projectId, messages, conversationHistory = []) {
  const ctx = await buildProjectContext(projectId);
  if (!ctx) throw new Error('Project not found');

  const contextStr = formatProjectContext(ctx);
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  const ragStr = await buildRagContext(projectId, lastUserMsg);

  const systemPrompt = `You are GRESIO AI — a senior project assistant. You think like an experienced project manager who knows this project inside out.

Project context:
${contextStr}${ragStr}

RULES:
1. Be smart and proactive. Connect dots between tasks, people, and deadlines.
2. If the user's request is vague, make a reasonable assumption based on the data.
3. Answer questions with specific data (numbers, names, dates) from the context.
4. If the user asks to create/assign/update something, respond with ACTION: lines.
5. If you notice related issues (e.g., someone is overloaded, a task is at risk), mention it naturally.
6. Be conversational and warm — you're a teammate, not a robot.
7. Keep responses concise but thorough. 2-4 sentences is usually right.
8. Use emojis naturally when appropriate (🎯 for goals, ⚠️ for warnings, ✅ for completions).`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    ...messages,
  ];

  return chat(apiMessages, { temperature: 0.5, maxTokens: 2000 });
}

// -------------------------------------------------- //
//  APP-WIDE CHAT (full GRESIO knowledge)             //
// -------------------------------------------------- //

async function buildAppContext(userId, domain) {
  const user = await User.findById(userId).select('name email role domain').lean();
  const projects = await Project.find({ domain }).sort({ createdAt: -1 }).lean();
  const activeSprints = await Sprint.find({ domain, status: 'active' }).sort({ startDate: -1 }).lean();
  const tasks = await Task.find({ domain, status: { $ne: 'done' } }).sort({ dueDate: 1 }).lean();
  const allUsers = await User.find({ domain, isActive: true }).select('name email role').lean();
  const recentActivity = await Activity.find({ domain }).sort({ createdAt: -1 }).limit(20).populate('user', 'name').lean();
  const roleLabels = { admin:'Admin', team_lead:'Team Lead', project_manager:'Proj. Manager', manager:'Manager', qa_tester:'QA Tester', developer:'Developer', intern:'Intern' };

  const projectsSummary = projects.map(p => ({
    _id: p._id, name: p.name, phase: p.phase, status: p.status, progress: p.progress,
    client: p.client || '-', deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : '-',
  }));

  const sprintsSummary = activeSprints.map(s => ({
    name: s.name, goal: s.goal || '-',
    period: `${new Date(s.startDate).toLocaleDateString()} – ${new Date(s.endDate).toLocaleDateString()}`,
    projectId: s.project?.toString() || '-',
  }));

  const recentActivityStr = recentActivity.slice(0, 10).map(a => {
    const name = a.user?.name || 'Someone';
    return `- ${name}: ${a.description}`;
  }).join('\n');

  const now = new Date();
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
  const upcomingTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= new Date(now.getTime() + 7 * 86400000));

  const tasksByStatus = await Task.aggregate([
    { $match: { domain } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusSummary = {};
  for (const s of tasksByStatus) statusSummary[s._id] = s.count;

  const assigneeLoad = {};
  for (const t of tasks) {
    if (t.assignee) {
      const key = t.assignee.toString();
      assigneeLoad[key] = (assigneeLoad[key] || 0) + 1;
    }
  }
  const loadArr = await User.find({ _id: { $in: Object.keys(assigneeLoad) } }).select('name').lean();
  const teamLoad = loadArr.map(u => ({ name: u.name, tasks: assigneeLoad[u._id.toString()] })).sort((a, b) => b.tasks - a.tasks);
  const overloaded = teamLoad.filter(m => m.tasks > 5);

  const atRiskProjects = projectsSummary.filter(p => {
    if (p.status === 'blocked' || p.status === 'delayed') return true;
    if (p.deadline !== '-') {
      const d = new Date(p.deadline);
      return d < new Date(now.getTime() + 7 * 86400000) && p.progress < 80;
    }
    return false;
  });

  const membersByRole = {};
  for (const u of allUsers) {
    const r = roleLabels[u.role] || u.role;
    if (!membersByRole[r]) membersByRole[r] = [];
    membersByRole[r].push(u.name);
  }

  return {
    user, projectsSummary, sprintsSummary, totalTasks: tasks.length + Object.values(statusSummary).reduce((a, b) => a + b, 0),
    totalUsers: allUsers.length, recentActivityStr, overdueCount: overdueTasks.length,
    statusSummary, projectCount: projects.length,
    overdueTasks: overdueTasks.map(t => ({ title: t.title, projectId: t.project, dueDate: t.dueDate })),
    upcomingTasks: upcomingTasks.map(t => ({ title: t.title, projectId: t.project, dueDate: t.dueDate })),
    teamLoad, overloaded, atRiskProjects, membersByRole, roleLabels,
  };
}

function formatAppContext(ctx) {
  const { user, projectsSummary, sprintsSummary, totalTasks, totalUsers, recentActivityStr, overdueCount, statusSummary, projectCount, overdueTasks, upcomingTasks, teamLoad, overloaded, atRiskProjects, membersByRole, roleLabels } = ctx;
  const statusBreakdown = Object.entries(statusSummary).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ');
  const projLines = projectsSummary.map(p =>
    `- "${p.name}" [${p.status}] Phase: ${p.phase} | Progress: ${p.progress}% | Client: ${p.client} | Deadline: ${p.deadline}`
  ).join('\n');

  const overloadLines = overloaded.length > 0 ? overloaded.map(m => `- ${m.name}: ${m.tasks} open tasks`).join('\n') : 'None';
  const riskLines = atRiskProjects.length > 0 ? atRiskProjects.map(p => `- "${p.name}" (${p.status}, ${p.progress}%, due ${p.deadline})`).join('\n') : 'None';

  const teamByRole = Object.entries(membersByRole).map(([role, names]) => `- ${role}: ${names.join(', ')}`).join('\n');

  return `
## Company Overview
- Projects: ${projectCount} | Tasks: ${totalTasks} (${statusBreakdown}) | Team: ${totalUsers}
- Overdue: ${overdueCount} | Overloaded: ${overloaded.length}

## Your Profile
- Name: ${user.name} | Role: ${roleLabels[user.role] || user.role}

## Team by Role
${teamByRole}

## All Projects
${projLines}

## Active Sprints
${sprintsSummary.length > 0 ? sprintsSummary.map(s => `- "${s.name}" (${s.period}) Goal: ${s.goal}`).join('\n') : 'None'}

## At-Risk Projects
${riskLines}

## Team Workload (heaviest first)
${teamLoad.map(m => `- ${m.name}: ${m.tasks} open tasks`).join('\n') || 'No data'}

## Overloaded Members
${overloadLines}

## Due This Week
${upcomingTasks.length > 0 ? upcomingTasks.map(t => `- "${t.title}"`).join('\n') : 'None'}

## Recent Activity
${recentActivityStr || 'No recent activity'}
`;
}

async function chatWithApp(message, userId, domain, conversationHistory = [], pageContext = '') {
  const ctx = await buildAppContext(userId, domain);
  const contextStr = formatAppContext(ctx);

  const systemPrompt = `You are GRESIO AI — the intelligent assistant for GRESIO Internal OS. You are a senior product/engineering leader who knows everything about the company's projects, team, and operations.

## YOUR PERSONALITY
- You are smart, proactive, and conversational. You think ahead and connect dots.
- You NEVER give vague answers like "please specify" or "I need more details." Always offer specific suggestions based on available data.
- If the user's request is ambiguous, make a smart guess based on context and offer it.
- You are warm and direct. Use natural language. You're a colleague, not a FAQ bot.

## WHAT YOU CAN DO AUTOMATICALLY
- Answer questions about ANY data in the context below
- Navigate to any section: put "NAVIGATE: /path" on its own line
- Execute actions: create/update/launch projects/tasks/sprints, assign, generate reports
- Suggest proactive actions based on what you see (overdue tasks, overloaded team, at-risk projects)
- Log everything to the activity feed

## ALL PATHS (use these for NAVIGATE:)
Dashboard=/dashboard | Projects=/projects | Sprints=/sprints | Tasks=/tasks | My Tasks=/my-tasks
Tests=/test-cases | Calendar=/calendar | Work Log=/work-logs | Team=/users | Wiki=/wiki
WorkDNA=/work-dna | Templates=/templates | Analytics=/analytics | Reports=/reports
Relay=/relay | Admin=/admin | Profile=/profile | Guide=/onboarding-guide
GitHub=/github | Teams Integration=/teams | Outlook=/outlook
Super Dashboard=/super/dashboard | Super Companies=/super/companies

## CURRENT DATA
${contextStr}

## USER'S CURRENT PAGE
${pageContext ? `The user is currently on the "${pageContext}" page.` : 'Page context not available.'}

## CRITICAL RULES (follow these exactly)
1. NEVER say "please specify", "I need more details", "could not understand", or anything that shifts burden to the user. Instead, make a smart guess from available data and offer it.
2. If asked to navigate, respond with NAVIGATE: /path immediately with a brief explanation.
3. If asked a question, answer concisely using the data. Include numbers and specifics.
4. If you spot problems (overdue, overloaded, at-risk), mention them proactively.
5. If the user seems lost or says "help", suggest 2-3 concrete things you can do.
6. Use the user's name (${ctx.user.name}) naturally.
7. Keep responses 2-4 sentences — punchy, not verbose.`;

  const priorMessages = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : 'system',
    content: typeof msg.content === 'string' ? msg.content : typeof msg === 'string' ? msg : JSON.stringify(msg),
  })).filter(m => m.content && m.content.length > 0);

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...priorMessages.slice(-20),
    { role: 'user', content: message },
  ];

  const result = await chat(apiMessages, { temperature: 0.6, maxTokens: 3000 });

  try {
    await Activity.create({
      user: userId,
      domain,
      type: 'agent_action',
      source: 'agent',
      description: `AI Chat: ${message.substring(0, 100)}`,
      metadata: { action: 'chat', message: message.substring(0, 200), reply: (result || '').substring(0, 200) },
      score: 1,
    });
  } catch (_) {}

  return result || 'Got it. What else can I help with?';
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

  const messages = [
    { role: 'system', content: 'You are a project planning expert. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];

  const result = await chat(messages, { responseFormat: true, temperature: 0.5, maxTokens: 3000 });
  if (!result) return null;

  return validateAndParseJson(messages, result,
    (parsed) => parsed?.name && parsed?.phases ? parsed : null,
    'Previous response was not a valid project template. Return ONLY a JSON object with "name", "description", "phases", and "suggestedRoles".'
  );
}

// -------------------------------------------------- //
//  COMMAND INTERPRETATION (conversational)           //
// -------------------------------------------------- //

async function interpretCommand(command) {
  const prompt = `Parse the user's project management command into a structured action plan.

Command: "${command}"

Return JSON:
{
  "action": "create"|"update"|"launch"|"report"|"add"|"assign"|"navigate"|"unknown",
  "entity": "project"|"task"|"sprint"|"report"|"member"|"unknown",
  "params": { ... },
  "summary": "brief description"
}

For "navigate" action, params.path should be one of:
/dashboard /projects /sprints /tasks /my-tasks /test-cases /calendar /work-logs /users /wiki /work-dna /templates /analytics /reports /relay /admin /profile /onboarding-guide

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
- path: navigation path (for navigate action)

Examples:
- "create a project called website redesign for acme" → {"action":"create","entity":"project","params":{"name":"website redesign","client":"acme"}}
- "add task fix login bug to project x, assign to sarah, priority high" → {"action":"add","entity":"task","params":{"title":"fix login bug","projectId":"project x","assignee":"sarah","priority":"high"}}
- "generate a weekly report" → {"action":"report","entity":"report","params":{}}
- "assign the login task to john" → {"action":"assign","entity":"task","params":{"title":"login task","assignee":"john"}}
- "create sprint sprint 5 with goal launch mvp" → {"action":"create","entity":"sprint","params":{"name":"sprint 5","goal":"launch mvp"}}
- "create task implement api for project x due next friday" → {"action":"create","entity":"task","params":{"title":"implement api","projectId":"project x","deadline":"next friday"}}
- "mark task fix login as done" → {"action":"update","entity":"task","params":{"title":"fix login","status":"done"}}
- "go to the projects page" → {"action":"navigate","entity":"unknown","params":{"path":"/projects"}}
- "take me to dashboard" → {"action":"navigate","entity":"unknown","params":{"path":"/dashboard"}}
- "show me the team" → {"action":"navigate","entity":"unknown","params":{"path":"/users"}}`;

  const messages = [
    { role: 'system', content: 'You parse project management commands into JSON. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ];

  const result = await chat(messages, { responseFormat: true, temperature: 0.2 });

  const unknown = { action: 'unknown', entity: 'unknown', params: {}, summary: 'Could not parse command.' };
  if (!result) return unknown;

  return validateAndParseJson(messages, result,
    (parsed) => parsed?.action ? parsed : unknown,
    'Previous response was not a valid command parse. Return ONLY a JSON object with "action", "entity", "params", and "summary".'
  ) || unknown;
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
    case 'navigate': {
      const path = params.path || '/dashboard';
      return { success: true, message: `Navigating...`, navigateTo: path };
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

// -------------------------------------------------- //
//  CLICKUP IMPORT ANALYSIS (AI-powered)              //
// -------------------------------------------------- //

async function analyzeClickupForImport(clickupData) {
  const systemPrompt = `You are a project migration expert. Your job is to analyze ClickUp workspace data and convert it into structured project plans.

RULES:
1. Determine the project type from task content (software/design/business/content/research)
2. Map ClickUp statuses to our statuses: todo, in_progress, review, done, delayed
3. Categorize tasks by type (task/bug/test_case) based on tags, names, and descriptions
4. Suggest which lists become projects vs sprints vs skipped
5. Suggest phases based on task content and status distribution
6. Match assignees to existing users by name similarity when possible
7. Return ONLY valid JSON - no extra text`;

  const prompt = `Analyze this ClickUp workspace data and return a structured conversion plan.

DATA:
${JSON.stringify(clickupData, null, 2)}

Return a JSON array where each element represents a ClickUp list and what to do with it:
[
  {
    "clickupListId": "list_id",
    "clickupListName": "List name",
    "action": "create_project" | "skip",
    "projectName": "Suggested project name",
    "projectType": "software" | "design" | "business" | "content" | "research",
    "phase": "discovery" | "planning" | "development" | "testing" | "review" | "launched",
    "description": "Project description",
    "statusMapping": {
      "clickup_status_name": "todo" | "in_progress" | "review" | "done" | "delayed"
    },
    "taskTypes": {
      "clickup_task_id": "task" | "bug" | "test_case"
    },
    "summary": "Why this conversion makes sense"
  }
]

Be smart about it:
- If a list is called "bugs" or "issues", mark tasks as type "bug"
- If a list is called "QA" or "Testing", mark tasks as type "test_case"
- Map statuses intelligently (e.g., "QA Pass" -> "done", "In Development" -> "in_progress")
- Skip empty lists or meta lists
- Suggest project names that make sense from list/folder/space context`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const result = await chat(messages, { responseFormat: true, temperature: 0.3, maxTokens: 4000 });
  if (!result) return null;

  return validateAndParseJson(messages, result,
    (parsed) => Array.isArray(parsed) ? parsed : null,
    'Previous response was not a valid import plan. Return ONLY a JSON array of conversion plan objects.'
  );
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
  chatWithApp,
  buildAppContext,
  formatAppContext,
  analyzeClickupForImport,
  chatStream,
  buildRagContext,
  chat,
};
