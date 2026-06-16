const Bug = require('../models/Bug');
const TestCase = require('../models/TestCase');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectInterest = require('../models/ProjectInterest');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { getDomainProjectIds } = require('../config/planLimits');

function getIO() {
  const { getIO } = require('../socket/ioProvider');
  return getIO();
}

const SEVERITY_MAP = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

exports.getBugs = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds } };
    if (req.query.projectId) filter.project = req.query.projectId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.assignee) filter.assignee = req.query.assignee;
    const bugs = await Bug.find(filter)
      .populate('testCase', 'testCaseId title')
      .populate('task', 'title status')
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

exports.autoCreateBugFromTestFailure = async (testCaseId, executedBy, popupData = {}) => {
  try {
    const tc = await TestCase.findById(testCaseId).populate('project', 'name domain');
    if (!tc) return null;
    const task = tc.linkedTask ? await Task.findById(tc.linkedTask) : null;
    const severity = popupData.severity || (tc.priority === 'critical' ? 'critical'
      : tc.priority === 'high' ? 'high'
      : tc.priority === 'medium' ? 'medium' : 'low');
    const failedStep = (tc.steps || []).find(s => s.status === 'fail');
    const bugTitle = task
      ? `Bug: ${task.title} — ${tc.testCaseId}`
      : `Bug: ${tc.title} — ${tc.testCaseId}`;
    const bug = await Bug.create({
      title: bugTitle,
      description: popupData.bugDescription || `Test case ${tc.testCaseId} failed.\n\n${tc.description || ''}`,
      severity,
      status: 'open',
      testCase: tc._id,
      task: task?._id,
      feature: tc.feature,
      sprint: tc.sprint,
      project: tc.project,
      stepsToReproduce: tc.steps?.map(s => `Step ${s.order}: ${s.description}`) || [],
      expectedBehavior: failedStep?.expectedResult || tc.description || '',
      actualBehavior: popupData.actualResult || failedStep?.actualResult || tc.failureReason || 'Test failed during execution',
      screenshot: popupData.screenshot || '',
      environment: popupData.environment || '',
      assignee: task?.assignee || tc.assignee,
      reporter: executedBy,
    });
    tc.linkedBug = bug._id;
    tc.bugCount = (tc.bugCount || 0) + 1;
    await tc.save();

    // Notifications
    const recipients = [];
    if (task?.assignee) recipients.push(task.assignee);
    if (tc.assignee && !recipients.some(r => r.toString() === tc.assignee.toString())) recipients.push(tc.assignee);
    const User = require('../models/User');
    const pmUsers = await User.find({ role: { $in: ['admin', 'project_manager'] }, domain: tc.project?.domain, _id: { $nin: recipients } }).select('_id');
    pmUsers.forEach(u => { if (!recipients.some(r => r.toString() === u._id.toString())) recipients.push(u._id); });
    if (recipients.length) {
      const notifDocs = recipients.map(user => ({
        user, domain: tc.project?.domain,
        type: 'task_assigned',
        title: `🐛 Bug Reported: ${bugTitle}`,
        message: `Severity: ${severity} — ${popupData.bugDescription || tc.failureReason || 'Test failed'}`,
        link: `/projects/${tc.project}?tab=bugs`,
      }));
      const notifs = await Notification.insertMany(notifDocs);
      const io = getIO();
      notifs.forEach(n => { try { io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} });
    }

    await Activity.create({
      user: executedBy, domain: tc.project?.domain, type: 'task_update', source: 'internal',
      description: `Bug created from test failure: ${tc.testCaseId} -> ${bugTitle}`,
      metadata: { testCaseId: tc._id, bugId: bug._id, projectId: tc.project },
    });

    const io = getIO();
    if (io) {
      io.to(`project:${tc.project}`).emit('bug:created', { bug, testCaseId: tc.testCaseId });
      io.to(`project:${tc.project}`).emit('test_case_updated', await TestCase.findById(tc._id).populate('assignee', 'name email avatar').populate('project', 'name').populate('linkedTask', 'title status'));
    }
    return bug;
  } catch (e) {
    console.error('Auto-create bug error:', e.message);
    return null;
  }
};

exports.resolveBug = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const bug = await Bug.findById(req.params.id).populate('testCase').populate('project', 'domain');
    if (!bug) return res.status(404).json({ message: 'Bug not found' });
    bug.status = 'fixed';
    bug.resolvedAt = new Date();
    bug.resolutionNotes = resolutionNotes || 'Resolved';
    await bug.save();

    // Notify the bug's assignee (developer)
    if (bug.assignee) {
      const Notification = require('../models/Notification');
      const notif = await Notification.create({
        user: bug.assignee,
        domain: bug.project?.domain,
        type: 'status_change',
        title: `🐛 Bug assigned to you: ${bug.title}`,
        message: `Bug Bug-${bug._id.toString().slice(-4).toUpperCase()} has been marked as resolved. Please review and fix the issue, then mark the linked task as done to trigger retest.`,
        link: `/projects/${bug.project}?tab=test-cases`,
        metadata: { bugId: bug._id, projectId: bug.project },
      });
    }

    // Reset test case steps for retest
    if (bug.testCase) {
      const tc = await TestCase.findById(bug.testCase._id);
      if (tc) {
        tc.status = 'retesting';
        tc.retestRequired = true;
        tc.failureReason = '';
        for (const step of tc.steps) {
          step.historical = true;
          step.status = 'not_tested';
          step.actualResult = '';
          step.evidence = '';
        }
        tc.linkedBug = undefined;
        await tc.save();

        // Notify QA team
        const User = require('../models/User');
        const qaUsers = await User.find({ role: { $in: ['qa_tester', 'admin'] }, domain: bug.project?.domain || tc.project?.domain }).select('_id');
        if (qaUsers.length) {
          const notifDocs = qaUsers.map(user => ({
            user, domain: bug.project?.domain || tc.project?.domain,
            type: 'status_change',
            title: `🔄 Retest Required: ${tc.testCaseId}`,
            message: `Bug ${bug._id} was resolved. Test ${tc.testCaseId} is ready for retest.`,
            link: `/projects/${tc.project}?tab=test-cases&tcId=${tc._id}`,
            metadata: { testCaseId: tc._id, bugId: bug._id },
          }));
          const notifs = await Notification.insertMany(notifDocs);
          const io = getIO();
          notifs.forEach(n => { try { io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} });
        }

        const io = getIO();
        if (io) {
          io.to(`project:${tc.project}`).emit('test_case_updated', tc);
          io.to(`project:${tc.project}`).emit('bug:resolved', { bugId: bug._id, testCaseId: tc._id });
      }

      // Update linked task status to in_progress
      const linkedTaskId = bug.task || tc.linkedTask;
      if (linkedTaskId) {
        try {
          const TaskModel = require('../models/Task');
          await TaskModel.findByIdAndUpdate(linkedTaskId, { status: 'in_progress' });
        } catch (e) { console.error('Failed to update linked task status:', e.message); }
      }
    }
    }

    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: `Bug resolved: Bug-${bug._id.toString().slice(-4).toUpperCase()} — ${bug.title}`,
      metadata: { bugId: bug._id, projectId: bug.project },
    });

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

exports.createBug = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id.toString() === req.body.project)) {
      return res.status(403).json({ message: 'Project not in your domain' });
    }
    const bugData = {
      title: req.body.title,
      description: req.body.description || '',
      severity: req.body.severity || 'medium',
      status: 'open',
      testCase: req.body.testCase || undefined,
      task: req.body.task || undefined,
      feature: req.body.feature || '',
      sprint: req.body.sprint || undefined,
      project: req.body.project,
      stepsToReproduce: req.body.stepsToReproduce || [],
      expectedBehavior: req.body.expectedBehavior || '',
      actualBehavior: req.body.actualBehavior || '',
      screenshot: req.body.screenshot || '',
      environment: req.body.environment || '',
      assignee: req.body.assignee || undefined,
      reporter: req.user._id,
    };
    const bug = await Bug.create(bugData);
    const populated = await Bug.findById(bug._id)
      .populate('testCase', 'testCaseId title')
      .populate('task', 'title')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar');

    res.status(201).json(populated);

    // Non-blocking post-creation tasks
    try {
      const proj = await Project.findById(bug.project).select('members');
      if (proj) {
        const recipients = [];
        if (bug.assignee) recipients.push(bug.assignee);
        const otherMembers = proj.members.filter(m =>
          !recipients.some(r => r.toString() === m.toString())
        );
        otherMembers.forEach(m => recipients.push(m));
        if (recipients.length) {
          const notifDocs = recipients.map(user => ({
            user, domain: req.user.domain,
            type: 'task_assigned',
            title: `🐛 Bug Reported: ${bug.title}`,
            message: `Severity: ${bug.severity} — ${bug.description || 'Bug reported'}`,
            link: `/projects/${bug.project}?tab=bugs`,
            metadata: { bugId: bug._id, projectId: bug.project },
          }));
          const notifs = await Notification.insertMany(notifDocs);
          const io = getIO();
          notifs.forEach(n => { try { io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} });
        }
      }

      await Activity.create({
        user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
        description: `Bug reported: ${bug.title}`,
        metadata: { bugId: bug._id, projectId: bug.project },
      });

      const io = getIO();
      if (io) io.to(`project:${bug.project}`).emit('bug:created', { bug: populated, testCaseId: req.body.testCase ? null : undefined });
    } catch (e) {
      console.error('Post-bug-creation tasks failed:', e.message);
    }
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
