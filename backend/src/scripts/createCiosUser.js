const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/gresio');
  const email = 'admin@cios.com';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: 'Admin Cios', email, password: 'password123', role: 'admin', domain: 'cios.com', isActive: true, status: 'active' });
    console.log('Created: admin@cios.com');
  } else {
    console.log('User already exists');
  }
  let company = await Company.findOne({ domain: 'cios.com' });
  if (!company) {
    company = await Company.create({ name: 'Cios Company', domain: 'cios.com', plan: 'enterprise', isActive: true });
    console.log('Created company for cios.com');
  } else {
    console.log('Company already exists');
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
