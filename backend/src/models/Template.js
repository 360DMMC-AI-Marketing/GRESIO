const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  projectType: { type: String, enum: ['software', 'design', 'business', 'content', 'research'], default: 'software' },
  category:    { type: String, default: 'general' },
  price:       { type: Number, default: 0, min: 0 },
  phases: [{
    name:  { type: String, required: true },
    tasks: [{
      title:          { type: String, required: true },
      description:    { type: String, default: '' },
      estimatedHours: { type: Number, default: 4 },
    }],
  }],
  settings:     { type: mongoose.Schema.Types.Mixed, default: {} },
  author:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain:       { type: String, default: '' },
  downloads:    { type: Number, default: 0 },
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  ratingCount:  { type: Number, default: 0 },
  tags:         [{ type: String }],
  approved:     { type: Boolean, default: false },
  featured:     { type: Boolean, default: false },
}, { timestamps: true });

templateSchema.index({ domain: 1, approved: 1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ downloads: -1 });

module.exports = mongoose.model('Template', templateSchema);
