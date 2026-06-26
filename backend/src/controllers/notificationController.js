const Notification = require('../models/Notification');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const User = require('../models/User');

exports.getNotifications = async (req, res, next) => {
  try {
    const filter = { user: req.user._id, domain: req.user.domain };
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;
    let query = Notification.find(filter).sort({ createdAt: -1 });
    if (page && limit) query = query.skip((page - 1) * limit).limit(limit);
    const notifs = await query;
    if (page && limit) {
      const total = await Notification.countDocuments(filter);
      return res.json({ data: notifs, total, page, totalPages: Math.ceil(total / limit) });
    }
    res.json(notifs);
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, domain: req.user.domain },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false, domain: req.user.domain },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.markUnread = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, domain: req.user.domain },
      { read: false },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id, domain: req.user.domain });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

exports.cleanupStale = async (req, res, next) => {
  try {
    const notifs = await Notification.find({
      user: req.user._id,
      domain: req.user.domain,
      type: 'meeting_reminder',
      'metadata.stale': { $ne: true },
    }).select('metadata').lean();

    const projectIds = [...new Set(notifs.map(n => n.metadata?.projectId?.toString()).filter(Boolean))];
    if (!projectIds.length) return res.json({ modified: 0 });

    const projects = await Project.find({ _id: { $in: projectIds } }).select('reviewCall').lean();
    const activeIds = new Set(projects.filter(p => p.reviewCall?.date).map(p => p._id.toString()));

    const staleIds = notifs.filter(n => n.metadata?.projectId && !activeIds.has(n.metadata.projectId.toString())).map(n => n._id);
    if (!staleIds.length) return res.json({ modified: 0 });

    await Notification.updateMany(
      { _id: { $in: staleIds } },
      { $set: { 'metadata.stale': true } }
    );

    res.json({ modified: staleIds.length });
  } catch (e) { next(e); }
};

exports.handleAction = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id, domain: req.user.domain });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    const action = notif.actions?.find(a => a.action === req.body.action);
    if (!action) return res.status(400).json({ message: 'Action not available' });

    notif.read = true;
    await notif.save();

    if (action.action === 'accept_invite' || action.action === 'decline_invite') {
      const { token, projectId, memberId } = action.payload;
      const member = await ProjectMember.findById(memberId);
      if (!member) return res.status(404).json({ message: 'Invitation not found' });
      if (member.status !== 'pending') return res.status(400).json({ message: 'Invitation already processed' });

      if (action.action === 'accept_invite') {
        member.user = req.user._id;
        member.status = 'active';
        member.acceptedAt = new Date();
        await member.save();
        await Project.findByIdAndUpdate(projectId, { $addToSet: { members: req.user._id } });
        if (member.invitedBy) {
          await Notification.create({
            user: member.invitedBy,
            domain: req.user.domain,
            type: 'project_update',
            title: `${req.user.name} accepted the invitation`,
            message: `${req.user.name} has accepted the invitation to join the project as ${member.projectRole}.`,
            link: `/projects/${projectId}`,
          });
        }
        return res.json({ message: 'Invitation accepted', status: 'active' });
      } else {
        member.status = 'declined';
        await member.save();
        if (member.invitedBy) {
          await Notification.create({
            user: member.invitedBy,
            domain: req.user.domain,
            type: 'project_update',
            title: `${req.user.name} declined the invitation`,
            message: `${req.user.name} has declined the invitation to join the project.`,
            link: `/projects/${projectId}`,
          });
        }
        return res.json({ message: 'Invitation declined', status: 'declined' });
      }
    }

    res.json({ message: 'Action handled' });
  } catch (error) {
    next(error);
  }
};
