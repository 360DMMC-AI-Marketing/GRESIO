const mongoose = require('mongoose');
const superNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  type: { type: String, enum: ['signup', 'reminder', 'alert', 'warning', 'info'], default: 'info' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperCompany' },
  read: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('SuperNotification', superNotificationSchema);
