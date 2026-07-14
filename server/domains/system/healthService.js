const mongoose = require('mongoose');
const Campaign = require('../../models/Campaign');
const MailCampaign = require('../../models/MailCampaign');
const MailEvent = require('../../models/MailEvent');

async function getSystemHealth() {
  let redisReachable = false;
  const timeout = (ms, fallback = null) => new Promise((resolve) => setTimeout(() => resolve(fallback), ms));

  try {
    const IORedis = require('ioredis');
    const config = require('../../config');
    const redis = new IORedis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      commandTimeout: 1500,
    });
    redisReachable = await Promise.race([
      redis.connect().then(() => redis.ping()).then(() => true).catch(() => false),
      timeout(2000, false),
    ]);
    redis.disconnect();
  } catch { /* unavailable */ }

  let mailCampaignCount = 0, campaignCount = 0;
  let lastWebhookEvent = null, webhookFailures = 0;

  try {
    const [mailCountResult, campaignCountResult, lastEventResult, failureCountResult] = await Promise.allSettled([
      MailCampaign.countDocuments().maxTimeMS(2000),
      Campaign.countDocuments().maxTimeMS(2000),
      MailEvent.findOne({ eventType: { $in: ['Delivery', 'Bounce', 'Complaint', 'Open', 'Click'] } })
        .sort({ timestamp: -1 })
        .maxTimeMS(2000)
        .lean(),
      MailEvent.countDocuments({
        eventType: 'Bounce',
        'metadata.error': { $ne: null },
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).maxTimeMS(2000),
    ]);

    mailCampaignCount = mailCountResult.status === 'fulfilled' ? mailCountResult.value : 0;
    campaignCount = campaignCountResult.status === 'fulfilled' ? campaignCountResult.value : 0;
    
    const lastEvent = lastEventResult.status === 'fulfilled' ? lastEventResult.value : null;
    lastWebhookEvent = lastEvent?.timestamp || null;
    webhookFailures = failureCountResult.status === 'fulfilled' ? failureCountResult.value : 0;
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
