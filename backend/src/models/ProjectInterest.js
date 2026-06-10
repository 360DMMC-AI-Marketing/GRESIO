const mongoose = require('mongoose');

const projectInterestSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  interestTags: [{ type: String }],
  priorityFeatures: [{ type: String }],
  ignorePatterns: [{ type: String }],
  autoDeleteEnabled: { type: Boolean, default: true },
  autoDeleteDays: { type: Number, default: 7, min: 1, max: 30 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ProjectInterest', projectInterestSchema);
