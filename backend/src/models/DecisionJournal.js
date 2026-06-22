const mongoose = require('mongoose');

const decisionJournalSchema = new mongoose.Schema({
  refType: { type: String, enum: ['task', 'sprint', 'project'], required: true },
  refId: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  decision: { type: String, required: true, trim: true },
  alternatives: { type: String, default: '' },
  rationale: { type: String, default: '' },
  outcome: { type: String, default: '' },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  domain: { type: String, default: '' },
}, { timestamps: true });

decisionJournalSchema.index({ refType: 1, refId: 1 });
decisionJournalSchema.index({ project: 1 });
decisionJournalSchema.index({ domain: 1, createdAt: -1 });
decisionJournalSchema.index({ tags: 1 });
decisionJournalSchema.index({ decision: 'text', rationale: 'text' });

module.exports = mongoose.model('DecisionJournal', decisionJournalSchema);
