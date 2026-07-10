const express = require('express');
const router = express.Router();
const { handleResendWebhook } = require('../webhooks/resendWebhookHandler');

// Resend webhook endpoint
router.post('/resend', handleResendWebhook);

// Health check for webhooks
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webhooks' });
});

module.exports = router;
