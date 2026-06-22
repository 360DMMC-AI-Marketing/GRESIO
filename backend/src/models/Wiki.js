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
  highlights: { type: [String], default: [] },
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, value: { type: Number, min: 1, max: 5 } }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

wikiSchema.virtual('averageRating').get(function () {
  if (!this.ratings?.length) return 0;
  const sum = this.ratings.reduce((a, r) => a + r.value, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

wikiSchema.index({ domain: 1 });
wikiSchema.index({ slug: 1, domain: 1 }, { unique: true });
wikiSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Wiki', wikiSchema);
