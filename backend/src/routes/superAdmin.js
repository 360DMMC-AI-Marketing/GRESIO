const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SuperUser = require('../models/SuperUser');
const SuperCompany = require('../models/SuperCompany');
const SuperNotification = require('../models/SuperNotification');

const env = require('../config/env');
const JWT_SECRET = env.JWT_SECRET || 'cios-jwt-secret';

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await SuperUser.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (e) { res.status(401).json({ message: 'Invalid token' }); }
};

const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ message: 'Super admin only' });
  next();
};

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await SuperUser.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/auth/me', auth, (req, res) => {
  res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

router.get('/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const companies = await SuperCompany.find({ isActive: true }).sort({ createdAt: -1 });
    const enriched = await Promise.all(companies.map(async (c) => {
      const userCount = await SuperUser.countDocuments({ domain: c.domain });
      return { ...c.toObject(), userCount };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await SuperCompany.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const userCount = await SuperUser.countDocuments({ domain: company.domain });
    const users = await SuperUser.find({ domain: company.domain }).sort({ createdAt: -1 });
    res.json({ ...company.toObject(), userCount, users });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, domain, plan, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !domain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required fields: name, domain, adminName, adminEmail, adminPassword' });
    }
    const existingDomain = await SuperCompany.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) return res.status(400).json({ message: 'Domain already exists' });
    const existingEmail = await SuperUser.findOne({ email: adminEmail.toLowerCase() });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });
    const company = await SuperCompany.create({ name, domain: domain.toLowerCase(), plan: plan || 'starter', createdBy: req.user._id });
    const admin = await SuperUser.create({ name: adminName, email: adminEmail.toLowerCase(), password: adminPassword, role: 'admin', domain: domain.toLowerCase(), isActive: true, status: 'active' });
    await SuperNotification.create({ title: 'New company created', message: `${name} was created by super admin with plan ${plan || 'starter'}.`, type: 'signup', companyId: company._id });
    res.status(201).json({ company, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await SuperCompany.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await SuperCompany.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.isActive = false;
    await company.save();
    res.json({ message: 'Company deactivated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/users', auth, superAdminOnly, async (req, res) => {
  try {
    const users = await SuperUser.find({ role: { $ne: 'super_admin' } }).sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, role, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required' });
    const existing = await SuperUser.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const user = await SuperUser.create({ name, email: email.toLowerCase(), password, role: role || 'admin', domain: domain || '', isActive: true, status: 'active' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, domain: user.domain });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/notifications', auth, superAdminOnly, async (req, res) => {
  try {
    const notifs = await SuperNotification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/notifications/:id/read', auth, superAdminOnly, async (req, res) => {
  try {
    const notif = await SuperNotification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/notifications/read-all', auth, superAdminOnly, async (req, res) => {
  try {
    await SuperNotification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/notifications/:id', auth, superAdminOnly, async (req, res) => {
  try {
    await SuperNotification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

async function seedSuperAdmin() {
  const existing = await SuperUser.findOne({ email: 'super@360dmmc.com' });
  if (!existing) {
    await SuperUser.create({ name: 'Sarah Chen', email: 'super@360dmmc.com', password: 'Admin@360dmmc2026', role: 'super_admin', domain: '360dmmc.com', isActive: true, status: 'active' });
    console.log('Super admin seeded: super@360dmmc.com / Admin@360dmmc2026');
  }
}

async function pollCompanyNotifications() {
  try {
    const companies = await SuperCompany.find({ isActive: true });
    for (const c of companies) {
      const signupExists = await SuperNotification.findOne({ companyId: c._id, type: 'signup' });
      if (!signupExists) {
        await SuperNotification.create({ title: 'New company registered', message: `${c.name} just signed up for a ${c.plan || 'starter'} plan.`, type: 'signup', companyId: c._id });
      }
      if (c.trialEndsAt) {
        const daysLeft = Math.ceil((new Date(c.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 3) {
          const exists = await SuperNotification.findOne({ companyId: c._id, type: 'reminder' });
          if (!exists) {
            const label = c.billingStatus === 'trial' ? 'Trial' : 'Plan';
            await SuperNotification.create({ title: `${label} ending soon`, message: `${c.name}'s ${label.toLowerCase()} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`, type: 'reminder', companyId: c._id });
          }
        }
      }
      if (c.billingStatus === 'past_due') {
        const exists = await SuperNotification.findOne({ companyId: c._id, type: 'alert' });
        if (!exists) {
          const daysOverdue = c.paymentFailedAt ? Math.ceil((Date.now() - new Date(c.paymentFailedAt)) / (1000 * 60 * 60 * 24)) : 1;
          await SuperNotification.create({ title: 'Payment past due', message: `${c.name} payment is past due (${daysOverdue} day${daysOverdue === 1 ? '' : 's'}).`, type: 'alert', companyId: c._id });
        }
      }
      if (c.billingStatus === 'cancelled') {
        const exists = await SuperNotification.findOne({ companyId: c._id, type: 'warning' });
        if (!exists) {
          await SuperNotification.create({ title: 'Plan cancelled', message: `${c.name} has cancelled their ${c.plan} plan.`, type: 'warning', companyId: c._id });
        }
      }
    }
  } catch (e) { console.error('Poll notification error:', e.message); }
}

module.exports = { router, seedSuperAdmin, pollCompanyNotifications };
