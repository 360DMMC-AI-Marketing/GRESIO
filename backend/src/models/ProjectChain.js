const mongoose = require('mongoose');

const projectChainSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, required: true, index: true },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ProjectChain', projectChainSchema);
