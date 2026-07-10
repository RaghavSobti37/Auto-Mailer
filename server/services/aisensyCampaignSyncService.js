const CampaignChannelOutcome = require('../models/CampaignChannelOutcome');
const WhatsappCampaignRegistry = require('../models/WhatsappCampaignRegistry');
const EmailLog = require('../models/EmailLog');
const { normalizeCampaignBaseName } = require('./aisensyCampaignNameUtils');

const STATUS_RANK = { sent: 1, delivered: 2, read: 3, clicked: 4, replied: 5, failed: 6 };

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizePhone(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeTags(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(/[,;|]/);
  return [...new Set(list.map((tag) => clean(tag)).filter(Boolean))];
}

function normalizeAisensyStatus(raw) {
  const status = clean(raw).toLowerCase();
  if (status.includes('fail') || status === 'undelivered') return 'failed';
  if (status.includes('repl')) return 'replied';
  if (status.includes('click')) return 'clicked';
  if (status.includes('read')) return 'read';
  if (status.includes('deliver')) return 'delivered';
  return 'sent';
}

function pickHigherStatus(current, incoming) {
  const cur = normalizeAisensyStatus(current);
  const next = normalizeAisensyStatus(incoming);
  return (STATUS_RANK[next] || 0) >= (STATUS_RANK[cur] || 0) ? next : cur;
}

async function registerWhatsappCampaign(campaignName, tags = []) {
  const name = clean(campaignName);
  if (!name) return null;
  return WhatsappCampaignRegistry.findOneAndUpdate(
    { campaignName: name },
    {
      $set: { lastSeenAt: new Date() },
      $addToSet: { tags: { $each: normalizeTags(tags) } },
      $setOnInsert: { campaignName: name, channel: 'whatsapp', firstSeenAt: new Date() },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
}

async function syncCampaignOutcome({
  campaignName,
  phone: rawPhone,
  name,
  email: rawEmail,
  status,
  failureReason,
  sentAt,
  tags = [],
  messageId,
  sourceFilename,
  metadata = {},
  dryRun = false,
}) {
  const campaign = clean(campaignName);
  const phone = normalizePhone(rawPhone);
  const email = normalizeEmail(rawEmail);
  const normalizedStatus = normalizeAisensyStatus(status);
  const normalizedTags = normalizeTags(tags);

  if (!campaign || !phone) return { ok: false, reason: 'missing_campaign_or_phone' };
  if (dryRun) return { ok: true, dryRun: true, campaignName: campaign, phone, status: normalizedStatus };

  await registerWhatsappCampaign(campaign, normalizedTags);

  const existing = await CampaignChannelOutcome.findOne({ campaignName: campaign, phone })
    .select('status tags metadata')
    .lean();
  const mergedStatus = pickHigherStatus(existing?.status, normalizedStatus);
  const mergedTags = [...new Set([...(existing?.tags || []), ...normalizedTags])];
  const activityScore = STATUS_RANK[mergedStatus] || 0;

  const outcome = await CampaignChannelOutcome.findOneAndUpdate(
    { campaignName: campaign, phone },
    {
      $set: {
        campaignName: campaign,
        channel: 'whatsapp',
        status: mergedStatus,
        activityScore,
        name: clean(name) || undefined,
        email: email || undefined,
        phone,
        failureReason: failureReason || undefined,
        sentAt: sentAt || undefined,
        sourceFilename: sourceFilename || undefined,
        tags: mergedTags,
        messageId: messageId || undefined,
        metadata: { ...(existing?.metadata || {}), ...metadata },
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  await EmailLog.findOneAndUpdate(
    email ? { leadEmail: email, campaignId: `whatsapp:${campaign}` } : { phone, campaignId: `whatsapp:${campaign}` },
    {
      $set: {
        campaignId: `whatsapp:${campaign}`,
        leadEmail: email || `${phone}@whatsapp.local`,
        name: clean(name) || '',
        phone,
        channel: 'whatsapp',
        opened: ['read', 'clicked', 'replied'].includes(mergedStatus),
        clicked: ['clicked', 'replied'].includes(mergedStatus),
        bounced: mergedStatus === 'failed',
        whatsapp: {
          campaignName: campaign,
          status: mergedStatus,
          activityScore,
          failureReason: failureReason || undefined,
          sentAt: sentAt || undefined,
          deliveredAt: metadata.deliveredAt || undefined,
          readAt: metadata.readAt || undefined,
          clickedAt: metadata.clickedAt || undefined,
          tags: mergedTags,
          sourceFilename: sourceFilename || undefined,
        },
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  return { ok: true, campaignName: campaign, phone, status: mergedStatus, activityScore, outcomeId: outcome._id };
}

async function resolveCampaignNameAliases(campaignName) {
  const base = normalizeCampaignBaseName(campaignName) || clean(campaignName);
  const aliases = new Set([base, clean(campaignName)].filter(Boolean));
  const rows = await CampaignChannelOutcome.find({}).select('campaignName').lean();
  for (const row of rows) {
    if (normalizeCampaignBaseName(row.campaignName) === base) aliases.add(row.campaignName);
  }
  return { baseName: base, aliases: [...aliases] };
}

async function listCampaignOutcomeUsers({ campaignName, page = 1, limit = 50, status } = {}) {
  const { baseName, aliases } = await resolveCampaignNameAliases(campaignName);
  const take = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = Math.max(0, (Number(page) || 1) - 1) * take;
  const query = { campaignName: { $in: aliases } };
  if (status && status !== 'all') query.status = normalizeAisensyStatus(status);
  const [recipients, total] = await Promise.all([
    CampaignChannelOutcome.find(query).sort({ updatedAt: -1 }).skip(skip).limit(take).lean(),
    CampaignChannelOutcome.countDocuments(query),
  ]);
  return { campaignName: baseName, aliases, page: Number(page) || 1, limit: take, total, pages: total ? Math.ceil(total / take) : 0, recipients };
}

async function listCampaignSummaries() {
  const rows = await CampaignChannelOutcome.aggregate([
    { $group: { _id: { campaignName: '$campaignName', status: '$status' }, count: { $sum: 1 }, score: { $avg: '$activityScore' } } },
    { $sort: { '_id.campaignName': 1, '_id.status': 1 } },
  ]);

  const campaigns = new Map();
  for (const row of rows) {
    const rawName = row._id.campaignName;
    const name = normalizeCampaignBaseName(rawName) || rawName;
    if (!campaigns.has(name)) {
      campaigns.set(name, { campaignName: name, segmentNames: new Set(), total: 0, byStatus: {}, activityScore: 0 });
    }
    const entry = campaigns.get(name);
    entry.segmentNames.add(rawName);
    entry.byStatus[row._id.status] = (entry.byStatus[row._id.status] || 0) + row.count;
    entry.total += row.count;
    entry.activityScore += (row.score || 0) * row.count;
  }

  return [...campaigns.values()].map((entry) => ({
    ...entry,
    segmentNames: [...entry.segmentNames],
    activityScore: entry.total ? Number((entry.activityScore / entry.total).toFixed(2)) : 0,
  }));
}

module.exports = {
  STATUS_RANK,
  normalizeAisensyStatus,
  normalizeEmail,
  normalizePhone,
  normalizeTags,
  pickHigherStatus,
  registerWhatsappCampaign,
  syncCampaignOutcome,
  listCampaignSummaries,
  listCampaignOutcomeUsers,
};
