const mongoose = require('mongoose');

const autopsyEventSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  domain: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  eventType: {
    type: String,
    enum: ['status_change', 'deadline_shift', 'member_add', 'member_remove', 'decision',
           'blocker', 'scope_change', 'task_create', 'task_complete', 'task_assign',
           'sprint_create', 'sprint_close', 'phase_change', 'budget_change', 'note'],
    required: true,
  },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String, default: '' },
  daysSinceProjectStart: { type: Number },
}, { timestamps: true });

autopsyEventSchema.index({ projectId: 1, timestamp: -1 });
autopsyEventSchema.index({ domain: 1, eventType: 1 });

module.exports = mongoose.model('AutopsyEvent', autopsyEventSchema);
