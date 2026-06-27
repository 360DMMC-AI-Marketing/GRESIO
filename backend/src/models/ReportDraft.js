const mongoose = require('mongoose');

const draftSectionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  visible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { _id: false });

const reportDraftSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['admin', 'client'], required: true },
  sections: [draftSectionSchema],
  design: {
    theme: { type: String, default: 'modern' },
    primaryColor: { type: String, default: '#2347e8' },
    font: { type: String, default: 'Inter' },
    coverStyle: { type: String, default: 'standard' },
  },
  cover: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, default: 1 },
}, { timestamps: true });

reportDraftSchema.index({ project: 1, type: 1 });

module.exports = mongoose.model('ReportDraft', reportDraftSchema);
