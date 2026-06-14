const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const superUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['super_admin'], default: 'super_admin' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  domain: { type: String, default: '360dmmc.com' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

superUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
superUserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
superUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};
module.exports = mongoose.model('SuperUser', superUserSchema);
