const config = require('../config');
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const { isCampaignStopped } = require('./campaignQueueState');
const { processEmailJob, batchSendEmails, batchCreateTrackingEvents } = require('./emailProcessor');

let queue = null;
let worker = null;

async function getQueue() {
  if (queue) return queue;
  try {
    const { Queue } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
    queue = new Queue('campaign-email-queue', { connection });
    return queue;
  } catch (err) {
    console.warn('[CampaignEmailQueue] Redis not available, using direct processing:', err.message);
    return null;
  }
}

async function dispatchCampaignJobs(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  if (isCampaignStopped(campaignId)) {
    return { error: 'Campaign is stopped' };
  }

  campaign.status = 'Sending';
  await campaign.save();

  const pendingRecipients = [];
  campaign.recipients.forEach((r, idx) => {
    if (r.status === 'Pending' || r.status === 'Queued') {
      pendingRecipients.push(idx);
    }
  });

  if (pendingRecipients.length === 0) {
    campaign.status = 'Completed';
    await campaign.save();
    return { message: 'No pending recipients', queued: 0 };
  }

  const q = await getQueue();
  if (q) {
    // Use BullMQ queue — each job handles its own MailEvent creation
    // (BullMQ processes jobs async, so per-job tracking is appropriate)
    const jobs = pendingRecipients.map((idx) => ({
      name: 'send-email',
      data: { campaignId: String(campaign._id), recipientIndex: idx },
    }));
    await q.addBulk(jobs);
    return { message: `Queued ${jobs.length} emails`, queued: jobs.length };
  }

  // Fallback: batch-send all emails FIRST, then batch-create tracking events AFTER
  // Reload the campaign to get fresh data with sender profile populated
  const freshCampaign = await Campaign.findById(campaignId).populate('senderProfileId');
  if (!freshCampaign) {
    return { error: 'Campaign not found on reload' };
  }

  // Step 1: Send ALL emails (no tracking events created during sending)
  console.log(`[CampaignEmailQueue] Batch-sending ${pendingRecipients.length} emails...`);
  const results = await batchSendEmails(freshCampaign);

  // Save campaign once after all sends
  freshCampaign.status = results.some((r) => r.status === 'Failed' || r.status === 'Invalid') && results.every((r) => r.status !== 'Sent')
    ? 'Failed'
    : 'Completed';
  await freshCampaign.save();

  // Step 2: Batch-create tracking events AFTER all sends are complete
  const eventsCreated = await batchCreateTrackingEvents(results);
  console.log(`[CampaignEmailQueue] Batch send complete: ${results.length} sent, ${eventsCreated} tracking events created`);

  return {
    message: `Sent ${results.length}, created ${eventsCreated} tracking events`,
    sent: results.filter((r) => r.status === 'Sent').length,
    failed: results.filter((r) => r.status === 'Failed' || r.status === 'Invalid').length,
    trackingEvents: eventsCreated,
  };
}

async function stopCampaign(campaignId) {
  const { markCampaignStopped } = require('./campaignQueueState');
  markCampaignStopped(campaignId);

  const campaign = await Campaign.findById(campaignId);
  if (campaign && (campaign.status === 'Sending' || campaign.status === 'Queued')) {
    campaign.status = 'Stopped';
    campaign.stoppedAt = new Date();
    await campaign.save();
  }

  return { message: 'Campaign stopped' };
}

async function initCampaignWorker() {
  if (worker) return worker;
  try {
    const { Worker } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

    worker = new Worker('campaign-email-queue', async (job) => {
      await processEmailJob(job);
    }, { connection, concurrency: 5 });

    console.log('[CampaignEmailQueue] Worker initialized');
    return worker;
  } catch (err) {
    console.warn('[CampaignEmailQueue] Worker not available:', err.message);
    return null;
  }
}

async function resumeStuckCampaigns() {
  const stuck = await Campaign.find({ status: 'Sending' });
  for (const campaign of stuck) {
    campaign.status = 'Queued';
    await campaign.save();
    console.log(`[CampaignEmailQueue] Resumed stuck campaign: ${campaign._id}`);
  }
}

module.exports = {
  dispatchCampaignJobs,
  stopCampaign,
  initCampaignWorker,
  resumeStuckCampaigns,
};
