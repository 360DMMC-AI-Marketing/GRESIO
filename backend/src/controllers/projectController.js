const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TestCase = require('../models/TestCase');
const Bug = require('../models/Bug');
const WorkLog = require('../models/WorkLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Integration = require('../models/Integration');
const Company = require('../models/Company');
const microsoftGraphService = require('../services/microsoftGraphService');
const { evaluateProjectPhase, calcPhaseProgress } = require('../services/phaseService');
const { enforceProjectLimit, getUserAccessibleProjectIds } = require('../config/planLimits');


exports.getProjects = async (req, res, next) => {
  try {
    const { parent } = req.query;
    const filter = { isActive: true };

    if (parent === 'none') {
      filter.parentProject = null;
    } else if (parent) {
      filter.parentProject = parent;
    }

    if (req.user.role !== 'admin') {
      filter.domain = req.user.domain;
      const subProjectIds = await Project.distinct('_id', { parentProject: { $ne: null }, members: req.user._id, isActive: true });
      const umbrellaOfSub = await Project.distinct('parentProject', { parentProject: { $ne: null }, members: req.user._id, isActive: true });
      const taskProjectIds = await Task.distinct('project', { assignee: req.user._id, isActive: true, scope: 'project' });
      filter.$or = [
        { members: req.user._id },
        { _id: { $in: taskProjectIds } },
        { _id: { $in: subProjectIds } },
        { _id: { $in: umbrellaOfSub } },
      ];
    }

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const hasPagination = !isNaN(page) && !isNaN(limit);

    let projectsQuery = Project.find(filter)
      .populate('members', 'name email role avatar')
      .sort({ updatedAt: -1 });

    if (hasPagination) {
      projectsQuery = projectsQuery.skip((page - 1) * limit).limit(limit);
    }

    const projects = await projectsQuery;
    const allProjectIds = projects.map(p => p._id);
    const tasksByProject = {};
    if (allProjectIds.length > 0) {
      const allTasks = await Task.find({ project: { $in: allProjectIds }, isActive: true }).lean();
      allTasks.forEach(t => {
        const pid = t.project?.toString();
        if (pid) {
          if (!tasksByProject[pid]) tasksByProject[pid] = [];
          tasksByProject[pid].push(t);
        }
      });
    }

    // For umbrella projects, attach their children count
    const umbrellaIds = projects.filter(p => p.projectType === 'umbrella').map(p => p._id);
    const childrenMap = {};
    if (umbrellaIds.length > 0) {
      const children = await Project.find({ parentProject: { $in: umbrellaIds }, isActive: true })
        .select('_id parentProject name phase progress status members')
        .populate('members', 'name email role avatar')
        .lean();
      for (const c of children) {
        const pid = c.parentProject?.toString();
        if (!childrenMap[pid]) childrenMap[pid] = [];
        childrenMap[pid].push(c);
      }
    }
    const projectsWithChildren = projects.map(p => {
      const pojo = p.toObject ? p.toObject() : p;
      const pid = p._id.toString();
      pojo.tasks = tasksByProject[pid] || [];
      if (childrenMap[pid]) {
        pojo.children = childrenMap[pid];
      }
      return pojo;
    });

    if (hasPagination) {
      const total = await Project.countDocuments(filter);
      return res.json({ data: projectsWithChildren, total, page, totalPages: Math.ceil(total / limit) });
    }

    res.json(projectsWithChildren);
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      const projectIds = await getUserAccessibleProjectIds(req.user.domain, req.user._id);
      if (!projectIds.includes(req.params.id)) return res.status(404).json({ message: 'Project not found' });
    }
    const filter = { _id: req.params.id, isActive: true };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    const project = await Project.findOne(filter)
      .populate('members', 'name email avatar role activityScore status');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const result = project.toObject ? project.toObject() : project;

    // If umbrella, attach children
    if (project.projectType === 'umbrella') {
      const children = await Project.find({ parentProject: project._id, isActive: true })
        .populate('members', 'name email avatar role activityScore status')
        .lean();
      result.children = children;
    }

    // If sub-project, attach parent info
    if (project.parentProject) {
      const parent = await Project.findById(project.parentProject).select('name _id phase progress').lean();
      if (parent) result.parent = parent;
    }

    // Attach tasks directly (not via populate, to support ClickUp import)
    const tasks = await Task.find({ project: project._id, isActive: true })
      .populate('assignee', 'name email avatar role outlookEmail')
      .lean();
    result.tasks = tasks;

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const domain = req.user.domain;
    const company = domain ? await Company.findOne({ domain }) : null;
    if (company) {
      const result = await enforceProjectLimit(company.domain, company.plan);
      if (!result.allowed) {
        return res.status(403).json({ message: result.message });
      }
    }

    // If departments provided, create umbrella + sub-projects
    if (req.body.departments && Array.isArray(req.body.departments) && req.body.departments.length > 0) {
      const umbrella = await Project.create({
        ...req.body,
        projectType: 'umbrella',
        phase: 'discovery',
        domain,
      });
      if (req.body.members && req.body.members.length > 0) {
        await updateUserProjects(req.body.members, umbrella._id);
      }

      const depts = req.body.departments.map(d => typeof d === 'string' ? { name: d, type: req.body.subProjectType || 'software' } : d);
      const subProjects = [];
      for (const d of depts) {
        const sub = await Project.create({
          name: d.name.trim(),
          projectType: d.type || 'software',
          domain,
          phase: 'discovery',
          parentProject: umbrella._id,
          members: req.body.members || [],
          description: `Department: ${d.name.trim()} — part of ${umbrella.name}`,
        });
        await updateUserProjects(req.body.members || [], sub._id);
        subProjects.push(sub);
      }

      autoCreateTeamsChannel(umbrella, req.user).catch(() => {});

      const full = await Project.findById(umbrella._id)
        .populate('members', 'name email role avatar');
      const fullObj = full.toObject();
      fullObj.tasks = await Task.find({ project: full._id, isActive: true });
      return res.status(201).json({ ...fullObj, subProjects: subProjects.map(s => s._id) });
    }

    const project = await Project.create({ ...req.body, domain, phase: 'discovery' });
    if (req.body.members && req.body.members.length > 0) {
      await updateUserProjects(req.body.members, project._id);
    }
    // Auto-add creator to members so they receive notifications
    if (!project.members.some(m => m.toString() === req.user._id.toString())) {
      project.members.push(req.user._id);
      await project.save();
      if (req.user._id) {
        await updateUserProjects([req.user._id], project._id);
      }
    }

    autoCreateTeamsChannel(project, req.user).catch(() => {});

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

async function autoCreateTeamsChannel(project, user) {
  try {
    const company = await Company.findOne({ domain: user.domain }).lean();
    const creds = company?.outlookTenantId ? {
      tenantId: company.outlookTenantId,
      clientId: company.outlookClientId,
      clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
    } : undefined;

    const integration = await Integration.findOne({ name: 'microsoft_graph' });
    const env = require('../config/env');
    const teamId = integration?.config?.teamsTeamId || env.DEFAULT_TEAMS_TEAM_ID;
    if (!teamId) return;

    const result = await microsoftGraphService.createChannel(teamId, project.name, project.description || `${project.name} channel`, creds);
    if (result.error) return;

    await Project.updateOne(
      { _id: project._id },
      { teamChannel: result.displayName, teamsTeamId: teamId, teamsChannelId: result.id }
    );

    await Activity.create({
      user: user._id, domain: user.domain,
      type: 'project_update', source: 'internal',
      description: `Auto-created Teams channel "${result.displayName}" for project ${project.name}`,
      metadata: { projectId: project._id, projectName: project.name, teamsChannelId: result.id, teamsChannelUrl: result.webUrl },
    });
  } catch {}
}

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!req.body.phase && !req.body.progress) {
      await evaluateProjectPhase(req.params.id);
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
};

exports.evaluatePhase = async (req, res, next) => {
  try {
    const { updateProjectProgress } = require('./taskController');
    await updateProjectProgress(req.params.id);
    const phase = await evaluateProjectPhase(req.params.id);
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain })
      .populate('members', 'name email avatar role activityScore status');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const tasks = await Task.find({ project: project._id, isActive: true })
      .populate({ path: 'assignee', select: 'name email avatar role' });
    const projectObj = project.toObject();
    projectObj.tasks = tasks;
    res.json({ phase: project.phase, project: projectObj });
  } catch (e) { next(e); }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    const project = await Project.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await cascadeDeactivate(project._id);

    // Cascade delete sub-projects if this is an umbrella
    if (project.projectType === 'umbrella') {
      const subProjects = await Project.find({ parentProject: req.params.id, isActive: true });
      for (const sub of subProjects) {
        await Project.updateOne({ _id: sub._id }, { isActive: false });
        await cascadeDeactivate(sub._id);
      }
    }

    res.json({ message: 'Project deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.getProjectAnalytics = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, isActive: true };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    const project = await Project.findOne(filter);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // For umbrella, aggregate data across all children
    const projectIds = project.projectType === 'umbrella'
      ? [project._id, ...(await Project.find({ parentProject: project._id, isActive: true }).select('_id').lean()).map(p => p._id)]
      : [project._id];

    const tasks = await Task.find({ project: { $in: projectIds }, isActive: true });
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const overdueTasks = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const sprints = await Sprint.find({ project: { $in: projectIds } });
    const testCases = await TestCase.find({ project: { $in: projectIds }, isActive: true });
    const bugs = await Bug.find({ project: { $in: projectIds }, isActive: true });

    res.json({
      totalTasks,
      doneTasks,
      overdueTasks,
      completionRate,
      totalSprints: sprints.length,
      totalTestCases: testCases.length,
      totalBugs: bugs.length,
      progress: project.progress,
      status: project.status,
      deadline: project.deadline,
    });
  } catch (error) {
    next(error);
  }
};

async function cascadeDeactivate(projectId) {
  await Task.updateMany({ project: projectId }, { isActive: false });
  await Sprint.updateMany({ project: projectId }, { isActive: false });
  await TestCase.updateMany({ project: projectId }, { isActive: false });
  await Bug.updateMany({ project: projectId }, { isActive: false });
  await WorkLog.updateMany({ project: projectId }, { isActive: false });
}

async function updateUserProjects(userIds, projectId) {
  const User = require('../models/User');
  for (const userId of userIds) {
    await User.findByIdAndUpdate(userId, { $addToSet: { assignedProjects: projectId } });
  }
}

exports.markLaunched = async (req, res, next) => {
  try {
    let project = await Project.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      { phase: 'launched', status: 'ready_to_test', launchedAt: new Date() },
      { new: true }
    ).populate('members', 'name email avatar role activityScore status');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const tasks = await Task.find({ project: project._id, isActive: true })
      .populate({ path: 'assignee', select: 'name email avatar role' });
    project = project.toObject();
    project.tasks = tasks;
    const notified = new Set();
    for (const m of project.members) {
      if (notified.has(m._id.toString())) continue;
      notified.add(m._id.toString());
      await Notification.create({
        user: m._id,
        domain: req.user.domain,
        type: 'project_update',
        title: `🚀 Project Launched: ${project.name}`,
        message: `${req.user.name} has launched the project "${project.name}"`,
        link: `/projects/${project._id}`,
      });
    }
    res.json(project);
  } catch (e) { next(e); }
};

exports.markDelivered = async (req, res, next) => {
  try {
    const { deliveryNotes } = req.body;
    let project = await Project.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      { phase: 'delivered', status: 'completed', deliveredAt: new Date(), deliveryNotes: deliveryNotes || '', progress: 100 },
      { new: true }
    ).populate('members', 'name email avatar role activityScore status');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const tasks = await Task.find({ project: project._id, isActive: true })
      .populate({ path: 'assignee', select: 'name email avatar role' });
    project = project.toObject();
    project.tasks = tasks;
    const notified = new Set();
    for (const m of project.members) {
      if (notified.has(m._id.toString())) continue;
      notified.add(m._id.toString());
      await Notification.create({
        user: m._id,
        domain: req.user.domain,
        type: 'project_update',
        title: `✅ Project Delivered: ${project.name}`,
        message: `${req.user.name} has delivered the project "${project.name}"`,
        link: `/projects/${project._id}`,
      });
    }
    res.json(project);
  } catch (e) { next(e); }
};

exports.createTeamsChannel = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const Company = require('../models/Company');
    const company = await Company.findOne({ domain: req.user.domain }).lean();

    const creds = company?.outlookTenantId ? {
      tenantId: company.outlookTenantId,
      clientId: company.outlookClientId,
      clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
    } : undefined;

    const integration = await Integration.findOne({ name: 'microsoft_graph' });
    const env = require('../config/env');
    const teamId = integration?.config?.teamsTeamId || env.DEFAULT_TEAMS_TEAM_ID;
    if (!teamId) {
      return res.status(400).json({ message: 'No default Teams team configured. Set it in Admin > Integrations or add DEFAULT_TEAMS_TEAM_ID to .env' });
    }

    const result = await microsoftGraphService.createChannel(teamId, project.name, project.description || `${project.name} channel`, creds);
    if (result.error) {
      return res.status(500).json({ message: 'Failed to create Teams channel', error: result.error });
    }

    project.teamChannel = result.displayName;
    project.teamsTeamId = teamId;
    project.teamsChannelId = result.id;
    await project.save();

    await Activity.create({
      user: req.user._id,
      domain: req.user.domain,
      type: 'project_update', source: 'internal',
      description: `Created Teams channel "${result.displayName}" for project ${project.name}`,
      metadata: { projectId: project._id, projectName: project.name, teamsChannelId: result.id, teamsChannelUrl: result.webUrl },
    });

    res.json({ channelId: result.id, displayName: result.displayName, webUrl: result.webUrl });
  } catch (e) { next(e); }
};

exports.updateReviewCall = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain }).populate('members');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const { date, time, link, notes, discussion, completed } = req.body;
    const wasScheduled = !!project.reviewCall?.date;
    const wasCompleted = project.reviewCall?.completed;
    project.reviewCall = {
      date: date || project.reviewCall?.date,
      time: time ?? project.reviewCall?.time,
      link: link ?? project.reviewCall?.link,
      notes: notes ?? project.reviewCall?.notes,
      discussion: discussion ?? project.reviewCall?.discussion,
      scheduledBy: req.user._id,
      completed: completed !== undefined ? completed : (project.reviewCall?.completed || false),
    };
    await project.save();

    // Notify on creation and completion only
    if (project.reviewCall.date) {
      let memberIds = project.members || [];
      if (!memberIds.length) memberIds = [{ _id: req.user._id }];
      if (memberIds.length) {
        let title, message;
        if (!wasScheduled) {
          title = `📅 Review Call Scheduled: ${project.name}`;
          message = `A review call has been scheduled for ${new Date(project.reviewCall.date).toLocaleDateString()}${project.reviewCall.time ? ' at ' + project.reviewCall.time : ''}.${project.reviewCall.link ? ' Link: ' + project.reviewCall.link : ''}`;
        } else if (!wasCompleted && project.reviewCall.completed) {
          title = `✅ Review Call Completed: ${project.name}`;
          message = `The review call scheduled for ${new Date(project.reviewCall.date).toLocaleDateString()} has been marked as completed.`;
        } else return;
        const notifDocs = memberIds.map(m => ({
          user: m._id || m, domain: req.user.domain,
          type: 'meeting_reminder',
          title,
          message,
          link: `/projects/${project._id}?tab=review`,
          metadata: { projectId: project._id, reviewCall: project.reviewCall },
        }));
        const notifs = await Notification.insertMany(notifDocs);
        const { getIO } = require('../socket/ioProvider');
        const io = getIO();
        notifs.forEach(n => { try { if (io) io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} });
      }
    }

    res.json({ reviewCall: project.reviewCall });
  } catch (e) { next(e); }
};

exports.deleteReviewCall = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.reviewCall = undefined;
    await project.save();
    await Notification.updateMany(
      { domain: req.user.domain, type: 'meeting_reminder', 'metadata.projectId': project._id, 'metadata.stale': { $ne: true } },
      { $set: { 'metadata.stale': true } }
    );
    res.json({ message: 'Review call deleted' });
  } catch (e) { next(e); }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const umbrella = await Project.findOne({ _id: req.params.id, projectType: 'umbrella', isActive: true });
    if (!umbrella) return res.status(404).json({ message: 'Umbrella project not found' });
    const children = await Project.find({ parentProject: req.params.id, isActive: true })
      .populate('members', 'name email role avatar')
      .lean();
    res.json(children);
  } catch (error) { next(error); }
};
