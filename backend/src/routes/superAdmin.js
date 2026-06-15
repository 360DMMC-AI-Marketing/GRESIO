const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SuperUser = require('../models/SuperUser');
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');

const env = require('../config/env');
const JWT_SECRET = env.JWT_SECRET || 'gresio-jwt-secret';

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
    const companies = await Company.find({ isActive: true }).sort({ createdAt: -1 });
    const enriched = await Promise.all(companies.map(async (c) => {
      const userCount = await User.countDocuments({ domain: c.domain });
      const projectCount = await Project.countDocuments({ domain: c.domain });
      return { ...c.toObject(), userCount, projectCount, type: '', status: 'active', overdue: 0, progress: 0, mrr: '$0' };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const userCount = await User.countDocuments({ domain: company.domain });
    const projectCount = await Project.countDocuments({ domain: company.domain });
    const users = await User.find({ domain: company.domain }).sort({ createdAt: -1 });
    res.json({ ...company.toObject(), userCount, projectCount, users, status: 'active', overdue: 0, progress: 0, mrr: '$0' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, domain, plan, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !domain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required fields: name, domain, adminName, adminEmail, adminPassword' });
    }
    const existingDomain = await Company.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) return res.status(400).json({ message: 'Domain already exists' });
    const existingEmail = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const company = await Company.create({ name, domain: domain.toLowerCase(), plan: plan || 'starter' });
    const admin = await User.create({ name: adminName, email: adminEmail.toLowerCase(), password: adminPassword, role: 'admin', domain: domain.toLowerCase(), isActive: true, status: 'active' });
    res.status(201).json({ company, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.isActive = false;
    await company.save();
    res.json({ message: 'Company deactivated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/users', auth, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, role, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email: email.toLowerCase(), password, role: role || 'admin', domain: domain || '', isActive: true, status: 'active' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, domain: user.domain });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/notifications', auth, superAdminOnly, async (req, res) => {
  try {
    const [recentCompanies, recentUsers] = await Promise.all([
      Company.find().sort({ createdAt: -1 }).limit(10),
      User.find().sort({ createdAt: -1 }).limit(10),
    ]);
    const activities = [
      ...recentCompanies.map(c => ({
        _id: `company_${c._id}`,
        title: 'New company registered',
        message: `${c.name} signed up for the ${c.plan} plan.`,
        createdAt: c.createdAt,
        type: 'signup',
      })),
      ...recentUsers.map(u => ({
        _id: `user_${u._id}`,
        title: 'New user joined',
        message: `${u.name} joined as ${u.role}.`,
        createdAt: u.createdAt,
        type: 'admin',
      })),
    ];
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(activities.slice(0, 30));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/notifications/:id/read', auth, superAdminOnly, async (req, res) => {
  res.json({ message: 'ok' });
});

router.patch('/notifications/read-all', auth, superAdminOnly, async (req, res) => {
  res.json({ message: 'All marked as read' });
});

router.delete('/notifications/:id', auth, superAdminOnly, async (req, res) => {
  res.json({ message: 'Notification dismissed' });
});

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function seedSuperAdmin() {
  const existing = await SuperUser.findOne({ email: 'super@360dmmc.com' });
  if (!existing) {
    await SuperUser.create({ name: 'Sarah Chen', email: 'super@360dmmc.com', password: 'Admin@360dmmc2026', role: 'super_admin', domain: '360dmmc.com', isActive: true, status: 'active' });
    console.log('Super admin seeded: super@360dmmc.com / Admin@360dmmc2026');
  }
}

module.exports = { router, seedSuperAdmin };
