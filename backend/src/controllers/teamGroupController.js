const TeamGroup = require('../models/TeamGroup');
const { getDomainProjectIds } = require('../config/planLimits');

exports.getGroups = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id === req.params.projectId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const groups = await TeamGroup.find({ project: req.params.projectId, isArchived: false })
      .sort({ order: 1 });
    res.json(groups);
  } catch (e) { next(e); }
};

exports.createGroup = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id === req.params.projectId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const count = await TeamGroup.countDocuments({ project: req.params.projectId });
    const group = await TeamGroup.create({
      project: req.params.projectId,
      domain: req.user.domain,
      name: req.body.name,
      icon: req.body.icon || '👥',
      roles: req.body.roles || [],
      order: count,
    });
    res.status(201).json(group);
  } catch (e) { next(e); }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const allowed = ['name', 'icon', 'roles', 'order'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const group = await TeamGroup.findOneAndUpdate(
      { _id: req.params.groupId, project: { $in: projectIds } },
      updates,
      { new: true, runValidators: true }
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (e) { next(e); }
};

exports.archiveGroup = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const group = await TeamGroup.findOneAndUpdate(
      { _id: req.params.groupId, project: { $in: projectIds } },
      { isArchived: true },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const ProjectMember = require('../models/ProjectMember');
    await ProjectMember.updateMany(
      { teamGroup: req.params.groupId, project: { $in: projectIds } },
      { $unset: { teamGroup: '' } }
    );
    res.json({ message: 'Group archived' });
  } catch (e) { next(e); }
};

const ROLE_TO_DEPT = {
  super_admin: 'Administration Team', admin: 'Administration Team',
  team_lead: 'Project Management Team', project_manager: 'Project Management Team', manager: 'Project Management Team',
  qa_tester: 'QA & Testing Team',
  developer: 'Development Team',
  designer: 'Design Team',
  business_analyst: 'Business Team',
  intern: 'Interns',
};

exports.getAllDomainGrouped = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const projectIds = isAdmin
      ? (await require('../models/Project').find({ isActive: true }).select('_id').lean()).map(p => String(p._id))
      : await getDomainProjectIds(req.user.domain);
    const User = require('../models/User');
    const { DEFAULT_GROUPS } = require('../models/TeamGroup');
    const mongoose = require('mongoose');
    const projectObjectIds = projectIds.map(id => new mongoose.Types.ObjectId(id));

    const userFilter = { isActive: true };
    if (!isAdmin) userFilter.domain = req.user.domain;
    const allUsers = await User.find(userFilter).select('name email role department').lean();

    // Group users by department — each user can appear in multiple groups
    const groupedMap = {};
    const processedIds = new Set();
    for (const u of allUsers) {
      const deptNames = Array.isArray(u.department) && u.department.length > 0
        ? u.department
        : [ROLE_TO_DEPT[u.role] || 'Development Team'];
      for (const deptName of deptNames) {
        if (!groupedMap[deptName]) {
          groupedMap[deptName] = { members: [] };
        }
        groupedMap[deptName].members.push({
          user: { _id: u._id, name: u.name, email: u.email, role: u.role, department: u.department },
          memberships: [],
          assignmentCounts: { tasks: 0, testCases: 0, bugs: 0 },
        });
      }
      processedIds.add(String(u._id));
    }

    // Get existing department groups for icons/order
    const existingGroups = await TeamGroup.aggregate([
      { $match: { project: { $in: projectObjectIds }, isArchived: false } },
      { $group: { _id: '$name', icon: { $first: '$icon' }, order: { $first: '$order' }, roles: { $first: '$roles' } } },
      { $sort: { order: 1 } },
    ]);
    const egMap = Object.fromEntries(existingGroups.map(g => [g._id, g]));

    // Build group list
    const grouped = Object.entries(groupedMap).map(([name, data]) => {
      const info = egMap[name] || DEFAULT_GROUPS.find(d => d.name === name) || {};
      return {
        name,
        icon: info.icon || '👥',
        order: info.order ?? 99,
        roles: info.roles || [],
        members: data.members,
      };
    });

    // Add empty groups that exist in DB but have no users
    for (const g of existingGroups) {
      if (!grouped.some(gr => gr.name === g._id)) {
        grouped.push({
          name: g._id, icon: g.icon, order: g.order, roles: g.roles, members: [],
        });
      }
    }

    grouped.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    // Ungrouped = users whose role didn't map to any department
    const ungrouped = [];

    // Attach assignment counts
    const Task = require('../models/Task');
    const TestCase = require('../models/TestCase');
    const Bug = require('../models/Bug');
    const allUserIds = allUsers.map(u => u._id);

    if (allUserIds.length > 0) {
      const [taskCounts, testCaseCounts, bugCounts] = await Promise.all([
        Task.aggregate([
          { $match: { assignee: { $in: allUserIds }, isActive: true, status: { $ne: 'done' }, project: { $in: projectObjectIds } } },
          { $group: { _id: '$assignee', count: { $sum: 1 } } },
        ]),
        TestCase.aggregate([
          { $match: { assignee: { $in: allUserIds }, isActive: true, project: { $in: projectObjectIds } } },
          { $group: { _id: '$assignee', count: { $sum: 1 } } },
        ]),
        Bug.aggregate([
          { $match: { assignee: { $in: allUserIds }, isActive: true, project: { $in: projectObjectIds } } },
          { $group: { _id: '$assignee', count: { $sum: 1 } } },
        ]),
      ]);

      const tcMap = Object.fromEntries(taskCounts.map(r => [String(r._id), r.count]));
      const tccMap = Object.fromEntries(testCaseCounts.map(r => [String(r._id), r.count]));
      const bcMap = Object.fromEntries(bugCounts.map(r => [String(r._id), r.count]));

      const attachCounts = m => {
        const uid = m.user?._id ? String(m.user._id) : null;
        m.assignmentCounts = {
          tasks: uid ? (tcMap[uid] || 0) : 0,
          testCases: uid ? (tccMap[uid] || 0) : 0,
          bugs: uid ? (bcMap[uid] || 0) : 0,
        };
      };

      grouped.forEach(g => g.members.forEach(attachCounts));
      ungrouped.forEach(attachCounts);
    }

    // Attach real project memberships
    const ProjectMember = require('../models/ProjectMember');
    const allPMs = await ProjectMember.find({
      user: { $in: allUserIds },
      project: { $in: projectObjectIds },
      status: { $ne: 'inactive' },
    }).populate('project', 'name').lean();

    const membershipsByUser = {};
    for (const pm of allPMs) {
      const uid = String(pm.user);
      if (!membershipsByUser[uid]) membershipsByUser[uid] = [];
      membershipsByUser[uid].push({
        project: pm.project || null,
        projectRole: pm.projectRole,
        status: pm.status,
        memberId: pm._id,
      });
    }

    const attachMemberships = m => {
      const uid = m.user?._id ? String(m.user._id) : null;
      m.memberships = uid ? (membershipsByUser[uid] || []) : [];
    };

    grouped.forEach(g => g.members.forEach(attachMemberships));
    ungrouped.forEach(attachMemberships);

    res.json({ groups: grouped, ungrouped });
  } catch (e) { next(e); }
};

exports.getGroupedMembers = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id === req.params.projectId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const ProjectMember = require('../models/ProjectMember');
    const { status } = req.query;
    const filter = { project: req.params.projectId, status: { $ne: 'inactive' } };
    if (status) filter.status = status;
    const members = await ProjectMember.find(filter)
      .populate('user', 'name email avatar role')
      .populate('invitedBy', 'name email')
      .populate('teamGroup', 'name icon')
      .sort({ createdAt: -1 });
    const groups = await TeamGroup.find({ project: req.params.projectId, isArchived: false })
      .sort({ order: 1 });
    const grouped = groups.map(g => ({
      ...g.toObject(),
      members: members.filter(m => m.teamGroup && String(m.teamGroup._id || m.teamGroup) === String(g._id)),
    }));
    const ungrouped = members.filter(m => !m.teamGroup);
    res.json({ groups: grouped, ungrouped });
  } catch (e) { next(e); }
};
