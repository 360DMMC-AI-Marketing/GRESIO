const Integration = require('../models/Integration');
const { encrypt, decrypt } = require('../config/crypto');

exports.getIntegrations = async (req, res, next) => {
  try {
    const integrations = await Integration.find();
    const result = integrations.map(i => {
      const obj = i.toObject();
      obj.credentials = i.getDecryptedCredentials();
      return obj;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateIntegration = async (req, res, next) => {
  try {
    const { name, credentials, config, isConnected } = req.body;
    const update = { config, isConnected, lastSync: isConnected ? new Date() : undefined };
    if (credentials) {
      update.credentials = encrypt(credentials);
    }
    const integration = await Integration.findOneAndUpdate(
      { name },
      { $set: update },
      { upsert: true, new: true }
    );
    const obj = integration.toObject();
    obj.credentials = integration.getDecryptedCredentials();
    res.json(obj);
  } catch (error) {
    next(error);
  }
};

exports.syncIntegration = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { platform } = req.query;
    const service = getSyncService(name);
    if (!service) {
      return res.status(400).json({ message: `No sync service for ${name}` });
    }
    const result = await service.sync(platform);
    await Integration.findOneAndUpdate({ name }, { lastSync: new Date() });
    res.json({ message: `Sync completed for ${name}${platform ? ` (${platform})` : ''}`, result });
  } catch (error) {
    next(error);
  }
};

function getSyncService(name) {
  const services = {
    github: require('../services/githubService'),
    clickup: require('../services/clickupService'),
    microsoft_graph: require('../services/microsoftGraphService'),
  };
  return services[name];
}

exports.getSyncService = getSyncService;
