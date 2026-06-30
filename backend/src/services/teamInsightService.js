const AutopsyEvent = require('../models/AutopsyEvent');
const Project = require('../models/Project');
const User = require('../models/User');

async function getTeamInsights(domain) {
  const [users, projects, events] = await Promise.all([
    User.find({ domain, isActive: true })
      .select('name role email avatar activityScore status assignedProjects lastActive')
      .lean(),
    Project.find({ domain, isActive: true })
      .select('name status progress phase deadline members settings.blockers')
      .lean(),
    AutopsyEvent.find({ domain })
      .sort({ timestamp: -1 })
      .limit(1500)
      .populate('actor', 'name role')
      .lean(),
  ]);

  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const projectCounts = {};
  users.forEach(u => {
    const pid = u._id.toString();
    projectCounts[pid] = (u.assignedProjects || []).length;
  });

  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'in_meeting');
  const disengagedUsers = users.filter(u =>
    u.activityScore < 30 && u.status !== 'offline'
  );
  const overloadedUsers = users.filter(u =>
    u.activityScore > 75 && projectCounts[u._id.toString()] >= 4
  );
  const idleUsers = users.filter(u =>
    u.status === 'idle' || u.status === 'inactive'
  );
  const unassignedUsers = users.filter(u =>
    !u.assignedProjects || u.assignedProjects.length === 0
  );

  const teamPulse = {
    total: users.length,
    active: activeUsers.length,
    idle: idleUsers.length,
    disengaged: disengagedUsers.length,
    overloaded: overloadedUsers.length,
    unassigned: unassignedUsers.length,
    activePercent: users.length > 0 ? Math.round((activeUsers.length / users.length) * 100) : 0,
    health: computeTeamHealth(users, activeUsers.length, overloadedUsers.length, disengagedUsers.length),
  };

  const attentionItems = [];

  overloadedUsers.forEach(u => {
    const projNames = getProjectNamesForUser(projects, u);
    attentionItems.push({
      type: 'overload',
      priority: 'high',
      userName: u.name,
      userRole: u.role,
      detail: u.activityScore + '% activity across ' + projectCounts[u._id.toString()] + ' projects' + (projNames.length > 0 ? ': ' + projNames.join(', ') : ''),
      action: 'Have a 1:1. Redistribute workload or reprioritize.',
    });
  });

  disengagedUsers.forEach(u => {
    if (overloadedUsers.find(o => o._id.toString() === u._id.toString())) return;
    const lastActiveStr = u.lastActive ? daysSinceStr(u.lastActive) : 'unknown';
    attentionItems.push({
      type: 'disengaged',
      priority: 'medium',
      userName: u.name,
      userRole: u.role,
      detail: 'Activity dropped to ' + u.activityScore + '%. Last active ' + lastActiveStr + '.',
      action: 'Check in. Ask if they need support or have blockers.',
    });
  });

  unassignedUsers.forEach(u => {
    attentionItems.push({
      type: 'unassigned',
      priority: 'low',
      userName: u.name,
      userRole: u.role,
      detail: 'Not assigned to any active project.',
      action: 'Find a project that fits their skills.',
    });
  });

  const recentBlockers = events.filter(function(e) {
    return e.eventType === 'blocker' && e.timestamp && (now - new Date(e.timestamp)) < 7 * 86400000;
  });

  const blockerItems = [];
  recentBlockers.forEach(function(e) {
    var projName = 'Unknown';
    if (e.projectId) {
      var found = projects.find(function(p) { return p._id.toString() === (e.projectId._id ? e.projectId._id.toString() : e.projectId.toString()); });
      if (found) projName = found.name;
    }
    var actorName = e.actor && e.actor.name ? e.actor.name : 'Someone';
    var sinceDays = Math.round((now - new Date(e.timestamp)) / 86400000);
    if (sinceDays < 1) sinceDays = 1;
    blockerItems.push({
      projectName: projName,
      userName: actorName,
      blocker: e.reason || 'No details',
      sinceDays: sinceDays,
    });
  });

  const topBlockers = blockerItems.sort(function(a, b) { return b.sinceDays - a.sinceDays; }).slice(0, 5);

  var stalled = [];
  if (events && events.length > 0) {
    var completions = {};
    var assignments = {};

    events.forEach(function(e) {
      if (e.eventType === 'task_complete' && e.actor && e.actor._id) {
        var uid = e.actor._id.toString();
        completions[uid] = (completions[uid] || 0) + 1;
      }
      if (e.eventType === 'task_assign' && e.actor && e.actor._id) {
        var uid2 = e.actor._id.toString();
        assignments[uid2] = (assignments[uid2] || 0) + 1;
      }
    });

    Object.keys(completions).forEach(function(uid) {
      var assigned = assignments[uid] || 0;
      var completed = completions[uid] || 0;
      var userObj = userMap[uid];
      if (userObj && assigned > 3 && completed / assigned < 0.3) {
        stalled.push({
          userName: userObj.name,
          role: userObj.role,
          assigned: assigned,
          completed: completed,
          completionRate: Math.round((completed / assigned) * 100) + '%',
          detail: 'Completed ' + completed + ' of ' + assigned + ' assigned tasks.',
        });
      }
    });
  }

  const workDistUsers = users
    .filter(function(u) { return u.assignedProjects && u.assignedProjects.length > 0; })
    .map(function(u) {
      return { name: u.name, role: u.role, projectCount: u.assignedProjects.length };
    })
    .sort(function(a, b) { return b.projectCount - a.projectCount; });

  var workDistribution = { balanced: true, mostLoaded: null, leastLoaded: null, details: [] };
  if (workDistUsers.length > 0) {
    workDistribution.mostLoaded = { name: workDistUsers[0].name, projectCount: workDistUsers[0].projectCount, role: workDistUsers[0].role };
    workDistribution.leastLoaded = { name: workDistUsers[workDistUsers.length - 1].name, projectCount: workDistUsers[workDistUsers.length - 1].projectCount, role: workDistUsers[workDistUsers.length - 1].role };
    if (workDistUsers[0].projectCount - workDistUsers[workDistUsers.length - 1].projectCount > 2) {
      workDistribution.balanced = false;
    }
    workDistribution.details = workDistUsers.slice(0, 8);
  }

  var deliverySignals = {
    completedLast24h: 0,
    completionsYesterday: 0,
    newBlockers: recentBlockers.length,
    stalledMembers: stalled.length,
  };

  events.forEach(function(e) {
    if (e.eventType === 'task_complete' && e.timestamp) {
      var t = new Date(e.timestamp);
      if (t >= oneDayAgo) deliverySignals.completedLast24h++;
      if (t >= threeDaysAgo && t < oneDayAgo) deliverySignals.completionsYesterday++;
    }
  });

  var teamHealthLabel = 'Good';
  var teamHealthColor = '#22C55E';
  if (overloadedUsers.length >= 3 || disengagedUsers.length >= 3) {
    teamHealthLabel = 'Needs Attention';
    teamHealthColor = '#F5A524';
  }
  if (overloadedUsers.length >= 5 || disengagedUsers.length >= 4) {
    teamHealthLabel = 'Critical';
    teamHealthColor = '#F04452';
  }

  var coachingTips = [];

  var newOrUnassignedLeads = users.filter(function(u) {
    return (u.role === 'team_lead' || u.role === 'project_manager') && u.activityScore > 0 && u.activityScore < 40;
  });
  newOrUnassignedLeads.forEach(function(u) {
    coachingTips.push({
      userName: u.name,
      role: u.role,
      tip: 'New in leadership — have a 15-min check-in today to see if they need support.',
    });
  });

  users.filter(function(u) { return u.activityScore >= 80; }).slice(0, 3).forEach(function(u) {
    coachingTips.push({
      userName: u.name,
      role: u.role,
      tip: u.activityScore + '% activity — recognize their contribution today.',
    });
  });

  stalled.slice(0, 2).forEach(function(s) {
    coachingTips.push({
      userName: s.userName,
      role: s.role,
      tip: 'Task completion rate is ' + s.completionRate + '. Have a quick 1:1 to unblock them.',
    });
  });

  return {
    pulse: teamPulse,
    attentionItems: attentionItems.sort(function(a, b) {
      var order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    }).slice(0, 8),
    blockers: topBlockers,
    workDistribution: workDistribution,
    deliverySignals: deliverySignals,
    coachingTips: coachingTips.slice(0, 5),
    teamHealth: { label: teamHealthLabel, color: teamHealthColor },
  };
}

function computeTeamHealth(users, activeCount, overloadedCount, disengagedCount) {
  var score = 75;
  score -= overloadedCount * 5;
  score -= disengagedCount * 8;
  var inactiveCount = users.filter(function(u) { return u.status === 'inactive' || u.status === 'offline'; }).length;
  score -= Math.round((inactiveCount / Math.max(1, users.length)) * 20);
  score = Math.max(0, Math.min(100, score));
  return score;
}

function getProjectNamesForUser(projects, user) {
  if (!user.assignedProjects || user.assignedProjects.length === 0) return [];
  var names = [];
  (user.assignedProjects || []).forEach(function(pid) {
    if (!pid) return;
    var pidStr = pid._id ? pid._id.toString() : pid.toString();
    var proj = projects.find(function(p) { return p._id.toString() === pidStr; });
    if (proj) names.push(proj.name);
  });
  return names;
}

function daysSinceStr(date) {
  var days = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return days + ' days ago';
}

module.exports = { getTeamInsights };
