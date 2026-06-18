const axios = require('axios');
const env = require('../config/env');
const Activity = require('../models/Activity');
const User = require('../models/User');

class MicrosoftGraphService {
  constructor() {
    this._tokenCache = new Map();
  }

  _cacheKey(tenantId) {
    return `ms_graph_${tenantId}`;
  }

  async getAccessToken(tenantId, clientId, clientSecret) {
    const key = this._cacheKey(tenantId);
    const cached = this._tokenCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.token;
    }

    tenantId = tenantId || env.MICROSOFT_TENANT_ID;
    clientId = clientId || env.MICROSOFT_CLIENT_ID;
    clientSecret = clientSecret || env.MICROSOFT_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) return null;

    try {
      const { data } = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const token = data.access_token;
      this._tokenCache.set(key, { token, expiry: Date.now() + data.expires_in * 1000 });
      return token;
    } catch (error) {
      console.error('Microsoft Graph auth error:', error.message);
      return null;
    }
  }

  async getClient(tenantId, clientId, clientSecret) {
    const token = await this.getAccessToken(tenantId, clientId, clientSecret);
    if (!token) return null;
    return axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async syncOutlookEmails(userEmail, userId, domain, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return null;

      const { data } = await client.get(`/users/${userEmail}/messages`, {
        params: { $top: 20, $orderby: 'receivedDateTime desc', $select: 'id,subject,receivedDateTime,from' },
      });

      for (const email of data.value || []) {
        await Activity.create({
          user: userId,
          domain,
          type: 'outlook_email',
          source: 'outlook',
          description: `Email: ${email.subject}`,
          metadata: { messageId: email.id, from: email.from?.emailAddress?.address, received: email.receivedDateTime },
          score: 2,
        });
      }

      return { emails: data.value?.length || 0 };
    } catch (error) {
      console.error('Outlook sync error:', error.message);
      return null;
    }
  }

  async syncCalendarEvents(userEmail, userId, domain, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return null;

      const { data } = await client.get(`/users/${userEmail}/calendar/events`, {
        params: { $top: 20, $orderby: 'start/dateTime desc', $select: 'id,subject,start,end' },
      });

      for (const event of data.value || []) {
        await Activity.create({
          user: userId,
          domain,
          type: 'outlook_calendar',
          source: 'outlook',
          description: `Event: ${event.subject}`,
          metadata: { eventId: event.id, start: event.start?.dateTime, end: event.end?.dateTime },
          score: 4,
        });
      }

      return { events: data.value?.length || 0 };
    } catch (error) {
      console.error('Calendar sync error:', error.message);
      return null;
    }
  }

  async syncTeamsMessages(userId, domain, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return null;

      const { data: chats } = await client.get('/me/chats', { params: { $top: 10 } });

      for (const chat of chats.value || []) {
        const { data: messages } = await client.get(`/chats/${chat.id}/messages`, { params: { $top: 10 } });
        for (const msg of messages.value || []) {
          await Activity.create({
            user: userId,
            domain,
            type: 'teams_message',
            source: 'teams',
            description: `Teams message: ${msg.body?.content?.substring(0, 100) || 'No content'}`,
            metadata: { chatId: chat.id, messageId: msg.id },
            score: 3,
          });
        }
      }

      return { chats: chats.value?.length || 0 };
    } catch (error) {
      console.error('Teams sync error:', error.message);
      return null;
    }
  }
  async createChannel(teamId, displayName, description, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return { error: 'Microsoft Graph not configured' };
      const { data } = await client.post(`/teams/${teamId}/channels`, {
        displayName,
        description: description || '',
        membershipType: 'standard',
      });
      return { id: data.id, displayName: data.displayName, webUrl: data.webUrl };
    } catch (error) {
      console.error('Teams createChannel error:', error.message);
      return { error: error.response?.data?.error?.message || error.message };
    }
  }

  async getChannel(teamId, channelId, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return null;
      const { data } = await client.get(`/teams/${teamId}/channels/${channelId}`);
      return { id: data.id, displayName: data.displayName, webUrl: data.webUrl };
    } catch (error) {
      console.error('Teams getChannel error:', error.message);
      return null;
    }
  }

  async sendChannelMessage(teamId, channelId, message, creds) {
    try {
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return null;
      const { data } = await client.post(`/teams/${teamId}/channels/${channelId}/messages`, {
        body: { content: message },
      });
      return { id: data.id };
    } catch (error) {
      console.error('Teams sendMessage error:', error.message);
      return null;
    }
  }

  async sync(platform) {
    try {
      const User = require('../models/User');
      const Company = require('../models/Company');
      const users = await User.find({ outlookEmail: { $ne: '' }, isActive: true });
      let total = { users: users.length };
      const domainCreds = {};
      for (const u of users) {
        if (!domainCreds[u.domain]) {
          const company = await Company.findOne({ domain: u.domain }).lean();
          if (company && company.outlookTenantId) {
            domainCreds[u.domain] = {
              tenantId: company.outlookTenantId,
              clientId: company.outlookClientId,
              clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
            };
          } else {
            domainCreds[u.domain] = null;
          }
        }
        const creds = domainCreds[u.domain] || undefined;
        if (!platform || platform === 'outlook') {
          const emails = await this.syncOutlookEmails(u.outlookEmail, u._id, u.domain, creds);
          const events = await this.syncCalendarEvents(u.outlookEmail, u._id, u.domain, creds);
          if (emails) { total.emails = (total.emails || 0) + emails.emails; }
          if (events) { total.events = (total.events || 0) + events.events; }
        }
        if (!platform || platform === 'teams') {
          const chats = await this.syncTeamsMessages(u._id, u.domain, creds);
          if (chats) { total.chats = (total.chats || 0) + chats.chats; }
        }
      }
      return total;
    } catch (error) {
      console.error('Microsoft Graph auto-sync error:', error.message);
      return null;
    }
  }

  async createOnlineMeeting(subject, startDateTime, endDateTime, userEmail, creds) {
    try {
      if (!userEmail) {
        return { error: 'No user email provided for meeting creation' };
      }
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) {
        return { error: 'Microsoft Graph not configured — check tenant ID, client ID, and client secret' };
      }
      const { data } = await client.post(`/users/${userEmail}/onlineMeetings`, {
        subject,
        startDateTime,
        endDateTime,
      });
      return {
        joinUrl: data.joinUrl || data.joinWebUrl || '',
        meetingId: data.id || '',
        conferenceId: data.conferenceId || '',
        subject: data.subject || subject,
        startDateTime: data.startDateTime || startDateTime,
        endDateTime: data.endDateTime || endDateTime,
      };
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.error('Microsoft Graph create meeting error:', msg);
      return { error: msg };
    }
  }

  async createOutlookCalendarEvent(userEmail, title, startDateTime, endDateTime, description, creds) {
    try {
      if (!userEmail) return { error: 'No user email' };
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return { error: 'Graph not configured' };
      const body = {
        subject: title,
        start: { dateTime: startDateTime, timeZone: 'UTC' },
        end: { dateTime: endDateTime || startDateTime, timeZone: 'UTC' },
      };
      if (description) body.body = { contentType: 'text', content: description };
      const { data } = await client.post(`/users/${userEmail}/calendar/events`, body);
      return { id: data.id };
    } catch (error) {
      console.error('Create Outlook event error:', error.message);
      return { error: error.message };
    }
  }

  async updateOutlookCalendarEvent(userEmail, outlookEventId, title, startDateTime, endDateTime, description, creds) {
    try {
      if (!userEmail || !outlookEventId) return { error: 'Missing email or eventId' };
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return { error: 'Graph not configured' };
      const body = {
        subject: title,
        start: { dateTime: startDateTime, timeZone: 'UTC' },
        end: { dateTime: endDateTime || startDateTime, timeZone: 'UTC' },
      };
      if (description) body.body = { contentType: 'text', content: description };
      await client.patch(`/users/${userEmail}/calendar/events/${outlookEventId}`, body);
      return { success: true };
    } catch (error) {
      console.error('Update Outlook event error:', error.message);
      return { error: error.message };
    }
  }

  async deleteOutlookCalendarEvent(userEmail, outlookEventId, creds) {
    try {
      if (!userEmail || !outlookEventId) return { error: 'Missing email or eventId' };
      const client = await this.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
      if (!client) return { error: 'Graph not configured' };
      await client.delete(`/users/${userEmail}/calendar/events/${outlookEventId}`);
      return { success: true };
    } catch (error) {
      console.error('Delete Outlook event error:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = new MicrosoftGraphService();
