const env = require('../config/env');
const { sendEmail } = require('../services/emailService');
const sanitizeHtml = require('sanitize-html');

exports.submitContact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const clean = (str) => sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1e293b">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0">Name</td><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${clean(name)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0">Email</td><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${clean(email)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0">Subject</td><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${clean(subject)}</td></tr>
        </table>
        <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#334155;line-height:1.6;white-space:pre-wrap">${clean(message)}</div>
      </div>
    `;

    const sent = await sendEmail({
      to: 'Consult@360DMMC.com',
      subject: `Contact Form: ${subject}`,
      html,
      senderEmail: env.GRAPH_SENDER_EMAIL,
    });

    if (!sent) {
      return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};
