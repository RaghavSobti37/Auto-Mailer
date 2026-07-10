const nodemailer = require('nodemailer');
const config = require('../config');

let resendClient = null;
try {
  const { Resend } = require('resend');
  if (config.resendApiKey) {
    resendClient = new Resend(config.resendApiKey);
  }
} catch (e) {
  // Resend not available
}

function normalizeToList(to) {
  if (!to) return [];
  const list = Array.isArray(to) ? to : String(to).split(/[,;]/);
  const seen = new Set();
  return list
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => e && /[^\s@]+@[^\s@]+/.test(e) && !seen.has(e) && seen.add(e));
}

async function sendViaResend({ to, subject, html, from }) {
  if (!resendClient) {
    throw new Error('Resend client not initialized. Set RESEND_API_KEY');
  }
  const recipients = normalizeToList(to);
  if (!recipients.length) throw new Error('No valid recipients');

  const response = await resendClient.emails.send({
    from: from || config.systemFromEmail || 'onboarding@resend.dev',
    to: recipients,
    subject,
    html,
  });
  return response;
}

async function sendViaSmtp({ to, subject, html, from, smtpHost, smtpPort, smtpUser, smtpPass }) {
  const transporter = nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: smtpPort || 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const recipients = normalizeToList(to);
  if (!recipients.length) throw new Error('No valid recipients');

  const info = await transporter.sendMail({
    from: from || smtpUser,
    to: recipients.join(', '),
    subject,
    html,
  });
  return info;
}

async function dispatchEmailPayload({ to, subject, html, from, cc } = {}) {
  const recipients = normalizeToList(to);
  if (!recipients.length) {
    return { error: 'No valid recipients' };
  }

  // Try Resend first
  if (resendClient && config.resendApiKey) {
    try {
      const result = await sendViaResend({ to: recipients, subject, html, from });
      return { provider: 'resend', ...result };
    } catch (err) {
      console.warn('[MailDriver] Resend failed, falling back to SMTP:', err.message);
    }
  }

  // Fallback to SMTP
  if (config.smtpUser && config.smtpPass) {
    try {
      const result = await sendViaSmtp({
        to: recipients,
        subject,
        html,
        from,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
      });
      return { provider: 'smtp', ...result };
    } catch (err) {
      console.error('[MailDriver] SMTP also failed:', err.message);
      return { error: err.message };
    }
  }

  return { error: 'No email provider configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS.' };
}

module.exports = {
  dispatchEmailPayload,
  sendViaResend,
  sendViaSmtp,
  normalizeToList,
  resend: resendClient,
};
