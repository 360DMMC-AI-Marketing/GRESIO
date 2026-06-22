const User = require('../models/User');
const Company = require('../models/Company');
const Activity = require('../models/Activity');
const WorkLog = require('../models/WorkLog');
const { enforceUserLimit } = require('../config/planLimits');

exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, hasOutlook } = req.query;
    const filter = { domain: req.user.domain, isActive: { $ne: false } };
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (hasOutlook === 'true') filter.outlookEmail = { $ne: '' };

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const hasPagination = !isNaN(page) && !isNaN(limit);

    let usersQuery = User.find(filter).populate('assignedProjects');
    if (hasPagination) {
      usersQuery = usersQuery.skip((page - 1) * limit).limit(limit);
    }

    const users = await usersQuery;

    if (hasPagination) {
      const total = await User.countDocuments(filter);
      return res.json({ data: users, total, page, totalPages: Math.ceil(total / limit) });
    }

    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, domain: req.user.domain }).populate('assignedProjects');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, outlookEmail, githubUsername, clickupId, teamsId } = req.body;
    const domain = req.user.domain || email.split('@')[1]?.toLowerCase() || '';
    const company = await Company.findOne({ domain });
    if (company) {
      const result = await enforceUserLimit(company.domain, company.plan);
      if (!result.allowed) {
        return res.status(403).json({ message: result.message });
      }
    }
    const user = await User.create({
      name, email, password, domain,
      role: role || 'developer',
      outlookEmail: outlookEmail || '',
      githubUsername: githubUsername || '',
      clickupId: clickupId || '',
      teamsId: teamsId || '',
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'role', 'status', 'isActive', 'assignedProjects',
                     'githubUsername', 'clickupId', 'teamsId', 'outlookEmail'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const target = await User.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Role change restrictions
    if (updates.role && updates.role !== target.role) {
      // Cannot demote an admin
      if (target.role === 'admin') {
        return res.status(403).json({ message: 'Admin role cannot be changed' });
      }
      // Only admins can promote someone to admin
      if (updates.role === 'admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can assign the admin role' });
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      updates,
      { new: true, runValidators: true }
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.getUserActivity = async (req, res, next) => {
  try {
    const target = await User.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const activities = await Activity.find({
      user: req.params.id,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 }).limit(100);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, domain: req.user.domain }).populate('assignedProjects', 'name status');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [activities, openTasks, completedCount] = await Promise.all([
      Activity.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(50).lean(),
      Task.find({ assignee: req.params.id, status: { $ne: 'done' }, isActive: true })
        .select('title status priority project deadline')
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      Task.countDocuments({ assignee: req.params.id, status: 'done', isActive: true }),
    ]);

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const completedThisWeek = await Task.countDocuments({
      assignee: req.params.id, status: 'done', isActive: true,
      updatedAt: { $gte: thisWeekStart },
    });

    res.json({ user, activities, openTasks, completedCount, completedThisWeek });
  } catch (error) {
    next(error);
  }
};

exports.getCapacity = async (req, res, next) => {
  try {
    const domain = req.user.domain;
    const users = await User.find({ domain, isActive: { $ne: false }, role: { $ne: 'super_admin' } })
      .select('name email role avatar status')
      .sort('name')
      .lean();

    const now = new Date();
    const weekStarts = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i * 7 - d.getDay());
      d.setHours(0, 0, 0, 0);
      if (i === 0 || d > weekStarts[weekStarts.length - 1]) weekStarts.push(d);
    }
    const sixWeeksFromNow = new Date(weekStarts[weekStarts.length - 1]);
    sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 7);

    const userIds = users.map(u => u._id.toString());

    const startStr = weekStarts[0].toISOString().split('T')[0];
    const endStr = sixWeeksFromNow.toISOString().split('T')[0];

    const worklogs = await WorkLog.find({
      user: { $in: userIds },
      date: { $gte: startStr, $lt: endStr },
    })
      .populate('project', 'name')
      .lean();

    const capacityMap = {};
    for (const uid of userIds) {
      const periods = [];

      for (let i = 0; i < weekStarts.length; i++) {
        const ws = weekStarts[i];
        const we = new Date(ws);
        we.setDate(we.getDate() + 7);

        const wsStr = ws.toISOString().split('T')[0];
        const weStr = we.toISOString().split('T')[0];

        const weekLogs = worklogs.filter(wl =>
          wl.user.toString() === uid && wl.date >= wsStr && wl.date < weStr
        );

        const totalHours = weekLogs.reduce((s, w) => s + (w.hours || 0), 0);
        periods.push({
          label: ws.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          start: ws.toISOString(),
          totalHours: Math.round(totalHours * 10) / 10,
          capacity: 40,
          tasks: weekLogs.map(w => ({
            _id: w._id,
            title: w.taskTitle || w.description || 'Worklog entry',
            hours: w.hours || 0,
            project: w.project?.name || 'No project',
            category: w.category,
            date: w.date,
          })),
        });
      }

      capacityMap[uid] = periods;
    }

    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      status: u.status,
      periods: capacityMap[u._id.toString()],
    }));

    res.json({ users: result, sprints: [], weekStarts: weekStarts.map(w => w.toISOString()) });
  } catch (error) {
    next(error);
  }
};
