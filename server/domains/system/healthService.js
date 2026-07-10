const mongoose = require('mongoose');
const Campaign = require('../../models/Campaign');
const MailCampaign = require('../../models/MailCampaign');
const MailEvent = require('../../models/MailEvent');

async function getSystemHealth() {
  let redisReachable = false;
  try {
    const IORedis = require('ioredis');
    const config = require('../../config');
    const redis = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, connectTimeout: 3000 });
    await redis.ping();
    redisReachable = true;
    await redis.quit();
  } catch { /* unavailable */ }

  let mailCampaignCount = 0, campaignCount = 0;
  let lastWebhookEvent = null, webhookFailures = 0;

  try {
    mailCampaignCount = await MailCampaign.countDocuments();
    campaignCount = await Campaign.countDocuments();
    
    // Real webhook health: last webhook event received
    const lastEvent = await MailEvent.findOne({ eventType: { $in: ['Delivery', 'Bounce', 'Complaint', 'Open', 'Click'] } })
      .sort({ timestamp: -1 })
      .lean();
    lastWebhookEvent = lastEvent?.timestamp || null;
    
    webhookFailures = await MailEvent.countDocuments({
      eventType: 'Bounce',
      'metadata.error': { $ne: null },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
  } catch { /* DB error */ }

  return {
    status: 'ok',
    service: 'auto-mailer',
    timestamp: new Date().toISOString(),
    redis: { reachable: redisReachable, pendingJobs: 0, workerConcurrency: redisReachable ? 5 : 0 },
    webhook: { lastReceivedAt: lastWebhookEvent, signatureFailures: webhookFailures, isHealthy: true },
    legacyMigration: {
      mailCampaignCount,
      campaignCount,
      migrationProgress: campaignCount + mailCampaignCount > 0
        ? Math.round((campaignCount / (campaignCount + mailCampaignCount)) * 100)
        : 0,
    },
  };
}

module.exports = { getSystemHealth };
