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

exports.writeAction = async (req, res, next) => {
  try {
    const { integration, action } = req.params;
    const { repoFullName, branchName, baseBranch, title, body, headBranch, projectName, message, teamId, channelId, userEmail, subject, startDateTime, endDateTime, description, toRecipients } = req.body;

    const service = getSyncService(integration);
    if (!service) return res.status(400).json({ message: `No service for ${integration}` });

    const Integration = require('../models/Integration');
    const intRecord = await Integration.findOne({ name: integration });
    const creds = intRecord ? intRecord.getDecryptedCredentials() : {};

    let result;
    switch (action) {
      // GitHub
      case 'create-branch':
        result = await service.createBranch(repoFullName, branchName, baseBranch);
        break;
      case 'create-pr':
        result = await service.createPR(repoFullName, title, body, headBranch, baseBranch);
        break;
      // Teams
      case 'send-message':
        result = await service.sendChannelMessage(teamId, channelId, message, creds);
        break;
      // Outlook
      case 'send-email':
        result = await service.sendOutlookEmail(userEmail, subject, description, toRecipients, creds);
        break;
      case 'create-calendar-event':
        result = await service.createOutlookCalendarEvent(userEmail, title, startDateTime, endDateTime, description, creds);
        break;
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }

    res.json({ action, integration, result });
  } catch (error) {
    next(error);
  }
};

exports.createMeeting = async (req, res, next) => {
  try {
    const { subject, startDateTime, endDateTime, userEmail } = req.body;
    if (!subject || !startDateTime || !endDateTime) {
      return res.status(400).json({ message: 'subject, startDateTime, and endDateTime are required' });
    }
    const integration = await Integration.findOne({ name: 'microsoft_graph' });
    const creds = integration ? integration.getDecryptedCredentials() : {};
    const msGraph = require('../services/microsoftGraphService');
    const result = await msGraph.createOnlineMeeting(subject, startDateTime, endDateTime, userEmail, creds);
    if (result.error) {
      return res.status(500).json({ message: result.error });
    }
    res.json(result);
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
