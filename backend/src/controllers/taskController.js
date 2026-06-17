const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { evaluateProjectPhase, calcPhaseProgress } = require('../services/phaseService');
const { generateTestsFromTasks } = require('./testCaseController');
const { getDomainProjectIds } = require('../config/planLimits');
const { notifyAdmins } = require('../services/notificationService');

function getIO() {
  try {
    const { getIO } = require('../socket/ioProvider');
    return getIO();
  } catch (e) { return null; }
}

const MANAGER_ROLES = ['admin', 'project_manager', 'team_lead', 'manager'];
const SEPARATE_CREATOR_ROLES = ['admin', 'project_manager', 'team_lead', 'manager'];

async function isUserProjectMember(projectId, userId) {
  const project = await Project.findById(projectId).select('members');
  if (project && project.members.some(m => String(m) === String(userId))) return true;
  const pm = await ProjectMember.findOne({ project: projectId, user: userId, status: 'active' });
  if (pm) {
    await Project.findByIdAndUpdate(projectId, { $addToSet: { members: userId } });
    return true;
  }
  return false;
}

exports.getTasks = async (req, res, next) => {
  try {
    const { status, project, assignee, priority, sprint } = req.query;
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { scope: 'project', project: { $in: projectIds }, isActive: true };
    if (status) {
      const statuses = status.split(',');
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (project) filter.project = project;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (sprint) filter.sprint = sprint;
    if (!MANAGER_ROLES.includes(req.user.role) && !assignee) {
      filter.assignee = req.user._id;
    }
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const hasPagination = !isNaN(page) && !isNaN(limit);

    let tasksQuery = Task.find(filter)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email')
      .sort({ createdAt: -1 });

    if (hasPagination) {
      tasksQuery = tasksQuery.skip((page - 1) * limit).limit(limit);
    }

    const tasks = await tasksQuery;

    if (hasPagination) {
      const total = await Task.countDocuments(filter);
      return res.json({ data: tasks, total, page, totalPages: Math.ceil(total / limit) });
    }

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.getSeparateTasks = async (req, res, next) => {
  try {
    const { status, assignee, priority, separateType } = req.query;
    const filter = { scope: 'separate', domain: req.user.domain, isActive: true };
    if (status) {
      const statuses = status.split(',');
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (separateType) filter.separateType = separateType;
    if (!MANAGER_ROLES.includes(req.user.role) && !assignee) {
      filter.assignee = req.user._id;
    }
    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('subtasks.assignee', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [
        { scope: 'project', project: { $in: projectIds } },
        { scope: 'separate', domain: req.user.domain },
      ],
    })
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name status')
      .populate('subtasks.assignee', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const isCreator = task.createdBy && String(task.createdBy._id) === String(req.user._id);
    const isManager = MANAGER_ROLES.includes(req.user.role);
    if (task.scope === 'separate' && !isManager && !isCreator && String(task.assignee?._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.includes(req.body.projectId)) {
      return res.status(403).json({ message: 'Project not found in your domain' });
    }
    let assigneeId = req.body.assignee;
    if (req.body.assigneeEmail) {
      const outlookUser = await User.findOne({ outlookEmail: req.body.assigneeEmail });
      if (outlookUser) assigneeId = outlookUser._id;
    }
    if (assigneeId) {
      const isMember = await isUserProjectMember(req.body.projectId, assigneeId);
      if (!isMember) {
        return res.status(400).json({ message: 'Assignee must be a member of this project' });
      }
    }
    const sprintId = req.body.sprint || undefined;
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description || '',
      type: req.body.type || 'task',
      scope: 'project',
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assignee: assigneeId || undefined,
      createdBy: req.user._id,
      project: req.body.projectId,
      sprint: sprintId,
      deadline: req.body.deadline,
      estimatedHours: req.body.estimatedHours || 0,
      subtasks: req.body.subtasks || [],
    });
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    if (populated.project) {
      await Project.findByIdAndUpdate(populated.project._id, { $push: { tasks: populated._id } });
    }
    if (sprintId) {
      await Sprint.findByIdAndUpdate(sprintId, { $addToSet: { tasks: populated._id } });
    }
    if (populated.assignee) {
      await Notification.create({
        user: populated.assignee._id,
        domain: req.user.domain,
        type: 'task_assigned',
        title: `New task: ${populated.title}`,
        message: `You have been assigned a new task in ${populated.project?.name || 'project'}`,
        link: `/tasks?tab=project&taskId=${populated._id}`,
      });
    }
    if (sprintId) {
      generateTestsFromTasks(populated.project?._id, sprintId, [populated], req.user._id, req.user.domain).catch(() => {});
    }
    await updateProjectProgress(populated.project?._id);
    const finalTask = await Task.findById(populated._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    await Activity.create({
      user: req.user._id,
      domain: req.user.domain,
      type: 'task_update',
      source: 'internal',
      description: `Created task: ${finalTask.title}`,
      metadata: { taskId: finalTask._id, projectId: finalTask.project?._id },
    });

    notifyAdmins(req.user.domain, 'task_assigned',
      `New task: ${finalTask.title}`,
      `${req.user.name} created task "${finalTask.title}" in ${finalTask.project?.name || 'project'}`,
      `/tasks?tab=project&taskId=${finalTask._id}`, { taskId: finalTask._id, projectId: finalTask.project?._id });

    res.status(201).json(finalTask);
  } catch (error) {
    next(error);
  }
};

exports.createSeparateTask = async (req, res, next) => {
  try {
    if (!SEPARATE_CREATOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only PM, Admin, Manager, or Team Lead can create separate tasks' });
    }
    const validTypes = ['Admin', 'HR', 'Meeting', 'Training', 'Research', 'Bug Fix', 'Other'];
    const separateType = validTypes.includes(req.body.separateType) ? req.body.separateType : 'Other';
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description || '',
      scope: 'separate',
      separateType,
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assignee: req.body.assignee || undefined,
      createdBy: req.user._id,
      deadline: req.body.deadline,
      domain: req.user.domain,
    });
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('subtasks.assignee', 'name email');
    if (populated.assignee) {
      await Notification.create({
        user: populated.assignee._id,
        domain: req.user.domain,
        type: 'task_assigned',
        title: `New separate task: ${populated.title}`,
        message: `You have been assigned a new separate task`,
        link: `/tasks?tab=separate&taskId=${populated._id}`,
      });
    }
    await Activity.create({
      user: req.user._id,
      domain: req.user.domain,
      type: 'task_update',
      source: 'internal',
      description: `Created separate task: ${populated.title}`,
      metadata: { taskId: populated._id },
    });

    notifyAdmins(req.user.domain, 'task_assigned',
      `New separate task: ${populated.title}`,
      `${req.user.name} created separate task "${populated.title}"`,
      `/tasks?tab=separate&taskId=${populated._id}`, { taskId: populated._id });

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

async function updateProjectProgress(projectId) {
  if (!projectId) return;

  const sprints = await Sprint.find({ project: projectId }).populate('tasks');
  for (const sprint of sprints) {
    if (sprint.status === 'completed' || sprint.status === 'cancelled') continue;
    const sprintTasks = sprint.tasks || [];
    const sprintTotal = sprintTasks.length;
    const sprintDone = sprintTasks.filter(t => t.status === 'done').length;
    if (sprintTotal > 0 && sprintDone === sprintTotal) {
      await Sprint.findByIdAndUpdate(sprint._id, { status: 'completed' }, { new: true });
    }
  }

  await evaluateProjectPhase(projectId);

  const project = await Project.findById(projectId);
  if (!project) return;

  const progress = calcPhaseProgress(project.projectType, project.phase);
  const tasks = await Task.find({ project: projectId, isActive: true, scope: 'project' });
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;

  let status = 'on_track';
  if (progress === 100) {
    status = 'completed';
  } else if (total > 0 && done === total) {
    status = 'ready_to_test';
  }

  await Project.findByIdAndUpdate(projectId, { progress, status }, { new: true });
}

exports.updateProjectProgress = updateProjectProgress;

async function findTaskInDomain(taskId, domain) {
  const projectIds = await getDomainProjectIds(domain);
  return Task.findOne({
    _id: taskId,
    isActive: true,
    $or: [
      { scope: 'project', project: { $in: projectIds } },
      { scope: 'separate', domain },
    ],
  });
}

exports.updateTask = async (req, res, next) => {
  try {
    const task = await findTaskInDomain(req.params.id, req.user.domain);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.body.assigneeEmail) {
      const outlookUser = await User.findOne({ outlookEmail: req.body.assigneeEmail });
      if (outlookUser) req.body.assignee = outlookUser._id;
      delete req.body.assigneeEmail;
    }
    if (task.scope === 'project') {
      if (req.body.assignee) {
        const isMember = await isUserProjectMember(task.project, req.body.assignee);
        if (!isMember) {
          return res.status(400).json({ message: 'Assignee must be a member of this project' });
        }
      }
      if (req.body.sprint !== undefined) {
        if (task.sprint && String(task.sprint) !== String(req.body.sprint)) {
          await Sprint.findByIdAndUpdate(task.sprint, { $pull: { tasks: req.params.id } });
        }
        if (req.body.sprint) {
          await Sprint.findByIdAndUpdate(req.body.sprint, { $addToSet: { tasks: req.params.id } });
        }
      }
    }
    if (req.body.status && req.body.status !== task.status) {
      const isManager = MANAGER_ROLES.includes(req.user.role);
      const isAssignee = task.assignee && String(task.assignee) === String(req.user._id);
      const isCreator = task.createdBy && String(task.createdBy) === String(req.user._id);
      if (!isManager && !isAssignee && !isCreator) {
        return res.status(403).json({ message: 'Only the assignee, creator, or manager can change task status' });
      }
    }
    const oldAssignee = task.assignee;
    const oldStatus = task.status;
    Object.assign(task, req.body);
    await task.save();

    if (req.body.assignee && String(req.body.assignee) !== String(oldAssignee || '')) {
      await Notification.create({
        user: req.body.assignee,
        domain: req.user.domain,
        type: 'task_assigned',
        title: `New task assigned: ${task.title}`,
        message: `You have been assigned the task "${task.title}"`,
        link: task.scope === 'project' ? `/tasks?tab=project&taskId=${task._id}` : `/tasks?tab=separate&taskId=${task._id}`,
      });
    }

    const statusChangedToDone = req.body.status === 'done' && oldStatus !== 'done';
    if (statusChangedToDone && task.scope === 'separate' && task.createdBy) {
      const isAssignee = task.assignee && String(task.assignee) === String(req.user._id);
      if (isAssignee && String(task.createdBy) !== String(req.user._id)) {
        const User = require('../models/User');
        const assigneeUser = await User.findById(req.user._id).select('name');
        await Notification.create({
          user: task.createdBy,
          domain: req.user.domain,
          type: 'task_assigned',
          title: `Task completed: ${task.title}`,
          message: `${assigneeUser?.name || 'Assignee'} has completed the task "${task.title}" you assigned to them`,
          link: `/tasks?tab=separate&taskId=${task._id}`,
        });
      }
    }

    // Auto-retest: when a task is marked done, find linked bug and trigger retest
    if (statusChangedToDone) {
      const Bug = require('../models/Bug');
      const linkedBug = await Bug.findOne({ task: task._id, status: 'fixed' }).populate('testCase').populate('project', 'domain');
      if (linkedBug && linkedBug.testCase) {
        const TestCase = require('../models/TestCase');
        const tc = await TestCase.findById(linkedBug.testCase._id);
        if (tc) {
          tc.status = 'retesting';
          tc.retestRequired = true;
          tc.failureReason = '';
          tc.linkedBug = undefined;
          for (const step of tc.steps) {
            step.historical = true;
            step.status = 'not_tested';
            step.actualResult = '';
            step.evidence = '';
          }
          await tc.save();

          // Mark bug as closed (resolved for verification)
          linkedBug.status = 'closed';
          linkedBug.resolvedAt = new Date();
          linkedBug.resolutionNotes = 'Fixed — linked task completed, ready for verification';
          await linkedBug.save();

          // Notify QA team
          const User = require('../models/User');
          const qaUsers = await User.find({ role: { $in: ['qa_tester', 'admin'] }, domain: linkedBug.project?.domain || tc.project?.domain }).select('_id');
          if (qaUsers.length) {
            const notifDocs = qaUsers.map(user => ({
              user, domain: linkedBug.project?.domain || tc.project?.domain,
              type: 'status_change',
              title: `🔄 Retest Ready: ${tc.testCaseId}`,
              message: `Task "${task.title}" is done. Bug ${linkedBug._id} is fixed — test ${tc.testCaseId} is ready for retest.`,
              link: `/projects/${tc.project}?tab=test-cases&tcId=${tc._id}`,
              metadata: { testCaseId: tc._id, bugId: linkedBug._id },
            }));
            const notifs = await Notification.insertMany(notifDocs);
            const io = getIO();
            notifs.forEach(n => { try { io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {} });
          }

          const io = getIO();
          if (io) {
            io.to(`project:${tc.project}`).emit('test_case_updated', tc);
            io.to(`project:${tc.project}`).emit('bug:resolved', { bugId: linkedBug._id, testCaseId: tc._id });
          }
        }
      }
    }
    const updated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    if (updated.scope === 'project') {
      await updateProjectProgress(updated.project);
      const io = getIO();
      if (io) {
        io.to(`project:${updated.project}`).emit('task_updated', updated);
      }
    }

    if (req.body.status) {
      notifyAdmins(req.user.domain, 'status_change',
        `Task "${updated.title}" — ${req.body.status}`,
        `${req.user.name} changed task "${updated.title}" to ${req.body.status}`,
        updated.scope === 'project' ? `/tasks?tab=project&taskId=${updated._id}` : `/tasks?tab=separate&taskId=${updated._id}`,
        { taskId: updated._id, projectId: updated.project?._id });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await findTaskInDomain(req.params.id, req.user.domain);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const isCreator = task.createdBy && String(task.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Only the creator or admin can delete this task' });
    }
    task.isActive = false;
    await task.save();
    if (task.scope === 'project' && task.project) {
      await Project.findByIdAndUpdate(task.project, { $pull: { tasks: task._id } });
      await updateProjectProgress(task.project);
    }
    if (task.sprint) {
      await Sprint.findByIdAndUpdate(task.sprint, { $pull: { tasks: task._id } });
    }

    notifyAdmins(req.user.domain, 'project_update',
      `Task deleted: ${task.title}`,
      `${req.user.name} deleted task "${task.title}"`,
      task.scope === 'project' ? `/tasks?tab=project` : `/tasks?tab=separate`,
      { taskId: task._id, projectId: task.project?._id });

    res.json({ message: 'Task deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.addSubtask = async (req, res, next) => {
  try {
    const task = await findTaskInDomain(req.params.id, req.user.domain);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.subtasks.push(req.body);
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

exports.updateSubtask = async (req, res, next) => {
  try {
    const task = await findTaskInDomain(req.params.id, req.user.domain);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const sub = task.subtasks.id(req.params.subtaskId);
    if (!sub) return res.status(404).json({ message: 'Subtask not found' });
    Object.assign(sub, req.body);
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

exports.deleteSubtask = async (req, res, next) => {
  try {
    const task = await findTaskInDomain(req.params.id, req.user.domain);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    task.subtasks.pull(req.params.subtaskId);
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar role outlookEmail')
      .populate('createdBy', 'name email avatar role')
      .populate('project', 'name')
      .populate('subtasks.assignee', 'name email');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateTasks = async (req, res, next) => {
  try {
    const { taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });
    }
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'updates must contain at least one field' });
    }
    const allowedFields = ['status', 'priority', 'assignee', 'sprint', 'deadline'];
    const invalidFields = Object.keys(updates).filter(k => !allowedFields.includes(k));
    if (invalidFields.length > 0) {
      return res.status(400).json({ message: `Invalid fields: ${invalidFields.join(', ')}` });
    }
    const domain = req.user.domain;
    const projectIds = await getDomainProjectIds(domain);
    const tasks = await Task.find({ _id: { $in: taskIds }, project: { $in: projectIds }, isActive: true });
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found' });
    }
    const foundIds = tasks.map(t => String(t._id));
    const missing = taskIds.filter(id => !foundIds.includes(String(id)));
    const results = { updated: 0, skipped: 0, errors: [] };
    for (const task of tasks) {
      try {
        if (updates.assignee) {
          const isMember = await isUserProjectMember(task.project, updates.assignee);
          if (!isMember) {
            results.skipped++;
            results.errors.push({ id: task._id, message: 'Assignee not a project member' });
            continue;
          }
        }
        if (updates.sprint !== undefined) {
          if (task.sprint && String(task.sprint) !== String(updates.sprint)) {
            await Sprint.findByIdAndUpdate(task.sprint, { $pull: { tasks: task._id } });
          }
          if (updates.sprint) {
            await Sprint.findByIdAndUpdate(updates.sprint, { $addToSet: { tasks: task._id } });
          }
        }
        Object.assign(task, updates);
        await task.save();
        results.updated++;
      } catch (err) {
        results.errors.push({ id: task._id, message: err.message });
      }
    }
    res.json({ results, missing });
  } catch (error) {
    next(error);
  }
};
