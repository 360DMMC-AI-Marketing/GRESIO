const Referral = require('../models/Referral');
const crypto = require('crypto');

exports.generateCode = async (req, res) => {
  try {
    const existing = await Referral.findOne({ referrer: req.user._id }).sort({ createdAt: -1 });
    const code = existing?.code || crypto.randomBytes(4).toString('hex');
    res.json({ code, link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${code}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.myReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referredUser', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'pending').length,
      signedUp: referrals.filter(r => r.status === 'signed_up').length,
      rewarded: referrals.filter(r => r.status === 'rewarded').length,
    };
    res.json({ referrals, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.redeemCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const referral = await Referral.findOne({ code, status: 'pending' });
    if (!referral) return res.status(404).json({ error: 'Invalid or expired referral code' });

    referral.status = 'signed_up';
    referral.referredUser = req.user._id;
    referral.signedUpAt = new Date();
    await referral.save();

    res.json({ message: 'Referral code applied', referrerName: 'Referrer credited' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const total = await Referral.countDocuments();
    const signedUp = await Referral.countDocuments({ status: { $ne: 'pending' } });
    const rewarded = await Referral.countDocuments({ status: 'rewarded' });
    res.json({ total, signedUp, rewarded, conversionRate: total > 0 ? ((signedUp / total) * 100).toFixed(1) : '0' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
