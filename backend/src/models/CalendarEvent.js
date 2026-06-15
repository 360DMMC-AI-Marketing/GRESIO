const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  type: { type: String, enum: ['task', 'milestone', 'event', 'reminder'], default: 'event' },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedTo: {
    model: { type: String, enum: ['Project', 'Sprint', 'Task', null], default: null },
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
}, { timestamps: true });

calendarEventSchema.index({ domain: 1, date: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
