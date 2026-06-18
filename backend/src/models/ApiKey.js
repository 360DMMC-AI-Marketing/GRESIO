const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true, trim: true },
  key:       { type: String, required: true, unique: true },
  prefix:    { type: String, required: true },
  scopes:    [{ type: String, enum: ['projects:read', 'projects:write', 'tasks:read', 'tasks:write', 'reports:read', 'sprints:read', 'users:read', 'admin'] }],
  lastUsed:  { type: Date },
  expiresAt: { type: Date },
  active:    { type: Boolean, default: true },
  domain:    { type: String, default: '' },
}, { timestamps: true });

apiKeySchema.index({ user: 1 });
apiKeySchema.index({ domain: 1 });

apiKeySchema.statics.generateKey = function (prefix = 'gres') {
  const random = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${random}`;
};

apiKeySchema.statics.hashKey = function (key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

apiKeySchema.pre('save', function (next) {
  if (this.isModified('key')) {
    this.prefix = this.key.split('_')[0] + '_' + this.key.split('_')[1].substring(0, 4);
  }
  next();
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
