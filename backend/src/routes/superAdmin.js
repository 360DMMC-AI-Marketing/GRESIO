const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const SuperNotification = require('../models/SuperNotification');

const env = require('../config/env');
const JWT_SECRET = env.JWT_SECRET || 'gresio-jwt-secret';

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

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
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

router.get('/companies', auth, superAdminOnly, async (req, res, next) => {
  try {
    const companies = await Company.find({ isActive: true }).sort({ createdAt: -1 });
    const enriched = await Promise.all(companies.map(async (c) => {
      const [userCount, projectCount] = await Promise.all([
        User.countDocuments({ domain: c.domain }),
        Project.countDocuments({ domain: c.domain }),
      ]);
      const mrr = getPlanPrice(c.plan);
      return { ...c.toObject(), userCount, projectCount, type: '', status: 'active', overdue: 0, progress: 0, mrr: mrr };
    }));
    res.json(enriched);
  } catch (e) { next(e); }
});

router.get('/companies/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const [userCount, projectCount, users] = await Promise.all([
      User.countDocuments({ domain: company.domain }),
      Project.countDocuments({ domain: company.domain }),
      User.find({ domain: company.domain }).sort({ createdAt: -1 }),
    ]);
    const mrr = getPlanPrice(company.plan);
    res.json({ ...company.toObject(), userCount, projectCount, users, status: 'active', overdue: 0, progress: 0, mrr: mrr });
  } catch (e) { next(e); }
});

router.post('/companies', auth, superAdminOnly, async (req, res, next) => {
  try {
    const { name, domain, plan, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !domain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Missing required fields: name, domain, adminName, adminEmail, adminPassword' });
    }
    const [existingDomain, existingEmail] = await Promise.all([
      Company.findOne({ domain: domain.toLowerCase() }),
      User.findOne({ email: adminEmail.toLowerCase() }),
    ]);
    if (existingDomain) return res.status(400).json({ message: 'Domain already exists' });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const company = await Company.create({ name, domain: domain.toLowerCase(), plan: plan || 'starter' });
    const admin = await User.create({ name: adminName, email: adminEmail.toLowerCase(), password: adminPassword, role: 'admin', domain: domain.toLowerCase(), isActive: true, status: 'active' });
    await SuperNotification.create({
      title: 'New company created',
      message: `${name} was created by super admin with plan ${plan || 'starter'}.`,
      type: 'signup',
      companyId: company._id,
    });
    res.status(201).json({ company, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (e) { next(e); }
});

router.get('/companies/:id/projects', auth, superAdminOnly, async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const projects = await Project.find({ domain: company.domain, isActive: true }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (e) { next(e); }
});

router.patch('/companies/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) { next(e); }
});

router.delete('/companies/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    company.isActive = false;
    await company.save();
    res.json({ message: 'Company deactivated' });
  } catch (e) { next(e); }
});

router.get('/users', auth, superAdminOnly, async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/users', auth, superAdminOnly, async (req, res, next) => {
  try {
    const { name, email, password, role, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email: email.toLowerCase(), password, role: role || 'admin', domain: domain || '', isActive: true, status: 'active' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, domain: user.domain });
  } catch (e) { next(e); }
});

router.get('/notifications', auth, superAdminOnly, async (req, res, next) => {
  try {
    const notifs = await SuperNotification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (e) { next(e); }
});

router.patch('/notifications/:id/read', auth, superAdminOnly, async (req, res, next) => {
  try {
    await SuperNotification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'ok' });
  } catch (e) { next(e); }
});

router.patch('/notifications/read-all', auth, superAdminOnly, async (req, res, next) => {
  try {
    await SuperNotification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (e) { next(e); }
});

router.delete('/notifications/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    await SuperNotification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification dismissed' });
  } catch (e) { next(e); }
});

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

router.get('/health', async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbOk = dbState === 1;

    const db = { status: dbOk ? 'pass' : 'fail', latency: dbOk ? '< 5ms' : '—', detail: dbOk ? 'Connected' : 'Disconnected' };

    const auth = { status: 'pass', latency: '—', detail: 'JWT configured' };

    const emailConfigured = !!(env.SMTP_HOST && env.SMTP_USER);
    const email = { status: emailConfigured ? 'pass' : 'warn', latency: '—', detail: emailConfigured ? `${env.SMTP_HOST} configured` : 'Not configured' };

    const uploadDir = path.resolve(__dirname, '../../uploads');
    let storageOk = false;
    try {
      await fs.promises.access(uploadDir, fs.constants.F_OK);
      storageOk = true;
    } catch {}
    const storage = { status: storageOk ? 'pass' : 'warn', latency: '—', detail: storageOk ? 'Available' : 'Missing /uploads' };

    const overall = [db, auth, email, storage].every(s => s.status === 'pass') ? 'pass' : 'warn';

    res.json({
      status: overall,
      timestamp: new Date().toISOString(),
      services: { api: { status: 'pass' }, db, auth, email, storage },
    });
  } catch (e) { next(e); }
});

const PLAN_PRICES = { starter: 0, team: 29, enterprise: 99 };

function getPlanPrice(plan) {
  return PLAN_PRICES[plan] || 0;
}

function getMonthsBetween(start, end) {
  const months = [];
  const d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

router.get('/analytics/revenue', auth, superAdminOnly, async (req, res, next) => {
  try {
    const period = req.query.period || '6m';
    const monthsBack = period === '1y' ? 12 : period === '1m' ? 1 : 6;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);

    const companies = await Company.find({ isActive: true });

    const revenueByMonth = {};
    for (const c of companies) {
      const price = getPlanPrice(c.plan);
      if (price === 0) continue;
      const companyStart = new Date(Math.max(c.createdAt, startDate));
      const months = getMonthsBetween(companyStart, now);
      for (const m of months) {
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        if (!revenueByMonth[key]) revenueByMonth[key] = {};
        revenueByMonth[key][c.plan] = (revenueByMonth[key][c.plan] || 0) + price;
        revenueByMonth[key]._total = (revenueByMonth[key]._total || 0) + price;
      }
    }

    const monthly = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        starter: data.starter || 0,
        team: data.team || 0,
        enterprise: data.enterprise || 0,
        total: data._total || 0,
      }));

    const totals = {
      totalCompanies: companies.length,
      totalMRR: companies.reduce((sum, c) => sum + getPlanPrice(c.plan), 0),
      totalRevenue6m: monthly.reduce((sum, m) => sum + m.total, 0),
      byPlan: { starter: 0, team: 0, enterprise: 0 },
    };
    companies.forEach(c => { totals.byPlan[c.plan] = (totals.byPlan[c.plan] || 0) + 1; });

    res.json({ monthly, totals });
  } catch (e) { next(e); }
});

router.get('/analytics/growth', auth, superAdminOnly, async (req, res, next) => {
  try {
    const period = req.query.period || '6m';
    const monthsBack = period === '1y' ? 12 : period === '1m' ? 1 : 6;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);

    const companies = await Company.find({ createdAt: { $gte: startDate } });
    const users = await User.find({ createdAt: { $gte: startDate } });

    const monthly = {};
    const months = getMonthsBetween(startDate, now);
    for (const m of months) {
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { month: key, newCompanies: 0, newUsers: 0 };
    }

    for (const c of companies) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) monthly[key].newCompanies++;
    }
    for (const u of users) {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) monthly[key].newUsers++;
    }

    res.json({
      monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
      totals: {
        totalCompanies: await Company.countDocuments({ isActive: true }),
        totalUsers: await User.countDocuments({ isActive: true }),
      },
    });
  } catch (e) { next(e); }
});

async function seedSuperAdmin() {
  const existing = await User.findOne({ email: 'super@360dmmc.com' });
  if (!existing) {
    await User.create({ name: 'Sarah Chen', email: 'super@360dmmc.com', password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@360dmmc2026', role: 'super_admin', domain: '360dmmc.com', isActive: true, status: 'active' });
    console.log('Super admin seeded: super@360dmmc.com');
  }
}

const lastHealthState = {};

async function pollHealthNotifications() {
  try {
    const dbOk = mongoose.connection.readyState === 1;
    const emailOk = !!(env.SMTP_HOST && env.SMTP_USER);

    const checks = [
      { id: 'db', name: 'Database', ok: dbOk },
      { id: 'email', name: 'Email Service', ok: emailOk },
    ];

    for (const svc of checks) {
      const prev = lastHealthState[svc.id];
      if (prev !== undefined && prev === true && !svc.ok) {
        const exists = await SuperNotification.findOne({ type: 'health_down', message: new RegExp(svc.name) });
        if (!exists) {
          await SuperNotification.create({
            title: `${svc.name} is down`,
            message: `${svc.name} health check failed. The service may be unavailable.`,
            type: 'health_down',
          });
        }
      }
      if (prev !== undefined && prev === false && svc.ok) {
        await SuperNotification.create({
          title: `${svc.name} recovered`,
          message: `${svc.name} is back online and responding normally.`,
          type: 'health_up',
        });
      }
      lastHealthState[svc.id] = svc.ok;
    }
  } catch (e) { console.error('Health poll error:', e.message); }
}

async function pollCompanyNotifications() {
  try {
    const companies = await Company.find({ isActive: true });
    for (const c of companies) {
      const signupExists = await SuperNotification.findOne({ companyId: c._id, type: 'signup' });
      if (!signupExists) {
        await SuperNotification.create({
          title: 'New company registered',
          message: `${c.name} just signed up for a ${c.plan || 'starter'} plan.`,
          type: 'signup',
          companyId: c._id,
        });
      }

      if (c.trialEndsAt) {
        const daysLeft = Math.ceil((new Date(c.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 3) {
          const exists = await SuperNotification.findOne({ companyId: c._id, type: 'reminder' });
          if (!exists) {
            const label = c.billingStatus === 'trial' ? 'Trial' : 'Plan';
            await SuperNotification.create({
              title: `${label} ending soon`,
              message: `${c.name}'s ${label.toLowerCase()} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
              type: 'reminder',
              companyId: c._id,
            });
          }
        }
      }

      if (c.billingStatus === 'past_due') {
        const exists = await SuperNotification.findOne({ companyId: c._id, type: 'alert' });
        if (!exists) {
          const daysOverdue = c.paymentFailedAt ? Math.ceil((Date.now() - new Date(c.paymentFailedAt)) / (1000 * 60 * 60 * 24)) : 1;
          await SuperNotification.create({
            title: 'Payment past due',
            message: `${c.name} payment is past due (${daysOverdue} day${daysOverdue === 1 ? '' : 's'}).`,
            type: 'alert',
            companyId: c._id,
          });
        }
      }

      if (c.billingStatus === 'cancelled') {
        const exists = await SuperNotification.findOne({ companyId: c._id, type: 'warning' });
        if (!exists) {
          await SuperNotification.create({
            title: 'Plan cancelled',
            message: `${c.name} has cancelled their ${c.plan} plan.`,
            type: 'warning',
            companyId: c._id,
          });
        }
      }
    }
  } catch (e) { console.error('Poll notification error:', e.message); }
}

let pollingInterval = null;

function startNotificationPolling() {
  pollCompanyNotifications();
  pollHealthNotifications();
  pollingInterval = setInterval(() => {
    pollCompanyNotifications();
    pollHealthNotifications();
  }, 60000);
}

function stopNotificationPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

module.exports = { router, seedSuperAdmin, startNotificationPolling, stopNotificationPolling };
