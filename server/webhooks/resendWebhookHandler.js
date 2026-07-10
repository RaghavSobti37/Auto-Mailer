const config = require('../config');
const Campaign = require('../models/Campaign');
const MailEvent = require('../models/MailEvent');

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
      default: mappedType = eventType;
    }

    // Log the event
    await MailEvent.create({
      eventType: mappedType,
      email,
      messageId,
      timestamp: new Date(),
      metadata: payload.data,
    });

    // Update campaign if messageId matches
    if (messageId) {
      await Campaign.updateOne(
        { 'recipients.messageId': messageId },
        {
          $set: { 'recipients.$.status': mappedType === 'Bounce' ? 'Bounced' : mappedType === 'Delivery' ? 'Sent' : 'Sent' },
          $inc: mappedType === 'Bounce' ? { 'metrics.bounced': 1 } : { 'metrics.totalSent': 1 },
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
