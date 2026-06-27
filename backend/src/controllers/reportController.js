const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TestCase = require('../models/TestCase');
const TestingItem = require('../models/TestingItem');
const Resource = require('../models/Resource');
const Activity = require('../models/Activity');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const Report = require('../models/Report');
const AiAnalysis = require('../models/AiAnalysis');
const DecisionJournal = require('../models/DecisionJournal');
const Bug = require('../models/Bug');
const { getDomainProjectIds } = require('../config/planLimits');

function computePhaseDuration(project, phaseList) {
  if (!project.launchedAt && !project.deliveredAt) return 0;
  const start = project.startDate || project.createdAt;
  const end = project.deliveredAt || project.launchedAt || new Date();
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
}

async function buildReportData(projectId, type) {
  const project = await Project.findById(projectId)
    .populate('members', 'name email role avatar')
    .lean();
  if (!project) throw new Error('Project not found');

  const tasks = await Task.find({ project: projectId, isActive: { $ne: false } })
    .populate('assignee', 'name email role')
    .lean();

  const sprints = await Sprint.find({ project: projectId })
    .populate({ path: 'tasks', select: 'title status priority estimatedHours loggedHours' })
    .lean();

  const testCases = await TestCase.find({ project: projectId, isActive: { $ne: false } })
    .populate('assignee', 'name email')
    .lean();

  const testingItems = await TestingItem.find({ project: projectId })
    .populate('assignee', 'name email')
    .lean();

  const resources = await Resource.find({ project: projectId }).lean();

  const activities = await Activity.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'name email')
    .lean();

  const members = await ProjectMember.find({ project: projectId, status: 'active' })
    .populate('user', 'name email role avatar')
    .lean();

  const latestAnalysis = await AiAnalysis.findOne({ projectId })
    .sort({ createdAt: -1 })
    .select('features techStack keyDecisions summary risks projectDescription documents technicalUrls')
    .lean();

  const keyDecisions = await DecisionJournal.find({ project: projectId })
    .sort({ createdAt: -1 })
    .select('decision alternatives rationale outcome tags createdBy')
    .populate('createdBy', 'name')
    .lean();

  const bugs = await Bug.find({ project: projectId })
    .sort({ createdAt: -1 })
    .select('title severity status feature resolutionNotes')
    .lean();

  const settings = project.settings || {};

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const delayedTasks = tasks.filter(t => t.status === 'delayed').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
  const totalLogged = tasks.reduce((s, t) => s + (t.loggedHours || 0), 0);

  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length;

  const tcTotal = testCases.length;
  const tcPassed = testCases.filter(tc => tc.status === 'passed').length;
  const tcFailed = testCases.filter(tc => tc.status === 'failed').length;
  const tcBlocked = testCases.filter(tc => tc.status === 'blocked').length;
  const tcInProgress = testCases.filter(tc => ['in_progress', 'ready'].includes(tc.status)).length;
  const tcPassRate = tcTotal > 0 ? Math.round((tcPassed / tcTotal) * 100) : 0;

  const tiTotal = testingItems.length;
  const tiPassed = testingItems.filter(ti => ti.status === 'passed').length;

  const activeSprints = sprints.filter(s => s.status === 'active');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  const sprintVelocity = completedSprints.map(s => {
    const sprintTasks = (s.tasks || []).filter(t => t.status === 'done');
    return { name: s.name, done: sprintTasks.length, total: (s.tasks || []).length };
  });

  const taskByPriority = {
    urgent: tasks.filter(t => t.priority === 'urgent' || t.priority === 'critical').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  const taskByAssignee = {};
  for (const t of tasks) {
    const name = t.assignee?.name || 'Unassigned';
    if (!taskByAssignee[name]) taskByAssignee[name] = { name, total: 0, done: 0, inProgress: 0, estimated: 0, logged: 0 };
    taskByAssignee[name].total++;
    taskByAssignee[name].estimated += t.estimatedHours || 0;
    taskByAssignee[name].logged += t.loggedHours || 0;
    if (t.status === 'done') taskByAssignee[name].done++;
    if (t.status === 'in_progress') taskByAssignee[name].inProgress++;
  }

  const memberList = members.map(m => ({
    name: m.user?.name || 'Unknown',
    email: m.user?.email || '',
    role: m.projectRole || m.user?.role || '',
  }));

  const tcByType = {
    integration: testCases.filter(tc => tc.type === 'integration').length,
    unit: testCases.filter(tc => tc.type === 'unit').length,
    e2e: testCases.filter(tc => tc.type === 'e2e').length,
    manual: testCases.filter(tc => tc.type === 'manual').length,
    security: testCases.filter(tc => tc.type === 'security').length,
    performance: testCases.filter(tc => tc.type === 'performance').length,
  };

  const phaseOrder = getPhaseOrder(project.projectType);
  const currentPhaseIndex = phaseOrder.indexOf(project.phase);
  const totalPhases = phaseOrder.length;
  const phaseProgress = totalPhases > 0 ? Math.round(((currentPhaseIndex + 1) / totalPhases) * 100) : 0;

  const baseData = {
    generatedAt: new Date(),
    project: {
      name: project.name,
      type: project.projectType,
      description: project.description,
      status: project.status,
      phase: project.phase,
      progress: project.progress,
      startDate: project.startDate || project.createdAt,
      deadline: project.deadline,
      launchedAt: project.launchedAt,
      deliveredAt: project.deliveredAt,
      deliveryNotes: project.deliveryNotes || '',
      client: project.client || settings.clientName || '',
      duration: computePhaseDuration(project, phaseOrder),
      repositories: project.repositories || [],
      healthNotes: settings.healthNotes || '',
    },
    tasks: {
      total: totalTasks,
      done: doneTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      delayed: delayedTasks,
      overdue: overdueTasks,
      completionRate,
      estimatedHours: totalEstimated,
      loggedHours: totalLogged,
      byPriority: taskByPriority,
      byAssignee: Object.values(taskByAssignee),
    },
    effort: {
      estimatedHours: totalEstimated,
      loggedHours: totalLogged,
      variance: totalEstimated > 0 ? Math.round(((totalLogged - totalEstimated) / totalEstimated) * 100) : 0,
      varianceLabel: totalEstimated > 0
        ? (totalLogged > totalEstimated ? `${Math.round(((totalLogged - totalEstimated) / totalEstimated) * 100)}% over budget` : `${Math.round(((totalEstimated - totalLogged) / totalEstimated) * 100)}% under budget`)
        : 'No estimates recorded',
    },
    sprints: {
      total: sprints.length,
      active: activeSprints.length,
      completed: completedSprints.length,
      velocity: sprintVelocity,
    },
    testing: {
      total: tcTotal,
      passed: tcPassed,
      failed: tcFailed,
      blocked: tcBlocked,
      inProgress: tcInProgress,
      passRate: tcPassRate,
      byType: tcByType,
      testingItemsTotal: tiTotal,
      testingItemsPassed: tiPassed,
    },
    team: {
      totalMembers: memberList.length,
      members: memberList,
    },
    resources: resources.map(r => ({
      title: r.title,
      category: r.category,
      type: r.type,
      url: r.url || '',
      description: r.description || '',
    })),
    recentActivity: activities.slice(0, 20).map(a => ({
      user: a.user?.name || 'System',
      type: a.type,
      description: a.description,
      date: a.createdAt,
    })),
    features: latestAnalysis?.features || [],
    analysisSummary: latestAnalysis?.summary || '',
    keyDecisions: (keyDecisions?.length > 0
      ? keyDecisions.map(d => ({
          decision: d.decision,
          alternatives: d.alternatives || '',
          rationale: d.rationale || '',
          outcome: d.outcome || '',
          tags: d.tags || [],
          by: d.createdBy?.name || '',
        }))
      : (latestAnalysis?.keyDecisions || []).map(d => ({
          decision: d.decision,
          alternatives: d.alternatives || '',
          rationale: d.rationale || '',
          outcome: d.outcome || '',
          tags: d.tags || [],
          by: '',
        }))
    ),
    techStack: project.techStack || [],
    risks: settings.risks || [],
    blockers: settings.blockers || [],
    issues: settings.issues || [],
    dependencies: settings.dependencies || [],
    client: project.client || settings.clientName || '',
    technicalUrls: latestAnalysis?.technicalUrls || {},
    documents: (latestAnalysis?.documents || []).map(d => ({
      title: d.title || '',
      type: d.type || '',
      url: d.url || '',
    })),
    bugs: {
      total: bugs.length,
      open: bugs.filter(b => b.status === 'open').length,
      inProgress: bugs.filter(b => b.status === 'in_progress').length,
      fixed: bugs.filter(b => b.status === 'fixed').length,
      closed: bugs.filter(b => b.status === 'closed').length,
      items: bugs.slice(0, 20).map(b => ({
        title: b.title,
        severity: b.severity,
        status: b.status,
        feature: b.feature || '',
        resolutionNotes: b.resolutionNotes || '',
      })),
    },
  };

  if (type === 'admin') {
    return {
      ...baseData,
      reportType: 'admin',
      title: 'Project Closure Report — Admin',
      sections: [
        'executive-summary',
        'task-completion',
        'sprint-performance',
        'testing-quality',
        'team-performance',
        'effort-tracking',
        'resources',
        'activity-timeline',
        'delivery-notes',
      ],
      phaseProgress,
      allTestCases: testCases.map(tc => ({
        id: tc.testCaseId,
        title: tc.title,
        status: tc.status,
        priority: tc.priority,
        type: tc.type,
        assignee: tc.assignee?.name || '',
      })),
      allSprints: sprints.map(s => ({
        name: s.name,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        goal: s.goal,
        taskCount: (s.tasks || []).length,
      })),
    };
  }

  const featureCount = (latestAnalysis?.features || []).length;
  const decisionCount = keyDecisions.length > 0 ? keyDecisions.length : (latestAnalysis?.keyDecisions || []).length;
  const bugFixedCount = bugs.filter(b => ['fixed', 'closed'].includes(b.status)).length;
  const bugTotalCount = bugs.length;

  const phaseDescriptions = {
    discovery: { label: 'Discovery', desc: 'Requirements & research' },
    planning: { label: 'Planning', desc: 'Architecture & design planning' },
    development: { label: 'Development', desc: 'Core feature development' },
    designing: { label: 'Design', desc: 'UI/UX design' },
    prototyping: { label: 'Prototyping', desc: 'Interactive prototypes' },
    testing: { label: 'Testing', desc: 'QA & bug fixes' },
    review: { label: 'Review', desc: 'Client review & feedback' },
    launched: { label: 'Launch', desc: 'Production deployment' },
    delivered: { label: 'Delivered', desc: 'Handover complete' },
    business_growth: { label: 'Business Growth', desc: 'Growth initiatives' },
    validation: { label: 'Validation', desc: 'Market validation' },
    content_creation: { label: 'Content Creation', desc: 'Content development' },
    editing: { label: 'Editing', desc: 'Review & editing' },
    research: { label: 'Research', desc: 'Research phase' },
    analysis: { label: 'Analysis', desc: 'Data analysis' },
  };

  const effortVariance = totalEstimated > 0 ? Math.round(((totalLogged - totalEstimated) / totalEstimated) * 100) : 0;
  const avgHoursPerTask = doneTasks > 0 ? Math.round((totalLogged / doneTasks) * 10) / 10 : 0;

  return {
    ...baseData,
    reportType: 'client',
    title: 'Delivery Report — Client',
    sections: [
      'executive-summary',
      'project-overview',
      'what-was-delivered',
      'work-completed',
      'technical-details',
      'issues-resolutions',
      'testing-results',
      'deployment-info',
      'documentation',
      'training-handover',
      'support-maintenance',
      'financial-summary',
      'client-feedback',
      'next-steps',
      'appendices',
    ],
    clientSummary: (() => {
      const duration = computePhaseDuration(project, phaseOrder);
      const parts = [];
      parts.push(`${project.name} — a premier ${project.projectType || 'custom'} engagement for ${project.client || settings.clientName || 'the client'} — has been successfully completed and delivered.`);
      parts.push(`Over the course of ${duration} days, the team delivered ${doneTasks} of ${totalTasks} planned tasks, achieving a ${completionRate}% completion rate with a ${tcPassRate}% quality assurance pass rate across ${tcTotal} test scenarios.`);
      if (featureCount > 0) parts.push(`A total of ${featureCount} distinct features and modules were built, tested, and deployed.`);
      if (bugTotalCount > 0) parts.push(`${bugFixedCount} of ${bugTotalCount} identified issues were resolved throughout the development lifecycle, ensuring production readiness.`);
      if (decisionCount > 0) parts.push(`${decisionCount} strategic decisions were documented, providing full transparency into the project's evolution.`);
      if (totalLogged > 0) parts.push(`The team invested ${totalLogged} hours of engineering effort${totalEstimated > 0 ? ` against ${totalEstimated} hours estimated (${effortVariance > 0 ? `${effortVariance}% above` : `${Math.abs(effortVariance)}% below`} baseline)` : ''}.`);
      parts.push(`This report provides a detailed account of what was delivered, key milestones achieved, and recommendations for the path forward.`);
      return parts.join(' ');
    })(),
    phaseTimeline: phaseOrder.map((phase, i) => ({
      phase,
      label: phaseDescriptions[phase]?.label || phase.replace(/_/g, ' '),
      description: phaseDescriptions[phase]?.desc || '',
      index: i + 1,
      total: totalPhases,
      current: phase === project.phase,
      passed: currentPhaseIndex >= i,
      completed: currentPhaseIndex > i,
    })),
    featureCount,
    decisionCount,
    bugFixedCount,
    bugTotalCount,
    effortVariance,
    avgHoursPerTask,
    overallHealth: (() => {
      if (project.status === 'completed' || project.phase === 'delivered') return 'green';
      if (project.status === 'at_risk' || project.status === 'delayed') return 'yellow';
      if (project.status === 'blocked') return 'red';
      if (project.status === 'on_track') return 'green';
      if (delayedTasks > 0 || overdueTasks > 0) return 'yellow';
      return completionRate >= 80 ? 'green' : 'yellow';
    })(),
    keyMilestones: (() => {
      const milestones = [];
      if (featureCount > 0) milestones.push(`${featureCount} features delivered`);
      if (totalPhases > 0 && currentPhaseIndex >= totalPhases - 1) milestones.push('All phases completed');
      if (project.launchedAt) milestones.push('Production launch');
      if (project.deliveredAt) milestones.push('Project delivered');
      if (tcPassRate >= 80) milestones.push(`${tcPassRate}% test pass rate`);
      if (completionRate >= 90) milestones.push(`${completionRate}% task completion`);
      return milestones;
    })(),
  };
}

function getPhaseOrder(type) {
  const phases = {
    software: ['discovery', 'planning', 'development', 'testing', 'review', 'launched', 'delivered'],
    design: ['discovery', 'planning', 'designing', 'prototyping', 'testing', 'review', 'launched', 'delivered'],
    business: ['discovery', 'planning', 'business_growth', 'validation', 'testing', 'review', 'launched', 'delivered'],
    content: ['discovery', 'planning', 'content_creation', 'editing', 'testing', 'review', 'launched', 'delivered'],
    research: ['discovery', 'planning', 'research', 'analysis', 'testing', 'review', 'launched', 'delivered'],
  };
  return phases[type] || phases.software;
}

exports.getReportData = async (req, res) => {
  try {
    const { type } = req.query;
    if (!['admin', 'client'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "admin" or "client"' });
    }
    const data = await buildReportData(req.params.id, type);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { type } = req.body;
    if (!['admin', 'client'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "admin" or "client"' });
    }
    const data = await buildReportData(req.params.id, type);
    const dups = await Report.find({ project: req.params.id, type }).sort({ generatedAt: -1 }).lean();
    if (dups.length > 1) {
      const removeIds = dups.slice(1).map(d => d._id);
      await Report.deleteMany({ _id: { $in: removeIds } });
    }
    const report = await Report.findOneAndUpdate(
      { project: req.params.id, type },
      {
        $set: {
          data,
          generatedBy: req.user._id,
          generatedAt: new Date(),
        },
        $setOnInsert: { downloadCount: 0 },
      },
      { upsert: true, new: true }
    );
    res.status(200).json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.listReports = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const reports = await Report.find({ project: { $in: projectIds } })
      .populate('project', 'name projectType phase status')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 })
      .lean();
    res.json(reports);
  } catch (e) { next(e); }
};

exports.getReport = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const report = await Report.findOne({ _id: req.params.id, project: { $in: projectIds } })
      .populate('project', 'name projectType phase status')
      .populate('generatedBy', 'name email')
      .lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (e) { next(e); }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const report = await Report.findOneAndDelete({ _id: req.params.id, project: { $in: projectIds } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted' });
  } catch (e) { next(e); }
};

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

exports.shareReport = async (req, res) => {
  try {
    const { enabled, password, expiresInDays } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (!enabled) {
      report.shareEnabled = false;
      report.shareToken = undefined;
      report.sharePassword = undefined;
      report.shareExpiresAt = undefined;
      await report.save();
      return res.json({ message: 'Sharing disabled' });
    }

    const shareToken = crypto.randomBytes(24).toString('hex');
    report.shareToken = shareToken;
    report.shareEnabled = true;
    if (password) report.sharePassword = await bcrypt.hash(password, 10);
    if (expiresInDays) report.shareExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    await report.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.json({ url: `${baseUrl}/shared-report/${shareToken}`, token: shareToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSharedReport = async (req, res) => {
  try {
    const report = await Report.findOne({ shareToken: req.params.token, shareEnabled: true })
      .populate('project', 'name client projectType')
      .lean();
    if (!report) return res.status(404).json({ error: 'Report not found or sharing disabled' });
    if (report.shareExpiresAt && new Date(report.shareExpiresAt) < new Date()) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    if (report.sharePassword) {
      const { password } = req.query;
      if (!password) return res.status(401).json({ error: 'Password required' });
      const valid = await bcrypt.compare(password, report.sharePassword);
      if (!valid) return res.status(403).json({ error: 'Invalid password' });
    }

    res.json({
      ...report.data,
      projectName: report.project?.name || 'Project',
      _id: report._id,
      type: report.type,
      generatedAt: report.generatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShareSettings = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).select('shareEnabled shareExpiresAt').lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ enabled: report.shareEnabled, expiresAt: report.shareExpiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.countDownload = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    res.json({ downloadCount: report.downloadCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
