const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/crypto');

const integrationSchema = new mongoose.Schema({
  name: { type: String, enum: ['github', 'clickup', 'microsoft_graph'], required: true, unique: true },
  isConnected: { type: Boolean, default: false },
  credentials: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastSync: { type: Date },
  syncInterval: { type: Number, default: 5 },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, toJSON: { getters: true } });

integrationSchema.pre('save', function (next) {
  if (this.isModified('credentials') && this.credentials && typeof this.credentials === 'object') {
    this.credentials = encrypt(this.credentials);
  }
  next();
});

integrationSchema.methods.getDecryptedCredentials = function () {
  return decrypt(this.credentials);
};

integrationSchema.post('init', function () {
  this._originalCredentials = this.credentials;
});

module.exports = mongoose.model('Integration', integrationSchema);
