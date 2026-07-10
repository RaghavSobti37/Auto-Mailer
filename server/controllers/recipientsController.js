/**
 * Campaign recipients controller.
 * Handles listing campaign recipients with pagination and status filtering.
 */
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');

/**
 * GET /api/campaigns/:id/recipients
 * List campaign recipients with pagination and status filtering.
 */
exports.listRecipients = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 1000);
    const status = req.query.status || 'all';
    const hideInvalid = req.query.hideInvalid === 'true';

    let campaign = await Campaign.findById(id).lean();
    let isLegacy = false;
    if (!campaign) {
      campaign = await MailCampaign.findById(id).lean();
      isLegacy = !!campaign;
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const recipients = campaign.recipients || [];

    // Apply filters
    let filtered = recipients;
    if (status !== 'all') {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (hideInvalid) {
      filtered = filtered.filter((r) => !['Invalid', 'Bounced', 'Failed'].includes(r.status));
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // Enrich with MailEvent data if available
    const enriched = await enrichRecipientsWithEvents(paginated, id);

    res.json({
      recipients: enriched,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/campaigns/:id/analytics
 * Get analytics for a campaign.
 */
exports.analytics = async (req, res) => {
  try {
    const { id } = req.params;

    let campaign = await Campaign.findById(id).select('recipients metrics stats timeSeries locationBreakdown').lean();
    if (!campaign) {
      campaign = await MailCampaign.findById(id).select('recipients stats timeSeries locationBreakdown').lean();
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const recipients = campaign.recipients || [];
    let stats = { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, invalid: 0 };

    recipients.forEach((r) => {
      stats.total++;
      if (r.status === 'Sent' || r.status === 'Opened' || r.status === 'Clicked') stats.sent++;
      if (r.status === 'Opened' || r.status === 'Clicked') stats.opened++;
      if (r.status === 'Clicked') stats.clicked++;
      if (['Bounced', 'Failed'].includes(r.status)) stats.bounced++;
      if (r.status === 'Unsubscribed') stats.unsubscribed++;
      if (r.status === 'Invalid') stats.invalid++;
    });

    res.json({
      ...stats,
      timeSeries: campaign.timeSeries || [],
      locationBreakdown: campaign.locationBreakdown || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/campaigns/:id/resend
 * Resend a campaign (creates a new dispatch for failed/pending recipients).
 */
exports.resend = async (req, res) => {
  try {
    const { id } = req.params;

    let campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Reset failed/pending recipients
    let resetCount = 0;
    campaign.recipients.forEach((r) => {
      if (['Failed', 'Invalid', 'Bounced'].includes(r.status)) {
        r.status = 'Pending';
        r.error = undefined;
        r.messageId = undefined;
        r.sentAt = undefined;
        resetCount++;
      }
    });

    if (resetCount === 0) {
      return res.status(400).json({ error: 'No failed recipients to resend' });
    }

    campaign.status = 'Queued';
    await campaign.save();

    const { dispatchCampaignJobs } = require('../services/campaignEmailQueue');
    const result = await dispatchCampaignJobs(campaign._id);

    res.json({
      message: `Resending to ${resetCount} recipients`,
      resetCount,
      dispatch: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/campaigns/:id/resend-filtered
 * Resend only to specific recipients (filtered by email or status).
 */
exports.resendFiltered = async (req, res) => {
  try {
    const { id } = req.params;
    const { emails = [], statuses = [] } = req.body;

    let campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const filterSet = new Set(emails.map((e) => e.toLowerCase().trim()));
    const statusSet = new Set(statuses);
    let resetCount = 0;

    campaign.recipients.forEach((r) => {
      const matchEmail = emails.length === 0 || filterSet.has((r.email || '').toLowerCase());
      const matchStatus = statuses.length === 0 || statusSet.has(r.status);
      if (matchEmail && matchStatus && ['Failed', 'Invalid', 'Bounced'].includes(r.status)) {
        r.status = 'Pending';
        r.error = undefined;
        r.messageId = undefined;
        r.sentAt = undefined;
        resetCount++;
      }
    });

    if (resetCount === 0) {
      return res.status(400).json({ error: 'No matching recipients found to resend' });
    }

    campaign.status = 'Queued';
    await campaign.save();

    const { dispatchCampaignJobs } = require('../services/campaignEmailQueue');
    const result = await dispatchCampaignJobs(campaign._id);

    res.json({
      message: `Resending to ${resetCount} filtered recipients`,
      resetCount,
      dispatch: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function enrichRecipientsWithEvents(recipients, campaignId) {
  if (!recipients.length) return recipients;

  const emails = recipients.map((r) => r.email).filter(Boolean);
  const events = await MailEvent.find({
    campaignId,
    email: { $in: emails },
    eventType: { $in: ['Open', 'Click'] },
  }).sort({ timestamp: -1 }).lean();

  const eventMap = {};
  for (const event of events) {
    if (!eventMap[event.email]) {
      eventMap[event.email] = { opened: false, clicked: false, lastEvent: null };
    }
    if (event.eventType === 'Open') eventMap[event.email].opened = true;
    if (event.eventType === 'Click') eventMap[event.email].clicked = true;
    if (!eventMap[event.email].lastEvent || event.timestamp > eventMap[event.email].lastEvent) {
      eventMap[event.email].lastEvent = event.timestamp;
    }
  }

  return recipients.map((r) => ({
    ...r,
    _id: r._id,
    email: r.email,
    name: r.name || '',
    status: r.status,
    sentAt: r.sentAt,
    error: r.error,
    messageId: r.messageId,
    eventDetails: eventMap[r.email] || null,
  }));
}
