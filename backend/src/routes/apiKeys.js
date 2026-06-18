const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');

router.get('/', auth, async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user._id })
      .select('name prefix scopes lastUsed active createdAt expiresAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: keys });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, scopes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const rawKey = ApiKey.generateKey();
    const hashed = ApiKey.hashKey(rawKey);
    const prefix = rawKey.split('_')[0] + '_' + rawKey.split('_')[1].substring(0, 4);
    const keyDoc = await ApiKey.create({
      user: req.user._id,
      name,
      key: hashed,
      prefix,
      scopes: scopes || ['projects:read', 'tasks:read'],
      domain: req.user.domain,
    });
    res.status(201).json({ key: rawKey, data: { _id: keyDoc._id, name: keyDoc.name, prefix: keyDoc.prefix, scopes: keyDoc.scopes, active: keyDoc.active, createdAt: keyDoc.createdAt } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!key) return res.status(404).json({ error: 'API key not found' });
    res.json({ message: 'API key deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
