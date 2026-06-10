const Bug = require('../models/Bug');
const TestCase = require('../models/TestCase');
const Task = require('../models/Task');
const ProjectInterest = require('../models/ProjectInterest');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { getDomainProjectIds } = require('../config/planLimits');

function getIO() {
  return require('../app').io;
}

const SEVERITY_MAP = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

exports.getBugs = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds } };
    if (req.query.projectId) filter.project = req.query.projectId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    const bugs = await Bug.find(filter)
      .populate('testCase', 'testCaseId title')
      .populate('task', 'title')
      .populate('sprint', 'name')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(bugs);
  } catch (e) { next(e); }
};

exports.getBugById = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const bug = await Bug.findOne({ _id: req.params.id, project: { $in: projectIds } })
      .populate('testCase', 'testCaseId title description steps')
      .populate('task', 'title status')
      .populate('sprint', 'name')
      .populate('assignee', 'name email avatar role')
      .populate('reporter', 'name email avatar');
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    res.json(bug);
  } catch (e) { next(e); }
};

exports.autoCreateBugFromTestFailure = async (testCase, executedBy) => {
  try {
    const tc = await TestCase.findById(testCase._id || testCase).populate('project', 'name');
    if (!tc) return null;
    const task = tc.linkedTask ? await Task.findById(tc.linkedTask) : null;
    const severity = tc.priority === 'critical' ? 'critical'
      : tc.priority === 'high' ? 'high'
      : tc.priority === 'medium' ? 'medium' : 'low';
    const bug = await Bug.create({
      title: `[Test Fail] ${tc.title}`,
      description: `Auto-created from failed test case ${tc.testCaseId}\n\n${tc.description || ''}`,
      severity,
      status: 'open',
      testCase: tc._id,
      task: task?._id,
      feature: tc.feature,
      sprint: tc.sprint,
      project: tc.project,
      stepsToReproduce: tc.steps?.map(s => s.description) || [],
      expectedBehavior: tc.expectedResult || '',
      actualBehavior: tc.failureReason || 'Test failed during execution',
      assignee: task?.assignee || tc.assignee,
      reporter: executedBy,
    });
    tc.linkedBug = bug._id;
    await tc.save();

    if (task?.assignee) {
      await Notification.create({
        user: task.assignee, domain: tc.project?.domain || tc.domain, type: 'error',
        title: `Bug created from test failure: ${tc.testCaseId}`,
        message: `Bug #${bug._id} severity ${severity} — ${tc.title}`,
        link: `/projects/${tc.project}/test-cases`,
      }).catch(() => {});
    }

    const io = getIO();
    if (io) io.to(`project:${tc.project}`).emit('bug:created', { bug, testCaseId: tc.testCaseId });

    await Activity.create({
      user: executedBy, domain: tc.domain, type: 'task_update', source: 'internal',
      description: `Auto-created bug from test failure: ${tc.testCaseId} -> Bug #${bug._id}`,
      metadata: { testCaseId: tc._id, bugId: bug._id, projectId: tc.project },
    });

    return bug;
  } catch (e) {
    console.error('Auto-create bug error:', e.message);
    return null;
  }
};

exports.resolveBug = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    bug.status = 'closed';
    bug.resolvedAt = new Date();
    bug.resolutionNotes = resolutionNotes || 'Resolved';
    await bug.save();
    if (bug.testCase) {
      await TestCase.findByIdAndUpdate(bug.testCase, { $set: { status: 'retesting' } });
    }
    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: `Bug resolved: #${bug._id} — ${bug.title}`,
      metadata: { bugId: bug._id, projectId: bug.project },
    });
    const io = getIO();
    if (io) io.to(`project:${bug.project}`).emit('bug:resolved', { bugId: bug._id });
    const populated = await Bug.findById(bug._id)
      .populate('testCase', 'testCaseId title')
      .populate('assignee', 'name email avatar');
    res.json(populated);
  } catch (e) { next(e); }
};

exports.reopenBug = async (req, res, next) => {
  try {
    const { failureReason } = req.body;
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    const sevOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    let nextSev = bug.severity;
    if (sevOrder[bug.severity] < 3) {
      nextSev = Object.keys(sevOrder).find(k => sevOrder[k] === sevOrder[bug.severity] + 1) || bug.severity;
    }
    bug.status = 'reopened';
    bug.severity = nextSev;
    bug.retestCount = (bug.retestCount || 0) + 1;
    bug.resolvedAt = undefined;
    bug.resolutionNotes = '';
    if (failureReason) bug.actualBehavior = failureReason;
    await bug.save();
    if (bug.testCase) {
      await TestCase.findByIdAndUpdate(bug.testCase, { $set: { status: 'failed', failureReason: failureReason || 'Retest failed' } });
    }
    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: `Bug reopened (severity escalated to ${nextSev}): #${bug._id} — ${bug.title}`,
      metadata: { bugId: bug._id, projectId: bug.project },
    });
    const io = getIO();
    if (io) io.to(`project:${bug.project}`).emit('bug:reopened', { bugId: bug._id, severity: nextSev });
    const populated = await Bug.findById(bug._id)
      .populate('testCase', 'testCaseId title')
      .populate('assignee', 'name email avatar');
    res.json(populated);
  } catch (e) { next(e); }
};

exports.triggerRetest = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    if (bug.status !== 'closed') return res.status(400).json({ message: 'Bug must be resolved before retesting' });
    bug.status = 'in_progress';
    await bug.save();
    if (bug.testCase) {
      const tc = await TestCase.findByIdAndUpdate(bug.testCase, { $set: { status: 'retesting' } }, { new: true });
      if (tc) {
        bug.stepsToReproduce = tc.steps?.map(s => s.description) || bug.stepsToReproduce;
        bug.expectedBehavior = tc.expectedResult || bug.expectedBehavior;
      }
    }
    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: `Bug retest triggered: #${bug._id} — ${bug.title}`,
      metadata: { bugId: bug._id, projectId: bug.project },
    });
    res.json({ message: 'Retest triggered', bug });
  } catch (e) { next(e); }
};

exports.updateBug = async (req, res, next) => {
  try {
    const allowed = ['severity', 'assignee', 'status', 'description', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior', 'screenshot', 'environment', 'resolutionNotes'];
    const changes = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) changes[f] = req.body[f]; });
    const bug = await Bug.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true })
      .populate('testCase', 'testCaseId title')
      .populate('assignee', 'name email avatar');
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    const io = getIO();
    if (io) io.to(`project:${bug.project}`).emit('bug:updated', { bugId: bug._id });
    res.json(bug);
  } catch (e) { next(e); }
};

exports.getBugStats = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds } };
    if (req.params.projectId) filter.project = req.params.projectId;
    const bugs = await Bug.find(filter);
    const total = bugs.length;
    const open = bugs.filter(b => b.status === 'open').length;
    const inProgress = bugs.filter(b => b.status === 'in_progress').length;
    const fixed = bugs.filter(b => b.status === 'fixed').length;
    const closed = bugs.filter(b => b.status === 'closed').length;
    const reopened = bugs.filter(b => b.status === 'reopened').length;
    const critical = bugs.filter(b => b.severity === 'critical').length;
    const high = bugs.filter(b => b.severity === 'high').length;
    res.json({ total, open, inProgress, fixed, closed, reopened, critical, highSeverity: high });
  } catch (e) { next(e); }
};
