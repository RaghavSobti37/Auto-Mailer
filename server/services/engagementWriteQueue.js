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

function normalizeEmail(email) {
  return String(email || 'unknown').toLowerCase().trim() || 'unknown';
}

function buildDedupeKey({ eventType, campaignId, campaignKey, email, messageId, metadata, linkClicked }) {
  const type = String(eventType || '').toLowerCase();
  const scope = campaignId ? String(campaignId) : String(campaignKey || '');
  if (messageId && ['send', 'delivery', 'bounce', 'complaint', 'skipped'].includes(type)) {
    return `${type}:message:${messageId}`;
  }
  if (type === 'open') {
    const recipient = metadata?.recipientId || messageId || normalizeEmail(email);
    return `open:${scope}:${recipient}`;
  }
  if (type === 'click') {
    const recipient = metadata?.trackingId || messageId || normalizeEmail(email);
    const target = linkClicked || metadata?.targetUrl || '';
    return `click:${scope}:${recipient}:${target}`;
  }
  return undefined;
}

async function recordMailEvent({ eventType, email, campaignKey, metadata, messageId, linkClicked, senderProfileId, rotationProvider, dedupeKey }) {
  const campaign = await resolveCampaign(campaignKey);
  const campaignId = campaign?._id;
  const normalizedEmail = normalizeEmail(email);
  const eventDedupeKey = dedupeKey || buildDedupeKey({
    eventType,
    email: normalizedEmail,
    campaignKey,
    campaignId,
    metadata,
    messageId,
    linkClicked,
  });
  const doc = {
    eventType,
    email: normalizedEmail,
    timestamp: new Date(),
    campaignId,
    messageId: messageId || undefined,
    dedupeKey: eventDedupeKey,
    metadata: metadata || undefined,
    linkClicked: linkClicked || undefined,
    senderProfileId: senderProfileId || undefined,
    rotationProvider: rotationProvider || undefined,
  };
  let created = true;
  if (eventDedupeKey) {
    const result = await MailEvent.updateOne(
      { dedupeKey: eventDedupeKey },
      { $setOnInsert: doc },
      { upsert: true },
    );
    created = Boolean(result.upsertedCount);
  } else {
    await MailEvent.create(doc);
  }
  return { campaignId, created };
}

async function recordOpen({ campaignKey, recipientId, email }) {
  const result = await recordMailEvent({
    eventType: 'Open',
    email,
    campaignKey,
    metadata: { recipientId },
  });
  if (!result.campaignId || !result.created) return;

  await Campaign.findByIdAndUpdate(result.campaignId, {
    $inc: { 'metrics.opened': 1, 'stats.opened': 1 },
    $push: { timeSeries: { time: new Date(), opens: 1, clicks: 0 } },
  });
}

async function recordClick({ campaignKey, trackingId, email, targetUrl }) {
  const result = await recordMailEvent({
    eventType: 'Click',
    email,
    campaignKey,
    metadata: { trackingId, clicked: true, targetUrl },
    linkClicked: targetUrl || undefined,
  });
  if (!result.campaignId || !result.created) return;

  await Campaign.findByIdAndUpdate(result.campaignId, {
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
  buildDedupeKey,
};
