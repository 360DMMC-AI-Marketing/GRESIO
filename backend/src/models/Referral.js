const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredEmail: { type: String, required: true, lowercase: true, trim: true },
  code:          { type: String, required: true, index: true },
  referredUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:        { type: String, enum: ['pending', 'signed_up', 'rewarded'], default: 'pending' },
  rewardGiven:   { type: Boolean, default: false },
  signedUpAt:    { type: Date },
  rewardedAt:    { type: Date },
}, { timestamps: true });

referralSchema.index({ referrer: 1 });
referralSchema.index({ referredEmail: 1 });

module.exports = mongoose.model('Referral', referralSchema);
