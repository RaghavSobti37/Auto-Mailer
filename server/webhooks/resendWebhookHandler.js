const Campaign = require('../models/Campaign');
const { recordMailEvent, recordOpen, recordClick } = require('../services/engagementWriteQueue');

/**
 * Handle incoming Resend webhook events (delivery, open, click, bounce, complaint).
 */
async function handleResendWebhook(req, res) {
  try {
    const signature = req.headers['svix-signature'] || req.headers['resend-signature'];
    const payload = req.body;

    if (!payload || !payload.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const eventType = payload.type;
    const email = payload.data?.email || payload.data?.to?.[0] || '';
    const messageId = payload.data?.message_id || payload.data?.id || '';

    // Map Resend event types to our event types
    let mappedType;
    switch (eventType) {
      case 'email.delivered': mappedType = 'Delivery'; break;
      case 'email.bounced': mappedType = 'Bounce'; break;
      case 'email.complained': mappedType = 'Complaint'; break;
      case 'email.sent': mappedType = 'Send'; break;
      case 'email.opened': mappedType = 'Open'; break;
      case 'email.clicked': mappedType = 'Click'; break;
      default: mappedType = eventType;
    }

    const campaign = messageId
      ? await Campaign.findOne({ 'recipients.messageId': messageId }).select('_id campaignId recipients.$').lean()
      : null;
    const campaignKey = campaign?.campaignId || (campaign?._id ? String(campaign._id) : undefined);
    const recipientId = campaign?.recipients?.[0]?._id ? String(campaign.recipients[0]._id) : messageId;

    if (mappedType === 'Open' && campaignKey) {
      await recordOpen({ campaignKey, recipientId, email });
    } else if (mappedType === 'Click' && campaignKey) {
      await recordClick({
        campaignKey,
        trackingId: recipientId,
        email,
        targetUrl: payload.data?.link?.url || payload.data?.url,
      });
    } else {
      await recordMailEvent({
        eventType: mappedType,
        email,
        campaignKey,
        messageId,
        metadata: payload.data,
      });
    }

    if (messageId && mappedType !== 'Open' && mappedType !== 'Click') {
      await Campaign.updateOne(
        { 'recipients.messageId': messageId },
        {
          $set: { 'recipients.$.status': mappedType === 'Bounce' ? 'Bounced' : 'Sent' },
          $inc: mappedType === 'Bounce' ? { 'metrics.bounced': 1 } : {},
        },
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[ResendWebhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handleResendWebhook };
