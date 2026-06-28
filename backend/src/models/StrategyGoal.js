const mongoose = require('mongoose');

const strategyGoalSchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  weight: { type: Number, default: 50, min: 0, max: 100 },
  active: { type: Boolean, default: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  kpis: [{
    name: String,
    target: Number,
    current: { type: Number, default: 0 },
    unit: { type: String, default: '%' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

strategyGoalSchema.index({ domain: 1, active: 1 });

module.exports = mongoose.model('StrategyGoal', strategyGoalSchema);
