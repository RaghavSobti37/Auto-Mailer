const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');
const EmailLog = require('../models/EmailLog');
const { updateEmailTags } = require('../services/mailService');
const config = require('../config');

// Tracking pixel - 1x1 transparent GIF
router.get('/open/:campaignId/:recipientId.gif', async (req, res) => {
  const { campaignId, recipientId } = req.params;
  const { email } = req.query;

  try {
    await MailEvent.create({
      eventType: 'Open',
      email: email || 'unknown',
      timestamp: new Date(),
      campaignId: campaignId !== 'undefined' ? campaignId : null,
      metadata: { recipientId, ip: req.ip },
    });

    // Update campaign metrics
    if (campaignId && campaignId !== 'undefined') {
      const updatePayload = { $inc: { 'metrics.opened': 1, 'stats.opened': 1 } };
      const arrayFilter = { 'recipients._id': recipientId };

      // Try Core Campaign model first
      const coreResult = await Campaign.findOneAndUpdate(
        { $or: [{ _id: campaignId }, { campaignId }] },
        { ...updatePayload, $push: { timeSeries: { time: new Date(), opens: 1, clicks: 0 } } },
        { arrayFilters: [{ 'elem._id': recipientId, 'elem.status': { $nin: ['Opened', 'Clicked'] } }] },
      );

      if (!coreResult) {
        await MailCampaign.findOneAndUpdate(
          { _id: campaignId },
          { $inc: { 'stats.opened': 1 } },
          { arrayFilters: [{ 'elem._id': recipientId, 'elem.status': { $nin: ['Opened', 'Clicked'] } }] },
        );
      }
    }

    if (email) {
      await updateEmailTags(email, 'Active', 'Active');
    }
  } catch (err) {
    console.error('Open tracking error:', err);
  }

  // Return 1x1 transparent GIF
  const buf = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(buf);
});

// Click tracking
router.get('/click/:campaignId/:trackingId', async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const { url } = req.query;
  const targetUrl = url && url !== '#' && url !== 'undefined' ? url : null;

  try {
    await MailEvent.create({
      eventType: 'Click',
      email: req.query.email || 'unknown',
      timestamp: new Date(),
      campaignId: campaignId !== 'undefined' ? campaignId : null,
      metadata: { trackingId, url: targetUrl, ip: req.ip },
      linkClicked: targetUrl || undefined,
    });

    if (campaignId && campaignId !== 'undefined') {
      await Campaign.findOneAndUpdate(
        { $or: [{ _id: campaignId }, { campaignId }] },
        { $inc: { 'metrics.clicked': 1, 'stats.clicked': 1 }, $push: { timeSeries: { time: new Date(), opens: 0, clicks: 1 } } },
      );
    }
  } catch (err) {
    console.error('Click tracking error:', err);
  }

  if (targetUrl) {
    return res.redirect(targetUrl);
  }
  res.redirect(config.frontendUrl || 'https://theshakticollective.in');
});

// Unsubscribe page
router.get('/unsubscribe/:campaignId/:trackingId', async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const { email } = req.query;
  const frontendUrl = config.frontendUrl || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/unsubscribe?email=${encodeURIComponent(email || '')}&campaignId=${campaignId}&trackingId=${trackingId}`);
});

// Unsubscribe POST handler
router.post('/unsubscribe/:campaignId/:trackingId', async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const { email, reason } = req.body;

  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Record unsubscribe in EmailLog
    await EmailLog.findOneAndUpdate(
      { campaignId, leadEmail: email.toLowerCase().trim() },
      { $set: { opened: false, clicked: false } },
      { upsert: true },
    );

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email stream endpoints
router.get('/email-streams', async (req, res) => {
  try {
    const streams = await Campaign.distinct('emailStreamSlug', { emailStreamSlug: { $ne: null } });
    res.json(streams.filter(Boolean).map((s) => ({ slug: s, name: s })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
