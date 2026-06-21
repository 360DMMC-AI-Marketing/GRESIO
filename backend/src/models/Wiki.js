const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const contributorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const wikiSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, default: '' },
  content: { type: String, default: '' },
  files: [fileSchema],
  contributors: [contributorSchema],
  domain: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  department: { type: String, default: 'General', trim: true },
}, { timestamps: true });

wikiSchema.index({ domain: 1 });
wikiSchema.index({ slug: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model('Wiki', wikiSchema);
