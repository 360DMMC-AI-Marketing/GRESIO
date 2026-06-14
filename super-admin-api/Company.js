const mongoose = require('mongoose');
const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
  plan: { type: String, enum: ['starter', 'team', 'enterprise'], default: 'starter' },
  logo: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  billingStatus: { type: String, enum: ['active', 'past_due', 'cancelled', 'trial'], default: 'trial' },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  mrr: { type: Number, default: 0 },
  billingEmail: { type: String, default: '' },
  paymentFailedAt: { type: Date },
}, { timestamps: true });
module.exports = mongoose.model('Company', companySchema);
