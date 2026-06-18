const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: { type: String, default: '' },
  projectType: { type: String, default: '' },
  projectStatus: { type: String, default: '' },
  domain: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  analyzedMonth: { type: String, default: '' },
  snapshotData: { type: mongoose.Schema.Types.Mixed, default: null },

  features: [{ type: String }],
  techStack: [{ type: String }],
  summary: { type: String, default: '' },
  risks: [{ project: String, risk: String, level: String }],
  keyDecisions: [{ decision: String, rationale: String, outcome: String }],
  stats: {
    totalTasks: { type: Number, default: 0 },
    doneTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    totalSprints: { type: Number, default: 0 },
    totalBugs: { type: Number, default: 0 },
    totalDecisions: { type: Number, default: 0 },
  },
  members: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, name: String, role: String, avatar: String }],
  patterns: [{ title: String, detail: String, severity: String, recommendation: String }],
  projectDescription: { type: String, default: '' },
  client: { type: String, default: '' },
  repositories: [{ url: String, label: String }],
  githubRepo: { type: String, default: '' },
  documents: [{ title: { type: String }, type: { type: String }, url: { type: String }, fileUrl: { type: String }, fileType: { type: String }, fileName: { type: String } }],
  technicalUrls: {
    frontendRepo: { type: String, default: '' },
    backendRepo: { type: String, default: '' },
    databaseRepo: { type: String, default: '' },
    mobileRepo: { type: String, default: '' },
    apiDocsUrl: { type: String, default: '' },
    stagingUrl: { type: String, default: '' },
    productionUrl: { type: String, default: '' },
  },
  generatedAt: { type: Date },
}, { timestamps: true });

aiAnalysisSchema.index({ domain: 1, status: 1 });
aiAnalysisSchema.index({ projectName: 'text', features: 'text', summary: 'text' });

module.exports = mongoose.model('AiAnalysis', aiAnalysisSchema);
