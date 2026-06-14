const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TestCase = require('../models/TestCase');
const TestingItem = require('../models/TestingItem');
const Resource = require('../models/Resource');
const Activity = require('../models/Activity');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const ReportDraft = require('../models/ReportDraft');
const Report = require('../models/Report');

const CLIENT_SECTIONS = [
  { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
  { key: 'key_achievements', title: 'Key Achievements', visible: true, order: 1 },
  { key: 'challenges', title: 'Challenges & Solutions', visible: true, order: 2 },
  { key: 'screenshots', title: 'Screenshots / Demo', visible: true, order: 3 },
  { key: 'team', title: 'Team Acknowledgment', visible: true, order: 4 },
  { key: 'client_feedback', title: 'Client Feedback', visible: true, order: 5 },
  { key: 'next_steps', title: 'Next Steps', visible: true, order: 6 },
  { key: 'thank_you', title: 'Thank You Note', visible: true, order: 7 },
];

const ADMIN_SECTIONS = [
  { key: 'executive_summary', title: 'Executive Summary', visible: true, order: 0 },
  { key: 'technical_details', title: 'Technical Details', visible: true, order: 1 },
  { key: 'performance_metrics', title: 'Performance Metrics', visible: true, order: 2 },
  { key: 'issues_blockers', title: 'Issues & Blockers', visible: true, order: 3 },
  { key: 'lessons_learned', title: 'Lessons Learned', visible: true, order: 4 },
  { key: 'recommendations', title: 'Recommendations', visible: true, order: 5 },
];

async function buildAutoContent(projectId, type) {
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

  const activities = await Activity.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'name email')
    .lean();

  const members = await ProjectMember.find({ project: projectId, status: 'active' })
    .populate('user', 'name email role avatar')
    .lean();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const sprintVelocity = sprints.length > 0
    ? Math.round(sprints.reduce((s, sp) => s + (sp.tasks || []).length, 0) / sprints.length)
    : 0;
  const testPassRate = testCases.length > 0
    ? Math.round((testCases.filter(tc => tc.status === 'passed').length / testCases.length) * 100)
    : 0;
  const bugs = tasks.filter(t => t.type === 'bug' || t.tags?.includes('bug'));
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const teamList = members.map(m => m.user?.name || 'Unknown').join(', ');

  return {
    project: { name: project.name, type: project.type, description: project.description, progress: project.progress || completionPct, phase: project.phase, status: project.status },
    tasks: { total: totalTasks, done: doneTasks, completionPct, byStatus: { todo: tasks.filter(t => t.status === 'todo').length, inProgress: tasks.filter(t => t.status === 'in_progress').length, done: doneTasks, blocked: blockedTasks.length } },
    sprints: { count: sprints.length, velocity: sprintVelocity },
    testing: { total: testCases.length, passRate: testPassRate, bugs: bugs.length, testingItems: testingItems.length },
    team: teamList,
    recentActivity: activities.slice(0, 5).map(a => ({ user: a.user?.name || 'Unknown', action: a.description, date: a.createdAt })),
  };
}

function generateSectionContent(key, autoData, type) {
  const p = autoData.project;
  const t = autoData.tasks;
  switch (key) {
    case 'executive_summary':
      return `<p>Project <strong>${p.name}</strong> (${p.type || 'N/A'}) is currently in the <strong>${p.phase || 'active'}</strong> phase with <strong>${p.progress}%</strong> completion. Total tasks: ${t.total}, completed: ${t.done} (${t.completionPct}%).</p>`;
    case 'team':
      return `<p>Team members: ${autoData.team}</p>`;
    case 'technical_details':
      return `<p><strong>Project:</strong> ${p.name}<br><strong>Type:</strong> ${p.type || 'N/A'}<br><strong>Phase:</strong> ${p.phase || 'N/A'}<br><strong>Tasks:</strong> ${t.total} total, ${t.done} completed<br><strong>Sprint Velocity:</strong> ${autoData.sprints.velocity} tasks/sprint<br><strong>Test Pass Rate:</strong> ${autoData.testing.passRate}%</p>`;
    case 'performance_metrics':
      return `<p><strong>Completion:</strong> ${t.completionPct}%<br><strong>Sprint Velocity:</strong> ${autoData.sprints.velocity} tasks/sprint<br><strong>Test Pass Rate:</strong> ${autoData.testing.passRate}%<br><strong>Bugs:</strong> ${autoData.testing.bugs}<br><strong>Blocked Tasks:</strong> ${t.byStatus.blocked}</p>`;
    case 'issues_blockers':
      return `<p>Blocked tasks: ${t.byStatus.blocked}. Bugs found: ${autoData.testing.bugs}. Testing items: ${autoData.testing.testingItems}.</p>`;
    case 'next_steps':
      return `<p>Remaining tasks: ${t.byStatus.todo + t.byStatus.inProgress}. Continue sprint planning and address blocked items.</p>`;
    default:
      return '<p></p>';
  }
}

exports.getDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    let draft = await ReportDraft.findOne({ project: id, type }).lean();
    const autoData = await buildAutoContent(id, type);

    if (!draft) {
      const sections = (type === 'admin' ? ADMIN_SECTIONS : CLIENT_SECTIONS).map(s => ({
        ...s,
        content: generateSectionContent(s.key, autoData, type),
      }));
      return res.json({ draft: null, autoData, sections });
    }

    return res.json({ draft, autoData, sections: null });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, sections } = req.body;
    if (!type || !sections) return res.status(400).json({ message: 'type and sections required' });

    let draft = await ReportDraft.findOne({ project: id, type });
    if (draft) {
      draft.sections = sections;
      draft.version += 1;
    } else {
      draft = new ReportDraft({ project: id, type, sections, createdBy: req.user._id });
    }
    await draft.save();
    res.json(draft);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.saveCustomReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, sections } = req.body;
    if (!type || !sections) return res.status(400).json({ message: 'type and sections required' });

    const autoData = await buildAutoContent(id, type);
    if (!autoData.project) return res.status(404).json({ message: 'Project not found' });

    const reportData = {
      ...autoData,
      customSections: sections.filter(s => s.visible),
      edited: true,
    };

    let report = await Report.findOne({ project: id, type });
    if (report) {
      report.data = reportData;
      report.generatedBy = req.user._id;
      report.generatedAt = new Date();
    } else {
      report = new Report({ project: id, type, data: reportData, generatedBy: req.user._id });
    }
    await report.save();

    const ReportDraft = require('../models/ReportDraft');
    await ReportDraft.findOneAndUpdate(
      { project: id, type },
      { project: id, type, sections, createdBy: req.user._id, version: 1 },
      { upsert: true }
    );

    res.json({ report: { _id: report._id, type: report.type }, message: 'Report saved' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.generateCustomPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, sections } = req.body;
    if (!type || !sections) return res.status(400).json({ message: 'type and sections required' });

    const autoData = await buildAutoContent(id, type);
    const project = await Project.findById(id).select('name').lean();

    res.json({
      projectName: project?.name || 'Project',
      type,
      sections: sections.filter(s => s.visible),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
