const DecisionJournal = require('../models/DecisionJournal');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const Bug = require('../models/Bug');
const User = require('../models/User');
const AiAnalysis = require('../models/AiAnalysis');
const { getProjectDejaVu, getDecisionTrail, getPatternDetection } = require('../services/workDnaService');

const { getDomainProjectIds } = require('../config/planLimits');

exports.getDecisions = async (req, res, next) => {
  try {
    const { refType, refId } = req.query;
    const filter = { domain: req.user.domain };
    if (refType && refId) { filter.refType = refType; filter.refId = refId; }
    if (req.query.project) filter.project = req.query.project;
    const decisions = await DecisionJournal.find(filter)
      .sort({ createdAt: -1 }).limit(50)
      .populate('createdBy', 'name avatar role');
    res.json(decisions);
  } catch (e) { next(e); }
};

exports.createDecision = async (req, res, next) => {
  try {
    const { refType, refId, decision, alternatives, rationale, outcome, tags, project } = req.body;
    if (!refType || !refId || !decision) {
      return res.status(400).json({ message: 'refType, refId, and decision are required' });
    }
    let projId = project;
    if (!projId) {
      try {
        if (refType === 'task') {
          const task = await Task.findById(refId).select('project');
          if (task) projId = task.project;
        } else if (refType === 'sprint') {
          const sprint = await Sprint.findById(refId).select('project');
          if (sprint) projId = sprint.project;
        }
      } catch (_) { /* refId is not an ObjectId — just skip project lookup */ }
    }
    const entry = await DecisionJournal.create({
      refType, refId, decision, alternatives, rationale, outcome,
      tags: tags || [],
      project: projId,
      createdBy: req.user._id,
      domain: req.user.domain,
    });
    res.status(201).json(entry);
  } catch (e) { next(e); }
};

exports.deleteDecision = async (req, res, next) => {
  try {
    const entry = await DecisionJournal.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!entry) return res.status(404).json({ message: 'Decision not found' });
    await DecisionJournal.deleteOne({ _id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.getDecisionTrailHandler = async (req, res, next) => {
  try {
    const { refType, refId } = req.params;
    const trail = await getDecisionTrail(refType, refId);
    res.json(trail);
  } catch (e) { next(e); }
};

exports.getProjectDejaVuHandler = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.includes(req.params.id)) {
      return res.status(403).json({ message: 'Project not in your domain' });
    }
    const result = await getProjectDejaVu(req.params.id, req.user.domain);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getPatternDetectionHandler = async (req, res, next) => {
  try {
    const patterns = await getPatternDetection(req.user.domain);
    res.json(patterns);
  } catch (e) { next(e); }
};


exports.searchDejaVu = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ projects: [], decisions: [] });
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [archives, decisions] = await Promise.all([
      AiAnalysis.find({
        domain: req.user.domain,
        status: 'done',
        $or: [
          { projectName: regex },
          { summary: regex },
          { features: regex },
        ],
      }).sort({ createdAt: -1 }).limit(20)
        .select('projectName projectType projectStatus analyzedMonth summary features techStack risks patterns stats keyDecisions members createdAt')
        .lean(),
      DecisionJournal.find({
        domain: req.user.domain,
        $or: [
          { decision: regex },
          { rationale: regex },
          { alternatives: regex },
          { outcome: regex },
          { tags: regex },
        ],
      }).sort({ createdAt: -1 }).limit(20)
        .populate('createdBy', 'name role')
        .lean(),
    ]);
    res.json({ projects: archives, decisions });
  } catch (e) { next(e); }
};

exports.getWorkDnaDashboard = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const projectCount = projectIds.length;
    const taskCount = await Task.countDocuments({ project: { $in: projectIds }, isActive: true });
    const decisionCount = await DecisionJournal.countDocuments({ domain: req.user.domain });
    const sprintCount = await Sprint.countDocuments({ project: { $in: projectIds } });
    const completedProjects = await Project.countDocuments({ _id: { $in: projectIds }, status: 'completed' });
    const recentDecisions = await DecisionJournal.find({ domain: req.user.domain })
      .sort({ createdAt: -1 }).limit(10)
      .populate('createdBy', 'name avatar role');
    const patterns = await getPatternDetection(req.user.domain);
    const activePatterns = patterns.filter(p => p.severity === 'high' || p.severity === 'medium');
    const recentAnalysis = await AiAnalysis.findOne({ domain: req.user.domain }).sort({ createdAt: -1 }).lean();

    res.json({
      stats: { totalProjects: projectCount, totalTasks: taskCount, totalDecisions: decisionCount, totalSprints: sprintCount, completedProjects },
      recentDecisions,
      activePatterns,
      totalPatterns: patterns.length,
      aiAnalysis: recentAnalysis || null,
    });
  } catch (e) { next(e); }
};

exports.getAnalyses = async (req, res, next) => {
  try {
    const { q } = req.query;
    let filter = { domain: req.user.domain, status: 'done' };
    if (q) {
      filter.$text = { $search: q };
    }
    const analyses = await AiAnalysis.find(filter)
      .sort({ createdAt: -1 }).limit(50)
      .select('projectName projectType projectStatus analyzedMonth summary features techStack projectDescription client repositories githubRepo documents risks patterns stats keyDecisions members createdAt').lean();
    res.json(analyses);
  } catch (e) { next(e); }
};

function extractFeatures(tasks) {
  const keywords = new Set();
  const typeMap = { task: 'Task Management', bug: 'Bug Tracking', feature: 'Feature Development', improvement: 'Improvement', epic: 'Epic Planning' };
  for (const t of tasks) {
    if (t.type && typeMap[t.type]) keywords.add(typeMap[t.type]);
    const title = (t.title || '').toLowerCase();
    if (title.includes('auth') || title.includes('login') || title.includes('user')) keywords.add('Authentication & Users');
    if (title.includes('api') || title.includes('gateway') || title.includes('integration')) keywords.add('API & Integration');
    if (title.includes('ui') || title.includes('design') || title.includes('mockup') || title.includes('navbar')) keywords.add('UI/UX Design');
    if (title.includes('pipeline') || title.includes('ci') || title.includes('cd') || title.includes('deploy')) keywords.add('CI/CD & DevOps');
    if (title.includes('dashboard') || title.includes('chart') || title.includes('analytics') || title.includes('report')) keywords.add('Analytics & Reporting');
    if (title.includes('payment') || title.includes('checkout') || title.includes('cart') || title.includes('order')) keywords.add('Payments & E-commerce');
    if (title.includes('database') || title.includes('migration') || title.includes('schema')) keywords.add('Database & Storage');
    if (title.includes('test') || title.includes('qa') || title.includes('quality')) keywords.add('Testing & QA');
    if (title.includes('permission') || title.includes('role') || title.includes('security')) keywords.add('Security & Permissions');
    if (title.includes('email') || title.includes('notification') || title.includes('push')) keywords.add('Notifications & Email');
    if (title.includes('content') || title.includes('campaign') || title.includes('social') || title.includes('marketing')) keywords.add('Content & Marketing');
    if (title.includes('doc') || title.includes('documentation')) keywords.add('Documentation');
    if (title.includes('mobile') || title.includes('push')) keywords.add('Mobile');
  }
  return [...keywords];
}

function extractRisks(project, tasks, sprints, bugs) {
  const risks = [];
  if (project.status === 'delayed' || project.status === 'at_risk') {
    risks.push({ level: 'critical', risk: `Project is ${project.status}`, project: project.name });
  }
  const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');
  if (overdue.length > 0) {
    risks.push({ level: overdue.length > 3 ? 'critical' : 'high', risk: `${overdue.length} overdue task(s)`, project: project.name });
  }
  const openCritical = bugs.filter(b => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'closed');
  if (openCritical.length > 0) {
    risks.push({ level: 'critical', risk: `${openCritical.length} unresolved critical bug(s)`, project: project.name });
  }
  if (project.progress !== undefined && project.progress < 25 && project.status !== 'completed') {
    risks.push({ level: 'high', risk: `Low progress (${project.progress}%)`, project: project.name });
  }
  const lateSprints = sprints.filter(s => s.endDate && new Date(s.endDate) < new Date() && s.status !== 'completed');
  if (lateSprints.length > 0) {
    risks.push({ level: 'medium', risk: `${lateSprints.length} sprint(s) overdue`, project: project.name });
  }
  return risks;
}

function extractPatterns(project, tasks, sprints, bugs) {
  const patterns = [];
  if (tasks.length > 0) {
    const done = tasks.filter(t => t.status === 'done').length;
    const rate = Math.round((done / tasks.length) * 100);
    if (rate >= 80) patterns.push({ title: 'High Completion Rate', detail: `${rate}% of tasks completed`, severity: 'low', recommendation: 'Maintain current velocity' });
    else if (rate < 50) patterns.push({ title: 'Low Task Completion', detail: `Only ${rate}% of tasks done`, severity: 'high', recommendation: 'Review team capacity and deadlines' });
  }
  if (sprints.length > 0) {
    const completedSprints = sprints.filter(s => s.status === 'completed').length;
    patterns.push({ title: 'Sprint Cadence', detail: `${completedSprints}/${sprints.length} sprints completed`, severity: 'medium', recommendation: completedSprints < sprints.length ? 'Focus on closing active sprints' : 'Good sprint discipline' });
  }
  if (bugs.length > 3) {
    patterns.push({ title: 'Bug Density', detail: `${bugs.length} bugs reported`, severity: 'medium', recommendation: 'Consider code review and testing improvements' });
  }
  if (project.status === 'completed') {
    patterns.push({ title: 'Project Delivered', detail: 'Project completed successfully', severity: 'low', recommendation: 'Conduct retrospective' });
  }
  return patterns;
}

function generateSummary(project, tasks, features, risks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  const riskWords = risks.filter(r => r.level === 'critical' || r.level === 'high').length;
  let summary = `${project.name}: ${project.status} ${project.projectType} project`;
  if (total > 0) summary += ` with ${rate}% task completion (${done}/${total})`;
  if (riskWords > 0) summary += `, ${riskWords} active risk(s)`;
  if (features.length > 0) summary += ` covering ${features.slice(0, 3).join(', ')}`;
  summary += '.';
  return summary;
}

exports.analyzeAllProjects = async (req, res, next) => {
  try {
    const domain = req.user.domain;
    const Resource = require('../models/Resource');
    const projects = await Project.find({ domain, isActive: true }).select('name description client projectType status phase progress deadline members techStack repositories githubRepo settings').lean();

    if (projects.length === 0) return res.json({ message: 'No active projects found', count: 0, existing: 0 });

    const month = new Date().toISOString().slice(0, 7);
    let analyzed = 0;
    let existingCount = 0;

    for (const p of projects) {
      const existing = await AiAnalysis.findOne({ projectId: p._id, analyzedMonth: month, domain }).lean();
      if (existing) { existingCount++; continue; }

      const tasks = await Task.find({ project: p._id }).populate('project', 'name').sort({ createdAt: -1 }).limit(200).lean();
      const sprints = await Sprint.find({ project: p._id }).populate('project', 'name').sort({ createdAt: -1 }).limit(100).lean();
      const bugs = await Bug.find({ project: p._id }).populate('project', 'name').sort({ createdAt: -1 }).limit(100).lean();
      const decisions = await DecisionJournal.find({ project: p._id }).populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100).lean();

      const resources = await Resource.find({ project: p._id }).sort({ createdAt: -1 }).limit(20).lean();
      const members = await User.find({ _id: { $in: p.members || [] } }).select('name role avatar').lean();
      const totalTasks = tasks.length;
      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length;

      const features = extractFeatures(tasks);
      const risks = extractRisks(p, tasks, sprints, bugs);
      const patterns = extractPatterns(p, tasks, sprints, bugs);
      const summary = generateSummary(p, tasks, features, risks);

      const techStack = [...new Set(tasks.filter(t => t.title).map(t => {
        const title = t.title.toLowerCase();
        if (title.includes('react') || title.includes('frontend') || title.includes('ui')) return 'React/Frontend';
        if (title.includes('node') || title.includes('api') || title.includes('backend')) return 'Node.js/API';
        if (title.includes('database') || title.includes('mongo') || title.includes('sql')) return 'Database';
        if (title.includes('mobile') || title.includes('app')) return 'Mobile';
        if (title.includes('python') || title.includes('script')) return 'Python/Scripting';
        if (title.includes('docker') || title.includes('deploy') || title.includes('ci')) return 'DevOps';
        if (title.includes('test') || title.includes('qa')) return 'Testing';
        return null;
      }).filter(Boolean))];

      const projectTech = [...new Set([...(p.techStack || []), ...techStack])];
      await AiAnalysis.create({
        projectId: p._id,
        projectName: p.name,
        projectType: p.projectType,
        projectStatus: p.status,
        domain,
        status: 'done',
        analyzedMonth: month,
        summary,
        features,
        techStack: projectTech,
        projectDescription: p.description || '',
        client: p.client || '',
        repositories: p.repositories || [],
        githubRepo: p.githubRepo || '',
        documents: resources.map(r => ({ title: r.title, type: r.type, url: r.url, fileUrl: r.fileUrl, fileType: r.fileType, fileName: r.fileName })),
        technicalUrls: {
          frontendRepo: p.settings?.frontendRepo || '',
          backendRepo: p.settings?.backendRepo || '',
          databaseRepo: p.settings?.databaseRepo || '',
          mobileRepo: p.settings?.mobileRepo || '',
          apiDocsUrl: p.settings?.apiDocsUrl || '',
          stagingUrl: p.settings?.stagingUrl || '',
          productionUrl: p.settings?.productionUrl || '',
        },
        risks,
        patterns,
        members: members.map(m => ({ userId: m._id, name: m.name, role: m.role, avatar: m.avatar })),
        keyDecisions: decisions.slice(0, 10).map(d => ({ decision: d.decision, rationale: d.rationale, outcome: d.outcome, tags: d.tags, by: d.createdBy?.name })),
        stats: {
          totalTasks, doneTasks, overdueTasks,
          totalSprints: sprints.length,
          totalBugs: bugs.length,
          totalDecisions: decisions.length,
        },
        snapshotData: {
          tasks: tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, type: t.type, deadline: t.deadline, project: t.project?.name })),
          sprints: sprints.map(s => ({ name: s.name, status: s.status, start: s.startDate, end: s.endDate, project: s.project?.name })),
          bugs: bugs.map(b => ({ title: b.title, severity: b.severity, status: b.status, project: b.project?.name })),
          decisions: decisions.map(d => ({ decision: d.decision, outcome: d.outcome, tags: d.tags, by: d.createdBy?.name })),
        },
      });
      analyzed++;
    }

    const total = analyzed > 0
      ? `🧬 Analyzed ${analyzed} projects for ${month}${existingCount > 0 ? ` (${existingCount} already archived)` : ''}`
      : `📦 ${existingCount} projects already archived for ${month}`;
    res.json({ message: total, count: analyzed, existing: existingCount });
  } catch (e) { next(e); }
};
