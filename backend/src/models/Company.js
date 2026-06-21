const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/crypto');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
  plan: { type: String, enum: ['starter', 'team', 'enterprise'], default: 'starter' },
  outlookTenantId: { type: String, default: '' },
  outlookClientId: { type: String, default: '' },
  outlookClientSecret: { type: String, default: '' },
  logo: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  billingStatus: { type: String, enum: ['active', 'past_due', 'cancelled', 'trial'], default: 'trial' },
  wikiDepartments: {
    type: [String],
    default: ['General', 'Engineering', 'Product', 'Design', 'QA', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'],
  },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  mrr: { type: Number, default: 0 },
  billingEmail: { type: String, default: '' },
  paymentFailedAt: { type: Date },
}, { timestamps: true, toJSON: { getters: true } });

companySchema.pre('save', function (next) {
  if (this.isModified('outlookClientSecret') && this.outlookClientSecret && !this.outlookClientSecret.startsWith('enc:')) {
    this.outlookClientSecret = 'enc:' + encrypt(this.outlookClientSecret);
  }
  next();
});

companySchema.methods.getDecryptedOutlookSecret = function () {
  if (this.outlookClientSecret && this.outlookClientSecret.startsWith('enc:')) {
    return decrypt(this.outlookClientSecret.slice(4));
  }
  return this.outlookClientSecret;
};

module.exports = mongoose.model('Company', companySchema);
