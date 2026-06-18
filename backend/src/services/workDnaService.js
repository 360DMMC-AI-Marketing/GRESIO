const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const DecisionJournal = require('../models/DecisionJournal');
const AiAnalysis = require('../models/AiAnalysis');
const Project = require('../models/Project');

function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'they', 'our', 'their', 'not', 'no', 'so', 'if', 'as', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'too', 'very', 'just', 'also', 'now']);
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

exports.getProjectDejaVu = async (projectId, domain) => {
  const project = await Project.findById(projectId).select('name projectType description');
  if (!project) return null;

  const archives = await AiAnalysis.find({
    projectId: { $ne: projectId },
    domain,
    status: 'done',
  }).sort({ createdAt: -1 }).limit(20).lean();

  if (archives.length === 0) return { project: project.name, type: project.projectType, similarProjects: 0, lessons: [] };

  const projectKeywords = extractKeywords(`${project.name} ${project.description || ''}`);
  const scored = archives
    .map(a => {
      const aKeywords = extractKeywords(`${a.projectName} ${a.summary || ''} ${(a.features || []).join(' ')}`);
      const matchCount = aKeywords.filter(k => projectKeywords.includes(k)).length;
      const score = aKeywords.length > 0 ? matchCount / Math.max(aKeywords.length, 1) : 0;
      return { archive: a, score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const lessons = scored.map(item => ({
    projectName: item.archive.projectName,
    projectStatus: item.archive.projectStatus,
    projectType: item.archive.projectType,
    analyzedMonth: item.archive.analyzedMonth,
    completionRate: item.archive.stats?.totalTasks > 0
      ? Math.round((item.archive.stats.doneTasks / item.archive.stats.totalTasks) * 100)
      : 0,
    overdueTasks: item.archive.stats?.overdueTasks || 0,
    totalSprints: item.archive.stats?.totalSprints || 0,
    totalBugs: item.archive.stats?.totalBugs || 0,
    totalDecisions: item.archive.stats?.totalDecisions || 0,
    features: item.archive.features || [],
    techStack: item.archive.techStack || [],
    summary: item.archive.summary || '',
    members: item.archive.members || [],
    keyDecisions: (item.archive.keyDecisions || []).slice(0, 5).map(d => ({
      decision: d.decision,
      rationale: d.rationale,
      outcome: d.outcome,
      by: d.by || 'Unknown',
    })),
    risks: item.archive.risks || [],
    patterns: item.archive.patterns || [],
  }));

  return { project: project.name, type: project.projectType, similarProjects: archives.length, lessons };
};

exports.getDecisionTrail = async (refType, refId) => {
  const entries = await DecisionJournal.find({ refType, refId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name avatar role');
  return entries;
};

exports.getPatternDetection = async (domain) => {
  const patterns = [];

  const tasks = await Task.find({ domain, isActive: true }).populate('project', 'name');
  const sprints = await Sprint.find({ domain }).populate('project', 'name');
  const decisions = await DecisionJournal.find({ domain }).populate('createdBy', 'name role');

  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');
  if (overdueTasks.length > 5) {
    patterns.push({
      type: 'warning',
      title: 'Recurring Overdue Tasks',
      detail: `${overdueTasks.length} tasks past deadline across ${new Set(overdueTasks.map(t => t.project?._id?.toString())).size} projects`,
      severity: 'high',
    });
  }

  const perUser = {};
  tasks.forEach(t => {
    if (t.assignee) {
      const uid = String(t.assignee);
      if (!perUser[uid]) perUser[uid] = { total: 0, overdue: 0, done: 0, name: '' };
      perUser[uid].total++;
      if (t.status === 'done') perUser[uid].done++;
      if (t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done') perUser[uid].overdue++;
    }
  });
  Object.entries(perUser).forEach(([uid, data]) => {
    if (data.total >= 5 && data.overdue / data.total > 0.3) {
      patterns.push({
        type: 'user_insight',
        title: `Task assignment pattern: ${data.overdue}/${data.total} overdue`,
        detail: `User consistently has >30% overdue rate. Consider workload rebalancing.`,
        severity: 'medium',
      });
    }
  });

  const byType = {};
  tasks.forEach(t => {
    if (t.type === 'bug') {
      const pid = t.project?._id?.toString() || 'unknown';
      byType[pid] = byType[pid] || { projectName: t.project?.name || 'Unknown', bugs: 0 };
      byType[pid].bugs++;
    }
  });
  Object.values(byType).forEach(p => {
    if (p.bugs >= 3) {
      patterns.push({
        type: 'insight',
        title: `High bug density in "${p.projectName}"`,
        detail: `${p.bugs} bugs reported — may indicate technical debt or inadequate testing`,
        severity: 'medium',
      });
    }
  });

  const repeatedDecisions = {};
  decisions.forEach(d => {
    const key = d.decision.toLowerCase().trim();
    repeatedDecisions[key] = repeatedDecisions[key] || { count: 0, entries: [] };
    repeatedDecisions[key].count++;
    repeatedDecisions[key].entries.push({ project: d.project, decision: d.decision, rationale: d.rationale, by: d.createdBy?.name });
  });
  Object.entries(repeatedDecisions).forEach(([key, data]) => {
    if (data.count >= 2) {
      patterns.push({
        type: 'decision_pattern',
        title: `Repeated decision: "${key.length > 60 ? key.slice(0, 60) + '...' : key}"`,
        detail: `Made ${data.count} times across different contexts`,
        severity: 'low',
      });
    }
  });

  if (sprints.length > 0) {
    const sprintDurations = sprints.map(s => (new Date(s.endDate) - new Date(s.startDate)) / 86400000);
    const avgDur = sprintDurations.reduce((s, d) => s + d, 0) / sprintDurations.length;
    const varDur = Math.sqrt(sprintDurations.reduce((s, d) => s + (d - avgDur) ** 2, 0) / sprintDurations.length);
    if (varDur > 5) {
      patterns.push({
        type: 'insight',
        title: 'Inconsistent sprint lengths',
        detail: `Sprint durations vary significantly (σ=${Math.round(varDur)}d, avg=${Math.round(avgDur)}d). Consistent cadence improves predictability.`,
        severity: 'low',
      });
    }
  }

  return patterns;
};
