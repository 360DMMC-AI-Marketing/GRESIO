const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const TestingItem = require('../models/TestingItem');
const Notification = require('../models/Notification');
const { updateProjectProgress } = require('./taskController');
const { generateTestsFromTasks } = require('./testCaseController');
const { evaluateProjectPhase } = require('../services/phaseService');
const { getDomainProjectIds } = require('../config/planLimits');

const populate = q => q
  .populate('project', 'name status')
  .populate('createdBy', 'name')
  .populate({ path: 'tasks', populate: { path: 'assignee', select: 'name avatar role' } })
  .populate({ path: 'testingItems', populate: { path: 'assignee', select: 'name avatar role' } });

exports.getSprints = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds } };
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    const sprints = await populate(Sprint.find(filter).sort({ startDate: -1 }));
    res.json(sprints);
  } catch (e) { next(e); }
};

exports.getSprintById = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const sprint = await populate(Sprint.findOne({ _id: req.params.id, project: { $in: projectIds } }));
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    res.json(sprint);
  } catch (e) { next(e); }
};

exports.createSprint = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (req.body.project && !projectIds.includes(req.body.project)) {
      return res.status(403).json({ message: 'Project not in your domain' });
    }
    let tasks = req.body.tasks || [];
    if ((!tasks || tasks.length === 0) && req.body.project) {
      const projectTasks = await Task.find({ project: req.body.project, isActive: true }).select('_id');
      tasks = projectTasks.map(t => t._id);
    }
    const sprint = await Sprint.create({ ...req.body, tasks, createdBy: req.user._id });
    if (req.body.project) {
      await evaluateProjectPhase(req.body.project);
      const Project = require('../models/Project');
      const proj = await Project.findById(req.body.project).select('members name');
      if (proj?.members) {
        const memberIds = proj.members.filter(m => String(m) !== String(req.user._id));
        for (const mid of memberIds) {
          await Notification.create({
            user: mid,
            domain: req.user.domain,
            type: 'project_update',
            title: `New sprint: ${sprint.name}`,
            message: `A new sprint "${sprint.name}" has been created in ${proj.name}`,
            link: `/sprints?sprintId=${sprint._id}`,
          }).catch(() => {});
        }
      }
    }
    res.status(201).json(await populate(Sprint.findById(sprint._id)));
  } catch (e) { next(e); }
};

exports.updateSprint = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const allowed = ['name', 'goal', 'startDate', 'endDate', 'status', 'completedAt'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    let isReopen = false;
    if (req.body.status === 'completed') {
      const sprint = await Sprint.findOne({ _id: req.params.id, project: { $in: projectIds } }).select('createdBy status name');
      if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
      const MANAGER_ROLES = ['admin', 'project_manager', 'team_lead'];
      const isManager = MANAGER_ROLES.includes(req.user.role);
      const isCreator = sprint.createdBy && String(sprint.createdBy) === String(req.user._id);
      if (!isManager && !isCreator) {
        return res.status(403).json({ message: 'Only the sprint creator, project manager, team lead, or admin can mark a sprint as completed' });
      }
      updates.completedAt = new Date();
      generateTestsFromTasks(sprint.project, req.params.id, null, req.user._id, req.user.domain).catch(() => {});
      const Project = require('../models/Project');
      const proj = await Project.findById(sprint.project).select('members name');
      if (proj?.members) {
        for (const mid of proj.members) {
          if (String(mid) === String(req.user._id)) continue;
          await Notification.create({
            user: mid,
            domain: req.user.domain,
            type: 'project_update',
            title: `Sprint completed: ${sprint.name}`,
            message: `The sprint "${sprint.name}" in ${proj.name} has been marked as completed`,
            link: `/sprints?sprintId=${req.params.id}`,
          }).catch(() => {});
        }
      }
    } else if (req.body.status === 'active') {
      const prev = await Sprint.findOne({ _id: req.params.id, project: { $in: projectIds } }).select('status');
      if (prev && prev.status === 'completed') isReopen = true;
      updates.completedAt = null;
    }
    const sprint = await populate(Sprint.findOneAndUpdate({ _id: req.params.id, project: { $in: projectIds } }, updates, { new: true }));
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    if (sprint.project && !isReopen) { updateProjectProgress(sprint.project); await evaluateProjectPhase(sprint.project); }
    res.json(sprint);
  } catch (e) { next(e); }
};

exports.addTaskToSprint = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const sprint = await populate(Sprint.findOneAndUpdate({ _id: req.params.id, project: { $in: projectIds } }, { $addToSet: { tasks: req.body.taskId } }, { new: true }));
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    if (req.body.taskId) {
      const TaskModel = require('../models/Task');
      const task = await TaskModel.findById(req.body.taskId);
      if (task) {
        generateTestsFromTasks(sprint.project, sprint._id, [task], req.user._id, req.user.domain).catch(() => {});
      }
    }
    if (sprint.project) {
      await evaluateProjectPhase(sprint.project);
    }
    res.json(sprint);
  } catch (e) { next(e); }
};

exports.removeTaskFromSprint = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const sprint = await populate(Sprint.findOneAndUpdate({ _id: req.params.id, project: { $in: projectIds } }, { $pull: { tasks: req.params.taskId } }, { new: true }));
    res.json(sprint);
  } catch (e) { next(e); }
};

exports.deleteSprint = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const sprint = await Sprint.findOne({ _id: req.params.id, project: { $in: projectIds } });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    const projectId = sprint?.project;
    await Sprint.findOneAndDelete({ _id: req.params.id, project: { $in: projectIds } });
    if (projectId) { updateProjectProgress(projectId); await evaluateProjectPhase(projectId); }
    res.json({ message: 'Sprint deleted' });
  } catch (e) { next(e); }
};
