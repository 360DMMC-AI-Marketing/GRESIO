const User = require('../models/User');
const Notification = require('../models/Notification');

async function notifyAdmins(domain, type, title, message, link, metadata) {
  try {
    const admins = await User.find({ role: 'admin', domain, isActive: true }).select('_id');
    if (!admins.length) return;

    const docs = admins.map(admin => ({
      user: admin._id, domain, type, title, message, link, metadata: metadata || {},
    }));

    const created = await Notification.insertMany(docs);

    const io = require('../app').io;
    for (const n of created) {
      try { io.to(`user:${n.user}`).emit('notification', n.toObject()); } catch (e) {}
    }
  } catch (e) {
    console.error('Failed to notify admins:', e.message);
  }
}

module.exports = { notifyAdmins };
