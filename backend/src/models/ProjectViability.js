const mongoose = require('mongoose');

const projectViabilitySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  domain: { type: String, required: true, index: true },
  score: { type: Number, default: 50, min: 0, max: 100 },
  trajectory: { type: String, enum: ['rising', 'stable', 'falling', 'crash'], default: 'stable' },
  recommendation: { type: String, enum: ['go', 'adjust', 'kill'], default: 'go' },
  patternMatches: [{
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    name: String,
    similarity: Number,
    outcome: String,
    warnings: [String],
  }],
  earlySignals: [{
    type: { type: String, enum: ['scope_drift', 'blocker_cluster', 'deadline_shift', 'decision_quality', 'velocity_drop', 'team_overload'] },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    day: Number,
    message: String,
    resolved: { type: Boolean, default: false },
  }],
  riskFactors: [{
    factor: String,
    impact: { type: Number, min: 0, max: 100 },
    description: String,
  }],
  history: [{
    date: Date,
    score: Number,
    label: String,
  }],
  projectedSavings: { type: Number, default: 0 },
  lastComputed: { type: Date, default: Date.now },
}, { timestamps: true });

projectViabilitySchema.index({ domain: 1, score: -1 });

module.exports = mongoose.model('ProjectViability', projectViabilitySchema);
