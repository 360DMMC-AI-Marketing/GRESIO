const Project = require('../models/Project');

const PLAN_LIMITS = {
  starter: { users: 10, projects: 3 },
  team: { users: 50, projects: Infinity },
  enterprise: { users: Infinity, projects: Infinity },
};

function getPlanLimit(plan, key) {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return null;
  return limits[key];
}

async function enforceUserLimit(domain, plan) {
  const User = require('../models/User');
  const limit = getPlanLimit(plan, 'users');
  if (limit === Infinity) return { allowed: true };
  const count = await User.countDocuments({ domain });
  if (count >= limit) {
    return { allowed: false, message: `Plan limit reached: maximum ${limit} users allowed on the ${plan} plan. Upgrade to add more users.` };
  }
  return { allowed: true };
}

async function enforceProjectLimit(domain, plan) {
  const limit = getPlanLimit(plan, 'projects');
  if (limit === Infinity) return { allowed: true };
  const count = await Project.countDocuments({ domain });
  if (count >= limit) {
    return { allowed: false, message: `Plan limit reached: maximum ${limit} projects allowed on the ${plan} plan. Upgrade to create more projects.` };
  }
  return { allowed: true };
}

async function getCompanyUsage(domain) {
  const User = require('../models/User');
  const userCount = await User.countDocuments({ domain });
  const projectCount = await Project.countDocuments({ domain });
  return { userCount, projectCount };
}

async function getUserAccessibleProjectIds(domain, userId) {
  const Task = require('../models/Task');

  const memberProjectIds = await Project.distinct('_id', {
    domain, isActive: true, members: userId
  });

  const taskProjectIds = await Task.distinct('project', {
    assignee: userId, isActive: true, scope: 'project'
  });

  const umbrellaIds = await Project.distinct('_id', {
    domain, isActive: true, members: userId, hasChildren: true
  });
  const subProjectIds = await Project.distinct('_id', {
    domain, isActive: true, parentProject: { $in: umbrellaIds }
  });

  return [...new Set([
    ...memberProjectIds.map(id => String(id)),
    ...taskProjectIds.map(id => String(id)),
    ...subProjectIds.map(id => String(id))
  ])];
}

async function getDomainProjectIds(domain, user = null) {
  if (user && user.role !== 'admin') {
    return getUserAccessibleProjectIds(domain, user._id);
  }
  const projects = await Project.find({ domain }).select('_id');
  return projects.map(p => String(p._id));
}

async function validateDowngrade(domain, targetPlan) {
  const usage = await getCompanyUsage(domain);
  const limits = PLAN_LIMITS[targetPlan];
  if (!limits) return { canDowngrade: false, issues: [], message: 'Invalid target plan' };
  const issues = [];
  if (limits.users !== Infinity && usage.userCount > limits.users) {
    issues.push({ type: 'users', current: usage.userCount, max: limits.users, excess: usage.userCount - limits.users });
  }
  if (limits.projects !== Infinity && usage.projectCount > limits.projects) {
    issues.push({ type: 'projects', current: usage.projectCount, max: limits.projects, excess: usage.projectCount - limits.projects });
  }
  return { canDowngrade: issues.length === 0, issues };
}

async function performCleanup(domain, targetPlan) {
  const validation = await validateDowngrade(domain, targetPlan);
  if (validation.canDowngrade) return { deletedUsers: 0, deletedProjects: 0 };
  const limits = PLAN_LIMITS[targetPlan];
  const result = { deletedUsers: 0, deletedProjects: 0 };

  const userIssue = validation.issues.find(i => i.type === 'users');
  if (userIssue) {
    const User = require('../models/User');
    const excessUsers = await User.find({ domain, isActive: true })
      .sort({ createdAt: -1 })
      .limit(userIssue.excess)
      .select('_id');
    const ids = excessUsers.map(u => u._id);
    if (ids.length > 0) {
      await User.updateMany({ _id: { $in: ids } }, { isActive: false });
      result.deletedUsers = ids.length;
    }
  }

  const projectIssue = validation.issues.find(i => i.type === 'projects');
  if (projectIssue) {
    const Project = require('../models/Project');
    const Task = require('../models/Task');
    const Sprint = require('../models/Sprint');
    const excessProjects = await Project.find({ domain, isActive: true })
      .sort({ createdAt: -1 })
      .limit(projectIssue.excess)
      .select('_id');
    const ids = excessProjects.map(p => p._id);
    if (ids.length > 0) {
      await Task.updateMany({ project: { $in: ids } }, { isActive: false });
      await Sprint.updateMany({ project: { $in: ids } }, { isActive: false });
      await Project.updateMany({ _id: { $in: ids } }, { isActive: false });
      result.deletedProjects = ids.length;
    }
  }

  return result;
}

module.exports = { PLAN_LIMITS, getPlanLimit, enforceUserLimit, enforceProjectLimit, getCompanyUsage, getDomainProjectIds, getUserAccessibleProjectIds, validateDowngrade, performCleanup };
