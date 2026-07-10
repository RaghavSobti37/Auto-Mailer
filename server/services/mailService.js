const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');
const EmailProfile = require('../models/EmailProfile');
const { dispatchEmailPayload } = require('./mailDriver');
const { applySignature } = require('../utils/emailSignature');

/**
 * Build final HTML with tracking pixel, unsubscribe link, etc.
 */
function buildCampaignHtml({ html, campaignId, recipientId, email, trackingBaseUrl, removeUnsubscribe }) {
  const baseUrl = trackingBaseUrl || '';
  const unsubUrl = `${baseUrl}/track/unsubscribe/${campaignId}/${recipientId}?email=${encodeURIComponent(email || '')}`;
  const pixelUrl = `${baseUrl}/track/open/${campaignId}/${recipientId}.gif?email=${encodeURIComponent(email || '')}`;
  const clickBaseUrl = `${baseUrl}/track/click/${campaignId}/${recipientId}`;

  let finalHtml = rewriteTrackedLinks(html, clickBaseUrl, email);

  // Add tracking pixel
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none !important;" border="0" />`;
  finalHtml = pixelTag + finalHtml;

  // Add unsubscribe link
  if (!removeUnsubscribe) {
    const unsubTag = `<div style="margin-top:20px; padding-top:10px; border-top:1px solid #eee; text-align:center; font-size:12px; color:#999;">
      <a href="${unsubUrl}" style="color:#999; text-decoration:underline;">Unsubscribe</a>
    </div>`;
    finalHtml = finalHtml + unsubTag;
  }

  return finalHtml;
}

function rewriteTrackedLinks(html, clickBaseUrl, email) {
  return String(html || '').replace(/\bhref=(["'])(.*?)\1/gi, (match, quote, href) => {
    const rawHref = String(href || '').trim();
    if (!/^https?:\/\//i.test(rawHref)) return match;
    if (rawHref.includes('/track/click/') || rawHref.includes('/track/unsubscribe/')) return match;
    const tracked = `${clickBaseUrl}?url=${encodeURIComponent(rawHref)}&email=${encodeURIComponent(email || '')}`;
    return `href=${quote}${tracked}${quote}`;
  });
}

/**
 * Send a single campaign email.
 */
async function sendCampaignEmail({ campaign, recipient, profile, trackingBaseUrl }) {
  const { email, name, _id: recipientId } = recipient;
  if (!email || !/[^\s@]+@[^\s@]+/.test(email)) {
    return { status: 'Invalid', error: 'Invalid email address' };
  }

  const bodyHtml = campaign.includeSignature === false
    ? (campaign.content || '')
    : applySignature(campaign.content || '', campaign.signature || profile?.signature || '');

  const html = buildCampaignHtml({
    html: bodyHtml,
    campaignId: campaign.campaignId || String(campaign._id),
    recipientId: String(recipientId),
    email,
    trackingBaseUrl: trackingBaseUrl || '',
    removeUnsubscribe: campaign.removeUnsubscribe,
  });

  const subject = campaign.subject || '';

  // Determine sender details
  let from = null;
  let smtpConfig = null;

  if (campaign.senderMode === 'system_resend' || campaign.senderMode === 'system_smtp') {
    from = campaign.resendFromEmail || undefined;
  } else if (profile) {
    from = profile.email;
    smtpConfig = {
      smtpHost: profile.smtpHost,
      smtpPort: profile.smtpPort,
      smtpUser: profile.smtpUser,
      smtpPass: profile.smtpPass,
    };
  }

  try {
    let result;
    if (smtpConfig) {
      const { sendViaSmtp } = require('./mailDriver');
      result = await sendViaSmtp({ to: email, subject, html, from, ...smtpConfig });
    } else {
      result = await dispatchEmailPayload({ to: email, subject, html, from });
    }
    return { status: 'Sent', messageId: result?.id || result?.messageId || '' };
  } catch (err) {
    return { status: 'Failed', error: err.message };
  }
}

/**
 * Update email tags / status
 */
async function updateEmailTags(email, tag, status) {
  // In single-tenant mode, just log the tag update
  console.log(`[MailService] Tag update: ${email} → tag=${tag}, status=${status}`);
}

/**
 * Send a test email.
 */
async function sendTestEmail({ to, subject, html, profile, senderMode, attachmentRows }) {
  let from = null;
  let smtpConfig = null;

  if (senderMode === 'system_resend' || senderMode === 'system_smtp') {
    from = undefined;
  } else if (profile) {
    from = profile.email;
    smtpConfig = {
      smtpHost: profile.smtpHost,
      smtpPort: profile.smtpPort,
      smtpUser: profile.smtpUser,
      smtpPass: profile.smtpPass,
    };
  }

  if (smtpConfig) {
    const { sendViaSmtp } = require('./mailDriver');
    return sendViaSmtp({ to, subject, html, from, ...smtpConfig });
  }
  return dispatchEmailPayload({ to, subject, html, from });
}

module.exports = {
  sendCampaignEmail,
  updateEmailTags,
  sendTestEmail,
  buildCampaignHtml,
  rewriteTrackedLinks,
};
