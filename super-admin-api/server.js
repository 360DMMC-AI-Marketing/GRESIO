require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./User');
const Company = require('./Company');
const Notification = require('./Notification');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4000', credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-admin-secret';

// === AUTH MIDDLEWARE ===
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (e) { res.status(401).json({ message: 'Invalid token' }); }
};

const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ message: 'Super admin only' });
  next();
};

// === AUTH ROUTES ===
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!['super_admin'].includes(user.role)) return res.status(403).json({ message: 'Access denied' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

// === COMPANY ROUTES ===
app.get('/api/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true }).sort({ createdAt: -1 });
    const enriched = await Promise.all(companies.map(async (c) => {
      const userCount = await User.countDocuments({ domain: c.domain });
      return { ...c.toObject(), userCount };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const userCount = await User.countDocuments({ domain: company.domain });
    const users = await User.find({ domain: company.domain }).select('-password').sort({ createdAt: -1 });
    res.json({ ...company.toObject(), userCount, users });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, domain, plan, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !domain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required fields: name, domain, adminName, adminEmail, adminPassword' });
    }
    const existingDomain = await Company.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) return res.status(400).json({ message: 'Domain already exists' });
    const existingEmail = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const company = await Company.create({ name, domain: domain.toLowerCase(), plan: plan || 'starter', createdBy: req.user._id });
    const admin = await User.create({ name: adminName, email: adminEmail.toLowerCase(), password: adminPassword, role: 'admin', domain: domain.toLowerCase(), isActive: true, status: 'active' });
    await Notification.create({ title: 'New company created', message: `${name} was created by super admin with plan ${plan || 'starter'}.`, type: 'signup', companyId: company._id });
    res.status(201).json({ company, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch('/api/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.isActive = false;
    await company.save();
    res.json({ message: 'Company deactivated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// === USERS (admins) ROUTES ===
app.get('/api/users', auth, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super_admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/users', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, role, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email: email.toLowerCase(), password, role: role || 'admin', domain: domain || '', isActive: true, status: 'active' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, domain: user.domain });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// === NOTIFICATION ROUTES ===
app.get('/api/notifications', auth, superAdminOnly, async (req, res) => {
  try {
    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch('/api/notifications/:id/read', auth, superAdminOnly, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch('/api/notifications/read-all', auth, superAdminOnly, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/notifications/:id', auth, superAdminOnly, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// === HEALTH ===
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// === SEED SUPER ADMIN ===
async function seedSuperAdmin() {
  const existing = await User.findOne({ email: 'super@360dmmc.com' });
  if (!existing) {
    await User.create({ name: 'Sarah Chen', email: 'super@360dmmc.com', password: 'Admin@360dmmc2026', role: 'super_admin', domain: '360dmmc.com', isActive: true, status: 'active' });
    console.log('Super admin created: super@360dmmc.com / Admin@360dmmc2026');
  }
}

// === POLL FOR COMPANY NOTIFICATIONS ===
async function pollCompanyNotifications() {
  try {
    const companies = await Company.find({ isActive: true });
    for (const c of companies) {
      // New company signup
      const signupExists = await Notification.findOne({ companyId: c._id, type: 'signup' });
      if (!signupExists) {
        await Notification.create({ title: 'New company registered', message: `${c.name} just signed up for a ${c.plan || 'starter'} plan.`, type: 'signup', companyId: c._id });
      }

      // Trial / plan ending soon (within 3 days)
      if (c.trialEndsAt) {
        const daysLeft = Math.ceil((new Date(c.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 3) {
          const exists = await Notification.findOne({ companyId: c._id, type: 'reminder' });
          if (!exists) {
            const label = c.billingStatus === 'trial' ? 'Trial' : 'Plan';
            await Notification.create({ title: `${label} ending soon`, message: `${c.name}'s ${label.toLowerCase()} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`, type: 'reminder', companyId: c._id });
          }
        }
      }

      // Payment past due
      if (c.billingStatus === 'past_due') {
        const exists = await Notification.findOne({ companyId: c._id, type: 'alert' });
        if (!exists) {
          const daysOverdue = c.paymentFailedAt ? Math.ceil((Date.now() - new Date(c.paymentFailedAt)) / (1000 * 60 * 60 * 24)) : 1;
          await Notification.create({ title: 'Payment past due', message: `${c.name} payment is past due (${daysOverdue} day${daysOverdue === 1 ? '' : 's'}).`, type: 'alert', companyId: c._id });
        }
      }

      // Plan cancelled
      if (c.billingStatus === 'cancelled') {
        const exists = await Notification.findOne({ companyId: c._id, type: 'warning' });
        if (!exists) {
          await Notification.create({ title: 'Plan cancelled', message: `${c.name} has cancelled their ${c.plan} plan.`, type: 'warning', companyId: c._id });
        }
      }
    }
  } catch (e) { console.error('Poll notification error:', e.message); }
}

// === START ===
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cios')
  .then(async () => {
    await seedSuperAdmin();
    await pollCompanyNotifications();
    setInterval(pollCompanyNotifications, 60000);
    app.listen(PORT, () => console.log(`Super Admin API running on port ${PORT}`));
  })
  .catch(e => { console.error('MongoDB error:', e.message); process.exit(1); });
