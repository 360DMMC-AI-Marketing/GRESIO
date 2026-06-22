const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const env = require('../config/env');
const User = require('../models/User');
const Company = require('../models/Company');
const Activity = require('../models/Activity');
const { sendEmail } = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

exports.login = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('assignedProjects');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    user.status = 'active';
    await user.save();

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, step: '2fa' }, env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requiresTwoFactor: true, tempToken, email: user.email });
    }

    await Activity.create({
      user: user._id,
      domain: user.domain,
      type: 'login',
      source: 'internal',
      description: 'User logged in',
    });

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, password, role, plan } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const validPlans = ['starter', 'team', 'enterprise'];

    const bareDomain = email.split('@')[1]?.toLowerCase() || email.toLowerCase();

    const user = await User.create({
      name, email, password, domain: bareDomain,
      role: 'admin', onboardingCompleted: false,
    });

    const existingCompany = await Company.findOne({ domain: bareDomain });
    if (!existingCompany) {
      await Company.create({
        name: req.body.companyName || name + "'s Company",
        domain: bareDomain,
        plan: validPlans.includes(plan) ? plan : 'starter',
        createdBy: user._id,
        industry: req.body.industry || '',
        country: req.body.country || '',
        timezone: req.body.timezone || '',
        website: req.body.website || '',
        tagline: req.body.tagline || '',
      });
    }

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('assignedProjects')
    .populate({ path: 'assignedProjects', populate: { path: 'tasks' } });
  res.json(user);
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'githubUsername', 'clickupId', 'teamsId', 'outlookEmail', 'figmaUsername', 'lovableUsername', 'onboardingCompleted', 'theme'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.microsoftConfig = (req, res) => {
  res.json({
    clientId: env.MICROSOFT_CLIENT_ID,
    tenantId: env.MICROSOFT_TENANT_ID,
    redirectUri: env.FRONTEND_URL,
  });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account with that email exists' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1e293b">Reset your password</h2>
        <p style="color:#64748b">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2347e8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">Reset Password</a>
        <p style="color:#94a3b8;font-size:12px">If you did not request this, please ignore this email.</p>
      </div>
    `;

    const sent = await sendEmail({ to: email, subject: 'Password Reset - Gresio', html, senderEmail: env.GRAPH_SENDER_EMAIL });
    if (!sent) {
      user.resetPasswordToken = '';
      user.resetPasswordExpire = null;
      await user.save();
      return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }

    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpire = null;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res.json({ message: 'Password reset successful', token, user });
  } catch (error) {
    next(error);
  }
};

exports.verify2fa = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ message: 'Token and code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired verification token' });
    }
    if (decoded.step !== '2fa') {
      return res.status(401).json({ message: 'Invalid verification token' });
    }

    const user = await User.findById(decoded.id).populate('assignedProjects');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const clean = code.replace(/\s/g, '');
    const isBackup = user.backupCodes.find(bc => bc === clean);

    if (isBackup) {
      user.backupCodes = user.backupCodes.filter(bc => bc !== clean);
      await user.save();
    } else {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: clean,
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ message: 'Invalid code' });
      }
    }

    await Activity.create({
      user: user._id, domain: user.domain,
      type: 'login', source: 'internal',
      description: 'User completed 2FA verification',
    });

    const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

exports.setup2fa = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `GRESIO (${req.user.email || req.user._id})`,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error) {
    next(error);
  }
};

exports.enable2fa = async (req, res, next) => {
  try {
    const { secret, code } = req.body;
    if (!secret || !code) {
      return res.status(400).json({ message: 'Secret and verification code are required' });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    if (!verified) {
      return res.status(400).json({ message: 'Invalid code. Make sure your authenticator app is set up correctly.' });
    }

    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodes,
    }, { new: true });

    res.json({
      message: 'Two-factor authentication enabled',
      backupCodes,
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.disable2fa = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to disable 2FA' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    user.backupCodes = [];
    await user.save();

    res.json({ message: 'Two-factor authentication disabled', user });
  } catch (error) {
    next(error);
  }
};
