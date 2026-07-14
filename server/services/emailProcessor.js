const Campaign = require('../models/Campaign');
const EmailProfile = require('../models/EmailProfile');
const MailEvent = require('../models/MailEvent');
const mailService = require('./mailService');
const { enqueueEngagementWrite, recordMailEvent, buildDedupeKey } = require('./engagementWriteQueue');

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
  const jobs = (campaign.recipients || [])
    .map((recipient, idx) => ({ recipient, idx, campaignId: campaign._id }))
    .filter(({ recipient }) => recipient.status === 'Pending' || recipient.status === 'Queued');

  const results = await runConcurrent(jobs, config.sendConcurrency, async ({ recipient, idx }) => {
    const result = await mailService.sendCampaignEmail({
      campaign,
      recipient,
      profile: campaign.senderProfileId,
      trackingBaseUrl,
    });
    return {
      email: recipient.email,
      status: result.status,
      messageId: result.messageId,
      error: result.error,
      recipientIndex: idx,
      campaignId: campaign._id,
    };
  });

  for (const result of results) {
    const recipient = campaign.recipients[result.recipientIndex];
    if (!recipient) continue;
    recipient.status = result.status;
    if (result.messageId) recipient.messageId = result.messageId;
    if (result.error) recipient.error = result.error;
    recipient.sentAt = new Date();
    if (result.status === 'Sent') {
      campaign.metrics.totalSent = (campaign.metrics.totalSent || 0) + 1;
    } else if (result.status === 'Failed' || result.status === 'Invalid' || result.status === 'Bounced') {
      campaign.metrics.bounced = (campaign.metrics.bounced || 0) + 1;
    }
  }

  return results;
}

async function runConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = await worker(items[currentIndex]);
      } catch (err) {
        const item = items[currentIndex];
        results[currentIndex] = {
          email: item.recipient.email,
          status: 'Failed',
          error: err.message,
          recipientIndex: item.idx,
          campaignId: item.campaignId,
        };
      }
    }
  }));
  return results.filter(Boolean);
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
      dedupeKey: buildDedupeKey({
        eventType: r.status === 'Sent' ? 'Send' : r.status === 'Unsubscribed' ? 'Skipped' : 'Bounce',
        campaignId: r.campaignId,
        email: r.email,
        messageId: r.messageId,
        metadata: { recipientIndex: r.recipientIndex, error: r.error },
      }),
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
  runConcurrent,
};
