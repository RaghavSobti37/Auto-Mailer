const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');
const { updateEmailTags } = require('../services/mailService');
const { enqueueEngagementWrite, recordOpen, recordClick } = require('../services/engagementWriteQueue');

// Tracking pixel - 1x1 transparent GIF
router.get('/open/:campaignId/:recipientId.gif', async (req, res) => {
  const { campaignId, recipientId } = req.params;
  const { email } = req.query;

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

  enqueueEngagementWrite(async () => {
    await recordOpen({ campaignKey: campaignId, recipientId, email });
    if (email) await updateEmailTags(email, 'Active', 'Active');
  });
});

// Click tracking
router.get('/click/:campaignId/:trackingId', async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const { url } = req.query;
  const targetUrl = url && url !== '#' && url !== 'undefined' ? url : null;

  enqueueEngagementWrite(() => recordClick({
    campaignKey: campaignId,
    trackingId,
    email: req.query.email,
    targetUrl,
  }));

  if (targetUrl) {
    return res.redirect(targetUrl);
  }
  res.redirect(process.env.FRONTEND_URL || 'https://theshakticollective.in');
});

// Unsubscribe page
router.get('/unsubscribe/:campaignId/:trackingId', async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const { email } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
