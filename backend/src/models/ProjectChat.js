const mongoose = require('mongoose');

const projectChatSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  messages:  [{
    role:    { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp:{ type: Date, default: Date.now },
  }],
}, { timestamps: true });

projectChatSchema.index({ project: 1 });

module.exports = mongoose.model('ProjectChat', projectChatSchema);
