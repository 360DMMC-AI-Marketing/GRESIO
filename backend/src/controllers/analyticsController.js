const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const TestCase = require('../models/TestCase');
const Sprint = require('../models/Sprint');
const Activity = require('../models/Activity');
const TestingItem = require('../models/TestingItem');
const Resource = require('../models/Resource');
const { getDomainProjectIds } = require('../config/planLimits');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const domainFilter = isAdmin ? {} : { domain: req.user.domain };
    // For task/test counts, include sub-projects
    const allProjectIds = isAdmin
      ? (await Project.find({ isActive: true, projectType: { $ne: 'umbrella' } }).select('_id').lean()).map(p => String(p._id))
      : await getDomainProjectIds(req.user.domain, req.user);

    const userFilter = { isActive: true, ...domainFilter };
    const totalUsers = await User.countDocuments(userFilter);
    const activeUsers = await User.countDocuments({ ...userFilter, status: 'active' });
    const idleUsers = await User.countDocuments({ ...userFilter, status: 'idle' });
    const inactiveUsers = await User.countDocuments({ ...userFilter, status: { $in: ['inactive', 'offline'] } });

    // Count only top-level projects (umbrellas + standalone). Sub-projects are part of their umbrella.
    const topFilter = { isActive: true, parentProject: null, ...domainFilter };
    const totalProjects = await Project.countDocuments(topFilter);
    const completedProjects = await Project.countDocuments({ isActive: true, status: 'completed', parentProject: null, ...domainFilter });
    const inProgressProjects = await Project.countDocuments({ isActive: true, status: { $in: ['on_track', 'ready_to_test'] }, parentProject: null, ...domainFilter });
    const atRiskProjects = await Project.countDocuments({ isActive: true, status: 'at_risk', parentProject: null, ...domainFilter });
    const blockedProjects = await Project.countDocuments({ isActive: true, status: 'blocked', parentProject: null, ...domainFilter });
    const delayedProjects = await Project.countDocuments({ isActive: true, status: 'delayed', parentProject: null, ...domainFilter });

    const totalTasks = await Task.countDocuments({ isActive: true, project: { $in: allProjectIds } });
    const completedTasks = await Task.countDocuments({ status: 'done', project: { $in: allProjectIds } });

    const totalTestingItems = await TestingItem.countDocuments({ isActive: true, project: { $in: allProjectIds } });
    const passedTesting = await TestingItem.countDocuments({ status: 'passed', isActive: true, project: { $in: allProjectIds } });
    const failedTesting = await TestingItem.countDocuments({ status: 'failed', isActive: true, project: { $in: allProjectIds } });
    const blockedTesting = await TestingItem.countDocuments({ status: 'blocked', isActive: true, project: { $in: allProjectIds } });
    const overdueTesting = await TestingItem.countDocuments({ isActive: true, deadline: { $lt: new Date() }, status: { $nin: ['passed', 'completed'] }, project: { $in: allProjectIds } });

    const domainUsers = await User.find(userFilter).select('_id');
    const domainUserIds = domainUsers.map(u => u._id);
    const recentActivity = await Activity.find({ user: { $in: domainUserIds } })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    const avgActivityScore = await User.aggregate([
      { $match: { isActive: true, ...(isAdmin ? {} : { domain: req.user.domain }) } },
      { $group: { _id: null, avg: { $avg: '$activityScore' } } },
    ]);

    const healthScore = calculateHealthScore({
      activeUsers, totalUsers, completedProjects, totalProjects, atRiskProjects,
    });

    res.json({
      healthScore,
      totalUsers, activeUsers, idleUsers, inactiveUsers,
      totalProjects, completedProjects, inProgressProjects,
      totalTasks, completedTasks, atRiskProjects, blockedProjects, delayedProjects,
      avgActivityScore: avgActivityScore[0]?.avg || 0,
      testingMetrics: { total: totalTestingItems, passed: passedTesting, failed: failedTesting, blocked: blockedTesting, overdue: overdueTesting },
      recentActivity,
    });
  } catch (error) { next(error); }
};

exports.getProductivityTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    const userFilter = { isActive: true };
    if (req.user.role !== 'admin') userFilter.domain = req.user.domain;
    const domainUsers = await User.find(userFilter).select('_id');
    const domainUserIds = domainUsers.map(u => u._id);
    const activities = await Activity.aggregate([
      { $match: { createdAt: { $gte: since }, user: { $in: domainUserIds } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, totalScore: { $sum: '$score' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(activities);
  } catch (error) { next(error); }
};

exports.getWorkloadBalance = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const domainFilter = isAdmin ? {} : { domain: req.user.domain };
    const projectIds = isAdmin
      ? (await Project.find({ isActive: true, projectType: { $ne: 'umbrella' } }).select('_id').lean()).map(p => String(p._id))
      : await getDomainProjectIds(req.user.domain, req.user);
    const users = await User.find({ isActive: true, ...domainFilter }).populate('assignedProjects');
    const workload = users.map((u) => ({
      userId: u._id, name: u.name, role: u.role, activityScore: u.activityScore,
      projectCount: u.assignedProjects?.length || 0, taskCount: 0, status: u.status,
    }));
    const tasks = await Task.find({ assignee: { $in: users.map((u) => u._id) }, isActive: true, status: { $ne: 'done' }, project: { $in: projectIds } });
    const taskCounts = {};
    tasks.forEach((t) => { const id = t.assignee.toString(); taskCounts[id] = (taskCounts[id] || 0) + 1; });
    workload.forEach((w) => { w.taskCount = taskCounts[w.userId.toString()] || 0; });
    const avgScore = workload.reduce((s, w) => s + w.activityScore, 0) / (workload.length || 1);
    const overloaded = workload.filter((w) => w.activityScore > avgScore * 1.5 || w.taskCount > 10);
    res.json({ workload, overloaded, avgActivityScore: avgScore });
  } catch (error) { next(error); }
};

exports.getProjectPredictions = async (req, res, next) => {
  try {
    const filter = { isActive: true, parentProject: null };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    const projects = await Project.find(filter).select('_id name projectType status startDate deadline').lean();
    const rootIds = projects.map(p => p._id);
    const childProjects = await Project.find({ parentProject: { $in: rootIds }, isActive: true }).select('_id parentProject').lean();
    const childIdsByParent = {};
    for (const c of childProjects) {
      const pid = String(c.parentProject);
      if (!childIdsByParent[pid]) childIdsByParent[pid] = [];
      childIdsByParent[pid].push(c._id);
    }
    const allProjectIds = [...rootIds, ...childProjects.map(c => c._id)];
    const allTasks = await Task.find({ project: { $in: allProjectIds }, isActive: true }).select('project status deadline').lean();
    const tasksByProject = {};
    for (const t of allTasks) {
      const pid = String(t.project);
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(t);
    }
    const predictions = projects.map((p) => {
      const childIds = childIdsByParent[String(p._id)] || [];
      const projectIds = p.projectType === 'umbrella' ? [String(p._id), ...childIds.map(c => String(c))] : [String(p._id)];
      const tasks = projectIds.flatMap(pid => tasksByProject[pid] || []);
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === 'done').length;
      const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const completionRate = total > 0 ? (done / total) * 100 : 0;
      const daysSinceStart = p.startDate ? Math.floor((new Date() - new Date(p.startDate)) / (1000 * 60 * 60 * 24)) : 0;
      const daysUntilDeadline = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      let risk = 'low';
      if (overdue > 0 || (daysUntilDeadline !== null && daysUntilDeadline < 7 && completionRate < 80)) risk = 'high';
      else if (overdue === 0 && (daysUntilDeadline !== null && daysUntilDeadline < 14)) risk = 'medium';
      return { projectId: p._id, name: p.name, completionRate: Math.round(completionRate), overdue, inProgress, total, done, daysSinceStart, daysUntilDeadline, risk, status: p.status };
    });
    res.json(predictions);
  } catch (error) { next(error); }
};

exports.getCompanyAnalytics = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const domainFilter = isAdmin ? {} : { domain: req.user.domain };
    // All non-umbrella project IDs for task/sprint queries
    const projectIds = isAdmin
      ? (await Project.find({ isActive: true, projectType: { $ne: 'umbrella' } }).select('_id').lean()).map(p => String(p._id))
      : await getDomainProjectIds(req.user.domain, req.user);

    // ── Company Overview (top-level projects only) ──
    const allProjects = await Project.find({ ...domainFilter, parentProject: null }).lean();
    const allChildren = await Project.find({ ...domainFilter, parentProject: { $ne: null }, isActive: true }).lean();
    const childrenByParent = {};
    allChildren.forEach(c => {
      const pid = c.parentProject.toString();
      if (!childrenByParent[pid]) childrenByParent[pid] = [];
      childrenByParent[pid].push(c);
    });

    const totalProjects = allProjects.length;
    const activeOnly = allProjects.filter(p => p.isActive !== false);
    const activeProjects = activeOnly.filter(p => ['on_track','at_risk','ready_to_test'].includes(p.status)).length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const atRiskProjects = activeOnly.filter(p => p.status === 'at_risk').length;
    const blockedProjects = activeOnly.filter(p => p.status === 'blocked' || p.status === 'delayed').length;
    const delayedProjects = activeOnly.filter(p => p.status === 'delayed').length;
    const archivedProjects = allProjects.filter(p => p.isActive === false).length;
    const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
    const avgDuration = allProjects.reduce((s, p) => {
      if (p.startDate && p.deadline) return s + (new Date(p.deadline) - new Date(p.startDate));
      return s;
    }, 0);
    const avgDurationDays = totalProjects > 0 ? Math.round(avgDuration / totalProjects / 86400000) : 0;
    const projectsByPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    allProjects.forEach(p => { const pri = p.settings?.priority; if (pri && projectsByPriority[pri] !== undefined) projectsByPriority[pri]++; });

    // ── Employees ──
    const users = await User.find({ isActive: true, ...domainFilter }).populate('assignedProjects').lean();
    const allTasks = await Task.find({ isActive: true, project: { $in: projectIds } }).lean();
    const allTestCases = await TestCase.find({ project: { $in: projectIds }, isActive: true }).lean();
    const allSprints = await Sprint.find({ project: { $in: projectIds } }).populate('tasks').lean();
    const domainUserIds = users.map(u => u._id);
    const activities = await Activity.find({ user: { $in: domainUserIds } }).sort({ createdAt: -1 }).limit(500).lean();

    const userTaskMap = {}; const userSprintMap = {}; const userTCMap = {};
    allTasks.forEach(t => {
      const id = t.assignee?.toString();
      if (!id) return;
      if (!userTaskMap[id]) userTaskMap[id] = { total: 0, done: 0, overdue: 0 };
      userTaskMap[id].total++;
      if (t.status === 'done') userTaskMap[id].done++;
      if (t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done') userTaskMap[id].overdue++;
    });
    allTestCases.forEach(tc => {
      const id = tc.assignee?.toString();
      if (!id) return;
      if (!userTCMap[id]) userTCMap[id] = { assigned: 0, passed: 0, failed: 0 };
      userTCMap[id].assigned++;
      if (tc.status === 'passed') userTCMap[id].passed++;
      if (tc.status === 'failed') userTCMap[id].failed++;
    });
    allSprints.forEach(s => {
      (s.tasks || []).filter(Boolean).forEach(t => {
        const assigneeId = t.assignee?._id?.toString() || t.assignee?.toString();
        if (assigneeId) {
          if (!userSprintMap[assigneeId]) userSprintMap[assigneeId] = { assigned: 0, completed: 0 };
          userSprintMap[assigneeId].assigned++;
          if (t.status === 'done') userSprintMap[assigneeId].completed++;
        }
      });
    });
    const userActivityMap = {};
    activities.forEach(a => {
      const id = a.user?.toString();
      if (!id) return;
      if (!userActivityMap[id]) userActivityMap[id] = { count: 0, last: null };
      userActivityMap[id].count++;
      if (!userActivityMap[id].last || new Date(a.createdAt) > new Date(userActivityMap[id].last)) userActivityMap[id].last = a.createdAt;
    });

    const employeePerformance = users.map(u => {
      const uid = u._id.toString();
      const tasks = userTaskMap[uid] || { total: 0, done: 0, overdue: 0 };
      const sprints = userSprintMap[uid] || { assigned: 0, completed: 0 };
      const tcs = userTCMap[uid] || { assigned: 0, passed: 0, failed: 0 };
      const act = userActivityMap[uid] || { count: 0, last: null };
      const deadlineRate = tasks.total > 0 ? Math.round(((tasks.total - tasks.overdue) / tasks.total) * 100) : 100;
      const taskCompletion = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
      const tcCompletion = tcs.assigned > 0 ? Math.round((tcs.passed / tcs.assigned) * 100) : 0;
      const sprintCompletion = sprints.assigned > 0 ? Math.round((sprints.completed / sprints.assigned) * 100) : 0;
      const activityLevel = Math.min(100, Math.round((act.count / 20) * 100));
      const combinedCompletion = u.role === 'qa_tester' && tcs.assigned > 0
        ? tcCompletion
        : taskCompletion;
      const participationScore = Math.min(100, Math.round(
        combinedCompletion * 0.3 + sprintCompletion * 0.2 + (u.activityScore || 50) * 0.2 + deadlineRate * 0.15 + activityLevel * 0.15
      ));
      return {
        userId: uid, name: u.name, email: u.email, role: u.role, avatar: u.avatar,
        activityScore: u.activityScore || 0, status: u.status,
        assignedProjects: u.assignedProjects?.length || 0,
        assignedTasks: tasks.total, completedTasks: tasks.done, overdueTasks: tasks.overdue,
        assignedSprints: sprints.assigned, completedSprints: sprints.completed,
        testCasesAssigned: tcs.assigned, testCasesPassed: tcs.passed, testCasesFailed: tcs.failed,
        lastActivity: act.last,
        participationScore,
        taskCompletion, sprintCompletion, deadlineRate, activityLevel,
      };
    });
    employeePerformance.sort((a, b) => b.participationScore - a.participationScore);

    // ── Sprint Analytics ──
    const totalSprints = allSprints.length;
    const activeSprints = allSprints.filter(s => s.status === 'active').length;
    const completedSprints = allSprints.filter(s => s.status === 'completed').length;
    const sprintCompletionRate = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0;
    let totalStoryPoints = 0; let completedStoryPoints = 0;
    allSprints.forEach(s => {
      (s.tasks || []).filter(Boolean).forEach(t => {
        const pts = t.estimatedHours || 1;
        totalStoryPoints += pts;
        if (t.status === 'done') completedStoryPoints += pts;
      });
    });

    // ── Risk Dashboard ──
    const today = new Date();
    const allTopAndChildren = [...allProjects, ...allChildren];
    const nearDeadline = allTopAndChildren.filter(p => p.deadline && new Date(p.deadline) > today && (new Date(p.deadline) - today) / 86400000 <= 7).length;
    const overdueTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) < today && t.status !== 'done').length;
    const urgentProjects = allProjects.filter(p => p.settings?.priority === 'urgent').length;
    const unassignedTasks = allTasks.filter(t => !t.assignee).length;
    const membersPopulated = await User.find({ _id: { $in: allTopAndChildren.flatMap(p => p.members || []) } }).lean();
    const pmUserIds = new Set(membersPopulated.filter(u => u.role === 'project_manager').map(u => u._id.toString()));
    const projectsWithoutPM = allTopAndChildren.filter(p => !(p.members || []).some(m => pmUserIds.has(m.toString()))).length;

    // ── Resource Analytics ──
    const allResources = await Resource.find({ project: { $in: projectIds } }).lean();
    const totalResources = allResources.length;
    const documents = allResources.filter(r => r.type === 'pdf' || r.type === 'docx' || r.type === 'document').length;
    const repoLinks = allResources.filter(r => r.type === 'github' || r.type === 'gitlab').length;
    const externalUrls = allResources.filter(r => r.type === 'link').length;

    // ── Per-project participation ──
    const projectParticipation = await Promise.all(allProjects.map(async (p) => {
      const pId = p._id.toString();
      const childIds = (childrenByParent[pId] || []).map(c => c._id.toString());
      const allIds = childIds.length > 0 ? [pId, ...childIds] : [pId];
      const pTasks = allTasks.filter(t => t.project && allIds.includes(t.project.toString()));
      const pTestCases = allTestCases.filter(tc => tc.project && allIds.includes(tc.project.toString()));
      const total = pTasks.length;
      const done = pTasks.filter(t => t.status === 'done').length;
      const taskCompletionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      // Build member map: merge task + test case data
      const memberParticipation = {};
      pTasks.forEach(t => {
        const assigneeId = t.assignee?.toString();
        if (!assigneeId) return;
        if (!memberParticipation[assigneeId]) memberParticipation[assigneeId] = { tasksAssigned: 0, tasksDone: 0, testCasesAssigned: 0, testCasesPassed: 0, testCasesFailed: 0 };
        memberParticipation[assigneeId].tasksAssigned++;
        if (t.status === 'done') memberParticipation[assigneeId].tasksDone++;
      });
      pTestCases.forEach(tc => {
        const assigneeId = tc.assignee?.toString();
        if (!assigneeId) return;
        if (!memberParticipation[assigneeId]) memberParticipation[assigneeId] = { tasksAssigned: 0, tasksDone: 0, testCasesAssigned: 0, testCasesPassed: 0, testCasesFailed: 0 };
        memberParticipation[assigneeId].testCasesAssigned++;
        if (tc.status === 'passed') memberParticipation[assigneeId].testCasesPassed++;
        if (tc.status === 'failed') memberParticipation[assigneeId].testCasesFailed++;
      });
      const totalDone = pTasks.filter(t => t.status === 'done').length;
      const members = await User.find({ _id: { $in: Object.keys(memberParticipation) } }).lean();
      const memberList = members.map(m => {
        const mId = m._id.toString();
        const mp = memberParticipation[mId] || { tasksAssigned: 0, tasksDone: 0, testCasesAssigned: 0, testCasesPassed: 0, testCasesFailed: 0 };
        const score = totalDone > 0 ? Math.round(((mp.tasksDone + mp.testCasesPassed) / Math.max(totalDone + 1, 1)) * 100) : 0;
        return {
          name: m.name, userId: m._id, role: m.role, participation: score,
          tasksAssigned: mp.tasksAssigned, tasksDone: mp.tasksDone,
          testCasesAssigned: mp.testCasesAssigned,
          testCasesPassed: mp.testCasesPassed,
          testCasesFailed: mp.testCasesFailed,
        };
      });
      memberList.sort((a, b) => b.participation - a.participation);

      return {
        projectId: pId, name: p.name,
        taskCompletionRate, totalTasks: total, doneTasks: done,
        totalTestCases: pTestCases.length,
        members: memberList,
      };
    }));

    // ── Activity Timeline ──
    const recentActions = await Activity.find({ user: { $in: domainUserIds } })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 }).limit(30).lean();

    const mostActiveUsers = employeePerformance.slice(0, 5).map(e => ({
      name: e.name, activityScore: e.activityScore, participationScore: e.participationScore,
    }));

    // ── AI Insights ──
    const insights = [];
    const atRiskChildren = allChildren.filter(p => p.status === 'at_risk').length;
    const atRiskParents = allProjects.filter(p => p.status === 'at_risk').length;
    const atRiskCount = atRiskParents + atRiskChildren;
    const delayedCount = allProjects.filter(p => p.status === 'delayed').length + allChildren.filter(p => p.status === 'delayed').length;
    if (atRiskCount > 0) insights.push(`${atRiskCount} project(s) are at risk of missing deadlines.`);
    if (delayedCount > 0) insights.push(`${delayedCount} project(s) are currently delayed.`);
    if (overdueTasks > 0) insights.push(`${overdueTasks} critical task(s) remain incomplete.`);
    const blockedNearDeadline = allTopAndChildren.filter(p => p.status === 'blocked' && p.deadline && new Date(p.deadline) < today).length;
    if (blockedNearDeadline > 0) insights.push(`${blockedNearDeadline} project(s) have been blocked past their deadline.`);
    const avgParticipation = employeePerformance.length > 0 ? Math.round(employeePerformance.reduce((s, e) => s + e.participationScore, 0) / employeePerformance.length) : 0;
    if (avgParticipation < 60) insights.push(`Team participation is low (${avgParticipation}% avg). Consider team engagement initiatives.`);
    else insights.push(`Team participation is healthy at ${avgParticipation}% average.`);
    const lowParticipation = employeePerformance.filter(e => e.participationScore < 40).length;
    if (lowParticipation > 0) insights.push(`${lowParticipation} team member(s) have low participation scores (<40%).`);
    if (unassignedTasks > 0) insights.push(`${unassignedTasks} task(s) are unassigned and need attention.`);
    if (projectsWithoutPM > 0) insights.push(`${projectsWithoutPM} project(s) have no project manager assigned.`);

    // ── Company Health Score ──
    const healthScore = calculateHealthScore({
      activeUsers: users.filter(u => u.status === 'active').length,
      totalUsers: users.length,
      completedProjects, totalProjects, atRiskProjects,
    });
    const taskCompletionRateAll = allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100) : 0;

    res.json({
      company: {
        totalProjects, activeProjects, completedProjects, blockedProjects, delayedProjects, archivedProjects,
        completionRate, avgDurationDays, projectsByPriority,
      },
      employeePerformance,
      projectParticipation,
      sprints: {
        total: totalSprints, active: activeSprints, completed: completedSprints,
        completionRate: sprintCompletionRate, totalStoryPoints, completedStoryPoints,
        remainingStoryPoints: totalStoryPoints - completedStoryPoints,
        velocity: activeSprints > 0 ? Math.round(completedStoryPoints / Math.max(1, totalSprints)) : 0,
      },
      risks: {
        overdueProjects: delayedProjects, blockedProjects, nearDeadline,
        overdueTasks, urgentProjects, unassignedTasks, projectsWithoutPM,
      },
      resources: {
        total: totalResources, documents, repoLinks, externalUrls,
      },
      activity: { recentActions, mostActiveUsers },
      healthScore,
      taskCompletionRateAll,
      insights,
    });
  } catch (error) { next(error); }
};

exports.getProjectTeamAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    if (!projectIds.some(id => id === projectId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const TeamGroup = require('../models/TeamGroup');
    const ProjectMember = require('../models/ProjectMember');
    const [groups, allMembers, tasksByUser] = await Promise.all([
      TeamGroup.find({ project: projectId, isArchived: false }).sort({ order: 1 }).lean(),
      ProjectMember.find({ project: projectId, status: 'active' })
        .populate('user', 'name email avatar role')
        .then(members => members.filter(m => m.user)),
      Task.aggregate([
        { $match: { project: projectId, isActive: true } },
        { $group: { _id: '$assignee', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
      ]),
    ]);
    const taskCounts = {};
    for (const t of tasksByUser) {
      taskCounts[String(t._id)] = { total: t.total, done: t.done };
    }
    const result = groups.map((g) => {
      const groupMembers = allMembers.filter(m => String(m.teamGroup || '') === String(g._id));
      const userIds = groupMembers.map(m => String(m.user._id));
      const totalTasks = userIds.reduce((sum, uid) => sum + (taskCounts[uid]?.total || 0), 0);
      const doneTasks = userIds.reduce((sum, uid) => sum + (taskCounts[uid]?.done || 0), 0);
      return {
        groupId: g._id,
        name: g.name,
        icon: g.icon,
        memberCount: groupMembers.length,
        members: groupMembers.map(m => ({ _id: m.user._id, name: m.user.name, email: m.user.email, role: m.projectRole })),
        totalTasks,
        doneTasks,
        completionRate: totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0,
      };
    });
    const totalAll = result.reduce((s, g) => s + g.totalTasks, 0);
    const withPct = result.map(g => ({
      ...g,
      contributionPct: totalAll > 0 ? Math.round(g.doneTasks / totalAll * 100) : 0,
    }));
    res.json(withPct);
  } catch (e) { next(e); }
};

function calculateHealthScore(data) {
  const activeRatio = data.totalUsers > 0 ? data.activeUsers / data.totalUsers : 0;
  const completionRatio = data.totalProjects > 0 ? data.completedProjects / data.totalProjects : 0;
  const projectHealthRatio = data.totalProjects > 0 ? (data.totalProjects - data.atRiskProjects) / data.totalProjects : 0;
  const score = Math.round((activeRatio * 0.25 + completionRatio * 0.4 + projectHealthRatio * 0.35) * 100);
  return Math.min(100, Math.max(0, score));
}
