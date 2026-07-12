const Campaign = require('../models/Campaign');
const EmailProfile = require('../models/EmailProfile');
const MailEvent = require('../models/MailEvent');
const mailService = require('./mailService');
const { enqueueEngagementWrite, recordMailEvent } = require('./engagementWriteQueue');

const config = require('../config');

function resolveTrackingBaseUrl() {
  return config.trackingBaseUrl || `http://localhost:${config.port}`;
}

/**
 * Process a single email job (used by BullMQ worker).
 * Skips MailEvent creation — tracking is batched after all sends.
 */
async function processEmailJob(job) {
  const { campaignId, recipientIndex } = job.data;
  if (!campaignId || recipientIndex === undefined) {
    throw new Error('Invalid job data: campaignId and recipientIndex required');
  }

  const campaign = await Campaign.findById(campaignId).populate('senderProfileId');
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const recipient = campaign.recipients[recipientIndex];
  if (!recipient) {
    throw new Error(`Recipient index ${recipientIndex} out of bounds for campaign ${campaignId}`);
  }

  // Skip if already sent or stopped
  if (recipient.status !== 'Pending') {
    return { skipped: true, reason: `Recipient status is ${recipient.status}` };
  }

  const trackingBaseUrl = resolveTrackingBaseUrl();
  const result = await mailService.sendCampaignEmail({
    campaign,
    recipient,
    profile: campaign.senderProfileId,
    trackingBaseUrl,
  });

  // Update recipient status
  recipient.status = result.status;
  if (result.messageId) recipient.messageId = result.messageId;
  if (result.error) recipient.error = result.error;
  recipient.sentAt = new Date();

  // Update campaign metrics
  if (result.status === 'Sent') {
    campaign.metrics.totalSent = (campaign.metrics.totalSent || 0) + 1;
  } else if (result.status === 'Failed' || result.status === 'Invalid' || result.status === 'Bounced') {
    campaign.metrics.bounced = (campaign.metrics.bounced || 0) + 1;
  }

  await campaign.save();

  enqueueEngagementWrite(() => recordMailEvent({
    eventType: result.status === 'Sent' ? 'Send' : result.status === 'Unsubscribed' ? 'Skipped' : 'Bounce',
    email: recipient.email,
    campaignKey: String(campaign._id),
    messageId: result.messageId,
    metadata: { recipientIndex, error: result.error },
  }));

  return {
    email: recipient.email,
    status: result.status,
    messageId: result.messageId,
    error: result.error,
    recipientIndex,
  };
}

/**
 * Batch-send all pending emails for a campaign.
 * Sends all emails first, returns results — tracking is created separately.
 * Does NOT create MailEvent entries during sending — use batchCreateTrackingEvents after.
 */
async function batchSendEmails(campaign) {
  if (!campaign) return [];
  if (campaign.status === 'Stopped') return [];

  const trackingBaseUrl = resolveTrackingBaseUrl();
  const results = [];

  for (let idx = 0; idx < (campaign.recipients || []).length; idx++) {
    const recipient = campaign.recipients[idx];
    if (recipient.status !== 'Pending' && recipient.status !== 'Queued') continue;

    const result = await mailService.sendCampaignEmail({
      campaign,
      recipient,
      profile: campaign.senderProfileId,
      trackingBaseUrl,
    });

    // Update recipient in-memory (saved later in bulk)
    recipient.status = result.status;
    if (result.messageId) recipient.messageId = result.messageId;
    if (result.error) recipient.error = result.error;
    recipient.sentAt = new Date();

    // Update metrics in-memory
    if (result.status === 'Sent') {
      campaign.metrics.totalSent = (campaign.metrics.totalSent || 0) + 1;
    } else if (result.status === 'Failed' || result.status === 'Invalid' || result.status === 'Bounced') {
      campaign.metrics.bounced = (campaign.metrics.bounced || 0) + 1;
    }

    results.push({
      email: recipient.email,
      status: result.status,
      messageId: result.messageId,
      error: result.error,
      recipientIndex: idx,
      campaignId: campaign._id,
    });
  }

  return results;
}

/**
 * Batch-create MailEvent tracking entries after all emails are sent.
 * This avoids per-email tracking overhead during sending.
 */
async function batchCreateTrackingEvents(results) {
  if (!results || !results.length) return 0;

  const events = results
    .filter((r) => r.status === 'Sent' || r.status === 'Failed' || r.status === 'Invalid' || r.status === 'Bounced' || r.status === 'Unsubscribed')
    .map((r) => ({
      eventType: r.status === 'Sent' ? 'Send' : r.status === 'Unsubscribed' ? 'Skipped' : 'Bounce',
      email: r.email,
      timestamp: new Date(),
      campaignId: r.campaignId,
      messageId: r.messageId || undefined,
      metadata: { recipientIndex: r.recipientIndex, error: r.error },
    }));

  if (!events.length) return 0;

  try {
    await MailEvent.insertMany(events, { ordered: false });
  } catch (err) {
    // insertMany with ordered:false will insert valid docs even if some fail
    console.warn('[EmailProcessor] batchCreateTrackingEvents partial error:', err.message);
  }

  return events.length;
}

module.exports = {
  processEmailJob,
  batchSendEmails,
  batchCreateTrackingEvents,
  resolveTrackingBaseUrl,
};
