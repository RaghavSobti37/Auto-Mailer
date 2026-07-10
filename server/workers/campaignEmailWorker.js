const config = require('../config');
const { processEmailJob } = require('../services/emailProcessor');
const { resumeStuckCampaigns } = require('../services/campaignEmailQueue');

let worker = null;

async function initCampaignWorker() {
  if (worker) return worker;

  try {
    const { Worker } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

    worker = new Worker('campaign-email-queue', async (job) => {
      console.log(`[CampaignWorker] Processing job ${job.id}: campaign=${job.data.campaignId}, recipient=${job.data.recipientIndex}`);
      await processEmailJob(job);
    }, {
      connection,
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    });

    worker.on('completed', (job) => {
      console.log(`[CampaignWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[CampaignWorker] Job ${job.id} failed:`, err.message);
    });

    // Resume any campaigns that were stuck in 'Sending' state
    await resumeStuckCampaigns();

    console.log('[CampaignWorker] Initialized successfully');
    return worker;
  } catch (err) {
    console.warn('[CampaignWorker] Could not initialize (Redis may be unavailable):', err.message);
    return null;
  }
}

async function closeWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

module.exports = { initCampaignWorker, closeWorker };
