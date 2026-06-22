const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'fixed', 'closed', 'reopened'],
    default: 'open',
  },
  testCase: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  feature: { type: String, default: '' },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  stepsToReproduce: [{ type: String }],
  expectedBehavior: { type: String, default: '' },
  actualBehavior: { type: String, default: '' },
  screenshot: { type: String, default: '' },
  environment: { type: String, default: '' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, default: '' },
  retestCount: { type: Number, default: 0 },
  linkedBugTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
}, { timestamps: true });

bugSchema.index({ project: 1, status: 1 });
bugSchema.index({ testCase: 1 });
bugSchema.index({ title: 'text', description: 'text', feature: 'text' });

module.exports = mongoose.model('Bug', bugSchema);
