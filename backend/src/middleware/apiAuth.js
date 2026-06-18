const ApiKey = require('../models/ApiKey');
const User = require('../models/User');

async function apiAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  try {
    const hashed = ApiKey.hashKey(apiKey);
    const keyDoc = await ApiKey.findOne({ key: hashed, active: true });
    if (!keyDoc) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    const user = await User.findById(keyDoc.user).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    req.user = user;
    req.apiKey = keyDoc;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('admin')) {
      return res.status(403).json({ error: `Missing required scope: ${scope}` });
    }
    next();
  };
}

module.exports = { apiAuth, requireScope };
