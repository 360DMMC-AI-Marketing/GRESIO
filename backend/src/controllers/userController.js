const User = require('../models/User');
const Company = require('../models/Company');
const ProjectMember = require('../models/ProjectMember');
const TeamGroup = require('../models/TeamGroup');
const Activity = require('../models/Activity');
const WorkLog = require('../models/WorkLog');
const { enforceUserLimit } = require('../config/planLimits');

const GROUP_BY_USER_ROLE = {
  super_admin: { groupName: 'Administration Team', projectRole: 'admin' },
  admin: { groupName: 'Administration Team', projectRole: 'admin' },
  team_lead: { groupName: 'Project Management Team', projectRole: 'team_leader' },
  project_manager: { groupName: 'Project Management Team', projectRole: 'project_manager' },
  manager: { groupName: 'Project Management Team', projectRole: 'project_manager' },
  qa_tester: { groupName: 'QA & Testing Team', projectRole: 'qa_tester' },
  developer: { groupName: 'Development Team', projectRole: 'developer' },
  designer: { groupName: 'Design Team', projectRole: 'designer' },
  business_analyst: { groupName: 'Business Team', projectRole: 'business_analyst' },
  intern: { groupName: 'Interns', projectRole: 'intern' },
  other: { groupName: 'Development Team', projectRole: 'developer' },
};

async function moveUserToRoleDepartment(userId, newRole, domain) {
  const mapping = GROUP_BY_USER_ROLE[newRole] || GROUP_BY_USER_ROLE.other;
  const memberships = await ProjectMember.find({ user: userId });
  for (const m of memberships) {
    let group = await TeamGroup.findOne({ project: m.project, name: mapping.groupName });
    if (!group) {
      const def = TeamGroup.DEFAULT_GROUPS.find(d => d.name === mapping.groupName);
      group = await TeamGroup.create({
        project: m.project,
        domain,
        name: mapping.groupName,
        icon: def?.icon || '👥',
        roles: def?.roles || [],
        isDefault: true,
        order: def?.order || 0,
      });
    }
    m.projectRole = mapping.projectRole;
    m.teamGroup = group._id;
    await m.save();
  }
}

exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, hasOutlook } = req.query;
    const filter = { domain: req.user.domain, isActive: { $ne: false } };
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
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
    if (updates.role && updates.role !== target.role) {
      await moveUserToRoleDepartment(user._id, updates.role, req.user.domain);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.moveUserDepartment = async (req, res, next) => {
  try {
    let { groupNames } = req.body;
    if (!groupNames || !Array.isArray(groupNames)) return res.status(400).json({ message: 'groupNames array is required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Save departments on the user model
    user.department = groupNames;
    await user.save();

    const roleToProjectRole = {
      'Administration Team': 'admin',
      'Project Management Team': 'project_manager',
      'Development Team': 'developer',
      'QA & Testing Team': 'qa_tester',
      'Design Team': 'designer',
      'Business Team': 'business_analyst',
      'Interns': 'intern',
    };

    // Update existing memberships where the new departments include the membership's group
    const memberships = await ProjectMember.find({ user: user._id }).populate('teamGroup', 'name');
    for (const m of memberships) {
      const groupName = m.teamGroup?.name;
      if (!groupName) continue;
      if (groupNames.includes(groupName)) {
        // Membership's group is still valid
        m.projectRole = roleToProjectRole[groupName] || 'developer';
        await m.save();
      }
    }

    res.json({ message: `Departments updated`, departments: groupNames });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Never allow deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }
    // Never allow deleting the primary admin account
    if (user.email === 'admin@gresio.com') {
      return res.status(403).json({ message: 'Cannot delete the primary admin account' });
    }
    await ProjectMember.deleteMany({ user: user._id });
    await Activity.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User permanently deleted' });
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
