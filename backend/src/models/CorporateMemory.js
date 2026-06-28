const mongoose = require('mongoose');

const corporateMemorySchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['decision', 'outcome', 'pattern', 'expertise', 'lesson'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  tags: [{ type: String }],
  embedding: [{ type: Number }],
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  projectName: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  outcome: { type: String, enum: ['success', 'failure', 'neutral', ''], default: '' },
  relevanceScore: { type: Number, default: 0 },
  relatedProjects: [{
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    name: String,
  }],
  lastAccessed: { type: Date, default: null },
}, { timestamps: true });

corporateMemorySchema.index({ domain: 1, type: 1 });
corporateMemorySchema.index({ tags: 1 });
corporateMemorySchema.index({ title: 'text', body: 'text' });
corporateMemorySchema.index({ domain: 1, createdAt: -1 });

module.exports = mongoose.model('CorporateMemory', corporateMemorySchema);
