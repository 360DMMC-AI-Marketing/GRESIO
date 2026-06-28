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
  industry: { type: String, default: '' },
  country: { type: String, default: '' },
  timezone: { type: String, default: '' },
  website: { type: String, default: '' },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },
  departments: [{
    name: { type: String, default: '' },
    headcount: { type: Number, default: 0 },
    type: { type: String, default: '' },
  }],
  typicalProjects: [String],
  techStack: [String],
  profileCompleted: { type: Boolean, default: false },
  foundedYear: { type: Number, default: null },
  companySize: { type: String, default: '' },
  mission: { type: String, default: '' },
  vision: { type: String, default: '' },
  coreValues: [String],
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  github: { type: String, default: '' },
  brandColor: { type: String, default: '#6366f1' },
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
