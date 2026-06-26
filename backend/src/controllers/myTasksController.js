const Task = require('../models/Task');
const TestCase = require('../models/TestCase');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const WorkLog = require('../models/WorkLog');
const { getDomainProjectIds } = require('../config/planLimits');

const taskPopulate = q => q
  .populate('assignee', 'name email avatar role')
  .populate('createdBy', 'name email avatar role')
  .populate('project', 'name status')
  .populate('sprint', 'name status')
  .populate('subtasks.assignee', 'name email')
  .lean();

const tcPopulate = q => q
  .populate('assignee', 'name email avatar role')
  .populate('project', 'name')
  .populate('sprint', 'name status')
  .populate('linkedTask', 'title status')
  .populate('linkedBug', 'title status')
  .populate('executedBy', 'name')
  .lean();

exports.getMyTasks = async (req, res, next) => {
  try {
    const { role } = req.user;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);

    switch (role) {
      case 'developer':
        return res.json(await devView(req.user._id, projectIds));
      case 'qa_tester':
        return res.json(await qaView(req.user._id, projectIds));
      case 'project_manager':
      case 'manager':
      case 'team_lead':
        return res.json(await pmView(req.user._id, req.user.domain, projectIds));
      case 'admin':
        return res.json(await adminView(req.user.domain));
      default:
        return res.json(await devView(req.user._id, projectIds));
    }
  } catch (e) { next(e); }
};

async function devView(userId, projectIds) {
  const activeSprints = await Sprint.find({ project: { $in: projectIds }, status: 'active' }).select('_id name project').populate('project', 'name');
  const activeSprintIds = activeSprints.map(s => s._id);

  const tasks = await taskPopulate(Task.find({
    assignee: userId, isActive: true, scope: 'project', project: { $in: projectIds },
  }).sort({ createdAt: -1 }));

  const activeSprintTasks = tasks.filter(t => t.sprint && activeSprintIds.some(s => String(s) === String(t.sprint?._id || t.sprint)));
  const bugFixes = tasks.filter(t => t.type === 'bug' && !['done', 'review'].includes(t.status));
  const completedThisSprint = activeSprintTasks.filter(t => t.status === 'done');
  const pendingReviews = tasks.filter(t => t.status === 'review');
  const otherTasks = tasks.filter(t => t.type !== 'bug' && t.status !== 'done' && t.status !== 'review' && !(t.sprint && activeSprintIds.some(s => String(s) === String(t.sprint?._id || t.sprint))));

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalHoursLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

  return {
    role: 'developer',
    view: 'My Development Tasks',
    sections: {
      activeSprintTasks,
      bugFixes,
      pendingReviews,
      completedThisSprint,
      otherTasks,
    },
    stats: {
      totalTasks, doneTasks, completionRate, totalHoursLogged,
      activeSprintCount: activeSprintTasks.length,
      bugFixCount: bugFixes.length,
      reviewCount: pendingReviews.length,
    },
    activeSprints,
  };
}

async function qaView(userId, projectIds) {
  const testCases = await tcPopulate(TestCase.find({
    assignee: userId, isActive: true, project: { $in: projectIds },
  }).sort({ createdAt: -1 }));

  const readyToRun = testCases.filter(tc => ['draft', 'auto-draft', 'ready'].includes(tc.status));
  const inProgress = testCases.filter(tc => tc.status === 'in_progress');
  const failed = testCases.filter(tc => tc.status === 'failed');
  const passed = testCases.filter(tc => tc.status === 'passed');
  const blocked = testCases.filter(tc => tc.status === 'blocked');
  const skipped = testCases.filter(tc => tc.status === 'skipped');

  const total = testCases.length;
  const passCount = passed.length;
  const failCount = failed.length;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return {
    role: 'qa_tester',
    view: 'My Testing Queue',
    sections: {
      readyToRun, inProgress, failed, passed, blocked, skipped,
    },
    stats: {
      total, passCount, failCount, passRate,
      readyCount: readyToRun.length,
      inProgressCount: inProgress.length,
      blockedCount: blocked.length,
    },
  };
}

async function pmView(userId, domain, projectIds) {
  const managedProjects = await Project.find({ _id: { $in: projectIds }, isActive: true }).select('name status phase');
  const managedProjectIds = managedProjects.map(p => p._id);

  const sprints = await Sprint.find({ project: { $in: managedProjectIds } })
    .populate('project', 'name')
    .populate({ path: 'tasks', populate: { path: 'assignee', select: 'name email avatar role' } })
    .sort({ createdAt: -1 });

  const tasks = await taskPopulate(Task.find({
    project: { $in: managedProjectIds }, isActive: true, scope: 'project',
  }).sort({ createdAt: -1 }));

  const members = await User.find({
    assignedProjects: { $in: managedProjectIds }, isActive: true,
  }).select('name email avatar role');

  const tasksByMember = {};
  for (const m of members) {
    tasksByMember[m._id] = {
      user: m,
      tasks: tasks.filter(t => t.assignee && String(t.assignee._id || t.assignee) === String(m._id)),
    };
  }

  const blocked = tasks.filter(t => t.status === 'blocked' || t.priority === 'blocker');
  const activeSprints = sprints.filter(s => s.status === 'active');
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    role: 'project_manager',
    view: 'Team Management',
    sections: {
      sprints: activeSprints,
      allSprints: sprints,
      tasksByMember,
      blocked,
      recentTasks: tasks.slice(0, 20),
    },
    managedProjects,
    stats: {
      totalProjects: managedProjects.length,
      totalSprints: sprints.length,
      activeSprints: activeSprints.length,
      totalTasks, doneTasks, completionRate,
      blockedCount: blocked.length,
      memberCount: members.length,
    },
  };
}

async function adminView(domain) {
  const users = await User.find({ domain, isActive: true }).select('name email avatar role');
  const userProjectIds = users.reduce((acc, u) => [...acc, ...(u.assignedProjects || [])], []);
  const projectIds = await getDomainProjectIds(domain);

  const tasks = await taskPopulate(Task.find({
    domain, isActive: true, scope: 'project', project: { $in: projectIds },
  }).sort({ createdAt: -1 }));

  const testCases = await tcPopulate(TestCase.find({
    project: { $in: projectIds }, isActive: true,
  }).sort({ createdAt: -1 }));

  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');
  const openBugsLong = tasks.filter(t => t.type === 'bug' && t.status !== 'done' && t.createdAt && (new Date() - new Date(t.createdAt)) > 7 * 24 * 60 * 60 * 1000);

  const userWorkloads = {};
  for (const u of users) {
    const assigned = tasks.filter(t => t.assignee && String(t.assignee._id || t.assignee) === String(u._id));
    const totalHours = assigned.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    userWorkloads[u._id] = {
      user: u,
      taskCount: assigned.length,
      doneCount: assigned.filter(t => t.status === 'done').length,
      estimatedHours: totalHours,
      loggedHours: assigned.reduce((s, t) => s + (t.loggedHours || 0), 0),
    };
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    role: 'admin',
    view: 'Platform Overview',
    sections: {
      tasks, testCases, overdueTasks, openBugsLong, userWorkloads, users,
    },
    stats: {
      totalUsers: users.length,
      totalTasks, doneTasks, completionRate,
      overdueCount: overdueTasks.length,
      openBugsLongCount: openBugsLong.length,
      totalTestCases: testCases.length,
    },
  };
}

exports.getMyWidgets = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);

    let widgets = [];

    if (role === 'developer') {
      const data = await devView(userId, projectIds);
      const urgent = data.sections.activeSprintTasks.filter(t => t.priority === 'urgent' || t.priority === 'critical').slice(0, 3);
      widgets = [
        { id: 'today-tasks', title: "Today's Tasks", type: 'list', data: urgent, icon: '🎯' },
        { id: 'sprint-progress', title: 'Sprint Progress', type: 'progress', data: { done: data.stats.doneTasks, total: data.stats.totalTasks }, icon: '📊' },
        { id: 'bugs-assigned', title: 'Bugs Assigned', type: 'count', data: data.stats.bugFixCount, icon: '🐛' },
        { id: 'time-logged', title: 'Time Logged Today', type: 'hours', data: data.stats.totalHoursLogged, icon: '⏱' },
      ];
    } else if (role === 'qa_tester') {
      const data = await qaView(userId, projectIds);
      widgets = [
        { id: 'test-queue', title: 'Tests Queue', type: 'count', data: data.stats.readyCount, icon: '🧪' },
        { id: 'pass-fail-ratio', title: 'Pass/Fail This Week', type: 'ratio', data: { pass: data.stats.passCount, fail: data.stats.failCount }, icon: '📈' },
        { id: 'retest-queue', title: 'Bugs Waiting Retest', type: 'count', data: data.sections.failed.length, icon: '🔄' },
        { id: 'deadlines', title: 'Upcoming Deadlines', type: 'list', data: data.sections.readyToRun.slice(0, 5), icon: '⏰' },
      ];
    } else if (['project_manager', 'manager', 'team_lead'].includes(role)) {
      const data = await pmView(userId, req.user.domain, projectIds);
      widgets = [
        { id: 'active-sprints', title: 'Active Sprints', type: 'count', data: data.stats.activeSprints, icon: '⚡' },
        { id: 'team-workload', title: 'Team Workload', type: 'workload', data: data.stats, icon: '👥' },
        { id: 'at-risk', title: 'At-Risk Items', type: 'count', data: data.stats.blockedCount, icon: '🚨' },
        { id: 'client-feedback', title: 'Client Feedback', type: 'pending', data: 0, icon: '💬' },
      ];
    } else {
      const data = await adminView(req.user.domain);
      widgets = [
        { id: 'active-projects', title: 'Total Active Projects', type: 'count', data: data.stats.totalTasks, icon: '📁' },
        { id: 'company-velocity', title: 'Company Velocity', type: 'percent', data: data.stats.completionRate, icon: '📈' },
        { id: 'overdue-tasks', title: 'Overdue Tasks', type: 'count', data: data.stats.overdueCount, icon: '⚠️' },
        { id: 'new-users', title: 'New Users This Week', type: 'count', data: 0, icon: '👤' },
      ];
    }

    res.json(widgets);
  } catch (e) { next(e); }
};

exports.getRoleAnalytics = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);

    let analytics = { metrics: [], charts: [], alerts: [] };

    if (role === 'developer') {
      const data = await devView(userId, projectIds);
      const velocity = data.stats.completionRate;

      analytics = {
        role: 'developer',
        metrics: [
          { name: 'My Velocity', value: `${velocity}%`, trend: velocity > 50 ? 'up' : 'down', target: '80%' },
          { name: 'Completion Rate', value: `${data.stats.completionRate}%`, trend: data.stats.completionRate > 50 ? 'up' : 'down', target: '90%' },
          { name: 'Bug Rate', value: `${data.stats.bugFixCount} bugs`, trend: data.stats.bugFixCount > 3 ? 'up' : 'down', target: '< 3' },
          { name: 'Time Logged', value: `${data.stats.totalHoursLogged}h`, trend: 'up', target: '40h' },
        ],
        charts: [
          { type: 'bar', title: 'Sprint Contribution', labels: activeSprintNames(data.activeSprints), data: [data.stats.completionRate] },
          { type: 'doughnut', title: 'Task Status Breakdown', labels: ['Done', 'In Progress', 'Review', 'Todo'], data: [
            data.stats.doneTasks,
            data.sections.activeSprintTasks.filter(t => t.status === 'in_progress').length,
            data.stats.reviewCount,
            data.stats.totalTasks - data.stats.doneTasks - data.sections.activeSprintTasks.filter(t => t.status === 'in_progress').length - data.stats.reviewCount,
          ]},
        ],
        alerts: [
          ...(data.stats.bugFixCount > 3 ? [{ type: 'warning', message: `${data.stats.bugFixCount} bugs assigned to you`, severity: 'medium' }] : []),
          ...(data.stats.reviewCount > 0 ? [{ type: 'info', message: `${data.stats.reviewCount} tasks pending review`, severity: 'low' }] : []),
        ],
      };
    } else if (role === 'qa_tester') {
      const data = await qaView(userId, projectIds);
      analytics = {
        role: 'qa_tester',
        metrics: [
          { name: 'Tests Run', value: `${data.stats.total}`, trend: 'up', target: `${data.stats.total + 5}` },
          { name: 'Pass Rate', value: `${data.stats.passRate}%`, trend: data.stats.passRate > 70 ? 'up' : 'down', target: '90%' },
          { name: 'Bugs Found', value: `${data.stats.failCount}`, trend: data.stats.failCount > 5 ? 'up' : 'down', target: '< 5' },
          { name: 'Avg Execution Time', value: `${Math.round(data.stats.total / (data.stats.passCount + data.stats.failCount || 1))}s`, trend: 'up', target: '< 30s' },
        ],
        charts: [
          { type: 'bar', title: 'Test Results', labels: ['Passed', 'Failed', 'Blocked', 'Skipped'], data: [data.stats.passCount, data.stats.failCount, data.stats.blockedCount, data.sections.skipped.length] },
          { type: 'doughnut', title: 'Test Coverage', labels: ['Executed', 'Pending'], data: [data.stats.passCount + data.stats.failCount, data.stats.total - data.stats.passCount - data.stats.failCount] },
        ],
        alerts: [
          ...(data.stats.failCount > 5 ? [{ type: 'warning', message: `${data.stats.failCount} test cases failing`, severity: 'high' }] : []),
        ],
      };
    } else if (['project_manager', 'manager', 'team_lead'].includes(role)) {
      const data = await pmView(userId, req.user.domain, projectIds);
      analytics = {
        role: 'project_manager',
        metrics: [
          { name: 'Sprint Success Rate', value: `${data.stats.completionRate}%`, trend: data.stats.completionRate > 70 ? 'up' : 'down', target: '90%' },
          { name: 'Team Velocity', value: `${data.stats.totalTasks} tasks`, trend: 'up', target: `${data.stats.totalTasks + 5}` },
          { name: 'Blocked Items', value: `${data.stats.blockedCount}`, trend: data.stats.blockedCount > 5 ? 'up' : 'down', target: '< 5' },
          { name: 'Team Size', value: `${data.stats.memberCount}`, trend: 'up', target: `${data.stats.memberCount + 2}` },
        ],
        charts: [
          { type: 'bar', title: 'Project Progress', labels: data.managedProjects.map(p => p.name), data: data.managedProjects.map(() => data.stats.completionRate) },
          { type: 'doughnut', title: 'Task Status by Project', labels: ['Done', 'Active', 'Blocked'], data: [data.stats.doneTasks, data.stats.totalTasks - data.stats.doneTasks - data.stats.blockedCount, data.stats.blockedCount] },
        ],
        alerts: [
          ...(data.stats.blockedCount > 0 ? [{ type: 'warning', message: `${data.stats.blockedCount} blocked tasks need attention`, severity: 'high' }] : []),
          ...(data.managedProjects.some(p => p.phase === 'review') ? [{ type: 'info', message: 'Projects pending phase transition approval', severity: 'medium' }] : []),
        ],
      };
    } else {
      const data = await adminView(req.user.domain);
      analytics = {
        role: 'admin',
        metrics: [
          { name: 'Total Users', value: `${data.stats.totalUsers}`, trend: 'up', target: `${data.stats.totalUsers + 5}` },
          { name: 'Completion Rate', value: `${data.stats.completionRate}%`, trend: data.stats.completionRate > 70 ? 'up' : 'down', target: '90%' },
          { name: 'Overdue Tasks', value: `${data.stats.overdueCount}`, trend: data.stats.overdueCount > 10 ? 'up' : 'down', target: '< 5' },
          { name: 'Test Coverage', value: `${data.stats.totalTestCases}`, trend: 'up', target: `${data.stats.totalTestCases + 20}` },
        ],
        charts: [
          { type: 'bar', title: 'Department Velocity', labels: ['Development', 'QA', 'Management'], data: [data.stats.completionRate, data.stats.totalTestCases > 0 ? 50 : 0, 60] },
          { type: 'doughnut', title: 'Resource Utilization', labels: ['Active', 'Underutilized', 'Overloaded'], data: [data.stats.totalUsers - 3, 2, 1] },
        ],
        alerts: [
          ...(data.stats.overdueCount > 5 ? [{ type: 'warning', message: `${data.stats.overdueCount} overdue tasks`, severity: 'high' }] : []),
          ...(data.stats.openBugsLongCount > 0 ? [{ type: 'warning', message: `${data.stats.openBugsLongCount} bugs open > 7 days`, severity: 'medium' }] : []),
        ],
      };
    }

    res.json(analytics);
  } catch (e) { next(e); }
};

function activeSprintNames(sprints) {
  return sprints.map(s => s.name || 'Unnamed Sprint');
}
