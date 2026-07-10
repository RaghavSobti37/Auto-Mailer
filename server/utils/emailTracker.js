const crypto = require('crypto');

function generatePixelId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateClickId() {
  return crypto.randomBytes(16).toString('hex');
}

function buildPixelUrl(baseUrl, campaignId, pixelId) {
  return `${baseUrl}/track/open/${campaignId}/${pixelId}.gif`;
}

function buildClickUrl(baseUrl, campaignId, clickId, targetUrl) {
  const encoded = encodeURIComponent(targetUrl);
  return `${baseUrl}/track/click/${campaignId}/${clickId}?url=${encoded}`;
}

function buildUnsubscribeUrl(baseUrl, campaignId, trackingId, email) {
  return `${baseUrl}/track/unsubscribe/${campaignId}/${trackingId}?email=${encodeURIComponent(email || '')}`;
}

module.exports = {
  generatePixelId,
  generateClickId,
  buildPixelUrl,
  buildClickUrl,
  buildUnsubscribeUrl,
};
