const mongoose = require('mongoose');

const superNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['signup', 'alert', 'upgrade', 'warning', 'admin', 'reminder', 'health_down', 'health_up'], default: 'signup' },
  read: { type: Boolean, default: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

superNotificationSchema.index({ createdAt: -1 });
superNotificationSchema.index({ read: 1 });

module.exports = mongoose.model('SuperNotification', superNotificationSchema);
