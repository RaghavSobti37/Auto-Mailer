const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const { dispatchEmailPayload, normalizeToList } = require('../services/mailDriver');

const MAX_TRANSACTIONAL_RECIPIENTS = 50;
const MAX_TRANSACTIONAL_SUBJECT_LENGTH = 300;
const MAX_TRANSACTIONAL_HTML_BYTES = 1024 * 1024;
const ALLOWED_TRANSACTIONAL_SOURCES = new Set(['coreknot']);

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requestSecret(req) {
  const auth = req.get?.('authorization') || '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  return req.get?.('x-coreknot-mail-secret') || '';
}

function isAuthorizedCoreKnotRequest(req, expectedSecret = config.coreKnotMailBridgeSecret) {
  if (!expectedSecret) return false;
  return timingSafeEqualString(requestSecret(req), expectedSecret);
}

function utf8ByteLength(value) {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function normalizeTransactionalPayload(body = {}) {
  return {
    to: normalizeToList(body.to),
    cc: normalizeToList(body.cc),
    subject: String(body.subject || '').trim(),
    html: String(body.html || ''),
    from: body.from ? String(body.from).trim() : undefined,
    source: body.source ? String(body.source).trim() : undefined,
  };
}

function validateTransactionalPayload(payload) {
  if (!payload.to.length) return 'No valid recipients';
  if (payload.to.length > MAX_TRANSACTIONAL_RECIPIENTS) {
    return `Transactional email is limited to ${MAX_TRANSACTIONAL_RECIPIENTS} recipients`;
  }
  if (!payload.subject) return 'Subject is required';
  if (payload.subject.length > MAX_TRANSACTIONAL_SUBJECT_LENGTH) {
    return `Subject is limited to ${MAX_TRANSACTIONAL_SUBJECT_LENGTH} characters`;
  }
  if (!payload.html) return 'HTML body is required';
  if (utf8ByteLength(payload.html) > MAX_TRANSACTIONAL_HTML_BYTES) {
    return 'HTML body is too large for transactional email';
  }
  if (payload.source && !ALLOWED_TRANSACTIONAL_SOURCES.has(payload.source)) {
    return 'Unsupported transactional source';
  }
  return '';
}

async function sendTransactionalEmail({ body, dispatch = dispatchEmailPayload } = {}) {
  const payload = normalizeTransactionalPayload(body);
  const validationError = validateTransactionalPayload(payload);
  if (validationError) return { status: 400, body: { error: validationError } };

  const result = await dispatch(payload);
  if (result?.error) return { status: 502, body: { error: result.error, provider: result.provider } };
  return { status: 202, body: { queued: true, ...result } };
}

function createTransactionalRouter({ dispatch = dispatchEmailPayload } = {}) {
  const router = express.Router();

  router.post('/send', async (req, res) => {
    if (!config.coreKnotMailBridgeSecret) {
      return res.status(503).json({ error: 'COREKNOT_MAIL_BRIDGE_SECRET is not configured' });
    }
    if (!isAuthorizedCoreKnotRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await sendTransactionalEmail({ body: req.body, dispatch });
      return res.status(result.status).json(result.body);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createTransactionalRouter();
module.exports.createTransactionalRouter = createTransactionalRouter;
module.exports.isAuthorizedCoreKnotRequest = isAuthorizedCoreKnotRequest;
module.exports.normalizeTransactionalPayload = normalizeTransactionalPayload;
module.exports.validateTransactionalPayload = validateTransactionalPayload;
module.exports.sendTransactionalEmail = sendTransactionalEmail;
module.exports.limits = {
  MAX_TRANSACTIONAL_RECIPIENTS,
  MAX_TRANSACTIONAL_SUBJECT_LENGTH,
  MAX_TRANSACTIONAL_HTML_BYTES,
};
