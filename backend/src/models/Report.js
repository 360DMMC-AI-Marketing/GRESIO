const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['admin', 'client'], required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  generatedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
}, { timestamps: true });

reportSchema.index({ project: 1, type: 1 }, { unique: true });
reportSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
