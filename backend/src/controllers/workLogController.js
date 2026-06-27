const WorkLog = require('../models/WorkLog');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { getDomainProjectIds } = require('../config/planLimits');

exports.create = async (req, res, next) => {
  try {
    const { date, project, task, taskTitle, hours, category, description, notes, mood, tags } = req.body;
    if (!hours) {
      return res.status(400).json({ message: 'Hours are required' });
    }
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    if (project) {
      const projectIds = await getDomainProjectIds(req.user.domain, req.user);
      if (!projectIds.includes(project.toString())) {
        return res.status(403).json({ message: 'Project not in your domain' });
      }
    }
    const doc = await WorkLog.create({
      user: req.user._id, date, project, task, taskTitle, hours,
      category: category || 'development', description: description || '',
      notes: notes || '', mood: mood || 'good', tags: tags || [],
    });
    const populated = await WorkLog.findById(doc._id)
      .populate('project', 'name')
      .populate('task', 'title')
      .lean();

    // Notify other project members about the worklog
    if (populated.project) {
      const proj = await Project.findById(populated.project._id).select('members').lean();
      if (proj && proj.members.length > 0) {
        const Notification = require('../models/Notification');
        const otherMembers = proj.members.filter(m => m.toString() !== req.user._id.toString());
        for (const memberId of otherMembers) {
          await Notification.create({
            user: memberId,
            domain: req.user.domain,
            type: 'worklog_added',
            title: `${req.user.name} logged ${hours}h on ${populated.project.name}`,
            message: description || (taskTitle || 'Work logged'),
            link: `/projects/${populated.project._id}`,
            metadata: { worklogId: doc._id, projectId: populated.project._id, userId: req.user._id },
          });
        }
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate entry: you already logged this task today' });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { hours, category, description, notes, mood, tags } = req.body;
    const existing = await WorkLog.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Work log not found' });
    if (!existing.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    if (existing.project && !projectIds.includes(existing.project.toString())) {
      return res.status(403).json({ message: 'Project not in your domain' });
    }
    const doc = await WorkLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { hours, category, description, notes, mood, tags },
      { new: true, runValidators: true }
    ).populate('project', 'name').populate('task', 'title');
    res.json(doc);
  } catch (error) {
    next(error);
  }
};

exports.getMyLogs = async (req, res, next) => {
  try {
    const { date } = req.query;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const filter = { user: req.user._id, project: { $in: projectIds } };
    if (date) filter.date = date;
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;
    let query = WorkLog.find(filter).populate('project', 'name').populate('task', 'title').sort({ createdAt: -1 }).lean();
    if (page && limit) query = query.skip((page - 1) * limit).limit(limit);
    const docs = await query;
    if (page && limit) {
      const total = await WorkLog.countDocuments(filter);
      return res.json({ data: docs, total, page, totalPages: Math.ceil(total / limit) });
    }
    res.json(docs);
  } catch (error) {
    next(error);
  }
};

exports.getTeamLogs = async (req, res, next) => {
  try {
    if (!['admin', 'project_manager', 'team_lead', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const { date } = req.query;
    const filter = { project: { $in: projectIds } };
    if (date) filter.date = date;
    else {
      const today = new Date().toISOString().slice(0, 10);
      filter.date = today;
    }
    const docs = await WorkLog.find(filter)
      .populate('user', 'name email avatar role')
      .populate('project', 'name')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json(docs);
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const days = 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);
    const docs = await WorkLog.find({
      user: userId,
      date: { $gte: startStr },
    }).populate('project', 'name').populate('task', 'title').sort({ date: -1, createdAt: -1 }).lean();
    res.json(docs);
  } catch (error) {
    next(error);
  }
};

exports.deleteWorkLog = async (req, res, next) => {
  try {
    const existing = await WorkLog.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Work log not found' });
    if (!existing.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await WorkLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Work log deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getUserProjectsAndTasks = async (req, res, next) => {
  try {
    const domainProjectIds = await getDomainProjectIds(req.user.domain, req.user);
    const taskProjectIds = await Task.distinct('project', { assignee: req.user._id, isActive: true, project: { $in: domainProjectIds } });
    const projectIds = taskProjectIds.filter(id => domainProjectIds.includes(id.toString()));
    const projects = await Project.find({ _id: { $in: projectIds }, isActive: true }).select('name').lean();
    const tasks = await Task.find({ assignee: req.user._id, isActive: true, project: { $in: domainProjectIds } }).select('title project').populate('project', 'name').lean();
    res.json({ projects, tasks });
  } catch (error) {
    next(error);
  }
};
