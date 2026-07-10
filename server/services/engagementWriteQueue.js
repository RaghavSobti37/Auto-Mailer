const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');

const queue = [];
let draining = false;

function enqueueEngagementWrite(task) {
  if (typeof task !== 'function') return;
  queue.push(task);
  if (!draining) {
    draining = true;
    setImmediate(drainQueue);
  }
}

async function drainQueue() {
  while (queue.length) {
    const task = queue.shift();
    try {
      await task();
    } catch (err) {
      console.error('[EngagementWriteQueue] task failed:', err.message);
    }
  }
  draining = false;
}

async function resolveCampaign(campaignKey) {
  if (!campaignKey || campaignKey === 'undefined') return null;
  const query = { $or: [{ campaignId: campaignKey }] };
  if (/^[0-9a-fA-F]{24}$/.test(campaignKey)) {
    query.$or.push({ _id: campaignKey });
  }
  const campaign = await Campaign.findOne(query).select('_id').lean();
  if (campaign) return campaign;
  return MailCampaign.findOne(query).select('_id').lean();
}

async function recordMailEvent({ eventType, email, campaignKey, metadata, messageId, linkClicked, senderProfileId, rotationProvider }) {
  const campaign = await resolveCampaign(campaignKey);
  await MailEvent.create({
    eventType,
    email: email || 'unknown',
    timestamp: new Date(),
    campaignId: campaign?._id,
    messageId: messageId || undefined,
    metadata: metadata || undefined,
    linkClicked: linkClicked || undefined,
    senderProfileId: senderProfileId || undefined,
    rotationProvider: rotationProvider || undefined,
  });
  return campaign?._id;
}

async function recordOpen({ campaignKey, recipientId, email }) {
  const campaignObjectId = await recordMailEvent({
    eventType: 'Open',
    email,
    campaignKey,
    metadata: { recipientId },
  });
  if (!campaignObjectId) return;

  await Campaign.findByIdAndUpdate(campaignObjectId, {
    $inc: { 'metrics.opened': 1, 'stats.opened': 1 },
    $push: { timeSeries: { time: new Date(), opens: 1, clicks: 0 } },
  });
}

async function recordClick({ campaignKey, trackingId, email, targetUrl }) {
  const campaignObjectId = await recordMailEvent({
    eventType: 'Click',
    email,
    campaignKey,
    metadata: { trackingId, clicked: true },
    linkClicked: targetUrl || undefined,
  });
  if (!campaignObjectId) return;

  await Campaign.findByIdAndUpdate(campaignObjectId, {
    $inc: { 'metrics.clicked': 1, 'stats.clicked': 1 },
    $push: { timeSeries: { time: new Date(), opens: 0, clicks: 1 } },
  });
}

module.exports = {
  enqueueEngagementWrite,
  recordMailEvent,
  recordOpen,
  recordClick,
  resolveCampaign,
};
