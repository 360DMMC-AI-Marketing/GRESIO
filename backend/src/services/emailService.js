const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
let acsClient = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: parseInt(env.SMTP_PORT, 10) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function getAcsClient() {
  if (acsClient) return acsClient;
  if (!env.AZURE_COMMUNICATION_CONNECTION_STRING) return null;
  try {
    const { EmailClient } = require('@azure/communication-email');
    acsClient = new EmailClient(env.AZURE_COMMUNICATION_CONNECTION_STRING);
    return acsClient;
  } catch (err) {
    console.error('ACS client init failed:', err.message);
    return null;
  }
}

async function sendViaAcs({ to, subject, html }) {
  const client = await getAcsClient();
  if (!client || !env.AZURE_SENDER_EMAIL) return false;
  try {
    const poller = await client.beginSend({
      senderAddress: env.AZURE_SENDER_EMAIL,
      content: { subject, html },
      recipients: { to: [{ address: to }] },
    });
    await poller.pollUntilDone();
    return true;
  } catch (err) {
    console.error('ACS send failed:', err.message);
    return false;
  }
}

async function sendViaSmtp({ to, subject, html }) {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER || 'noreply@gresio.app',
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('SMTP send failed:', err.message);
    return false;
  }
}

async function sendViaGraph({ to, subject, html, senderEmail }) {
  try {
    const microsoftGraphService = require('./microsoftGraphService');
    const client = await microsoftGraphService.getClient();
    const token = await microsoftGraphService.getAccessToken();
    if (!client || !token) return false;
    if (!senderEmail) return false;
    await client.post(`/users/${senderEmail}/sendMail`, {
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    });
    return true;
  } catch (err) {
    console.error('Graph send failed:', err.message);
    return false;
  }
}

async function sendEmail({ to, subject, html, senderEmail }) {
  if (await sendViaAcs({ to, subject, html })) return 'acs';
  if (await sendViaGraph({ to, subject, html, senderEmail })) return 'graph';
  if (await sendViaSmtp({ to, subject, html })) return 'smtp';
  return null;
}

module.exports = { sendEmail };
