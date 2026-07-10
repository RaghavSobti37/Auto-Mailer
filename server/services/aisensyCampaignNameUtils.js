const path = require('path');

const SEGMENT_SUFFIX_RE = /\s*(failed audience|failed|delivered audience|delivered|read audience|read|clicked audience|clicked|click audience|replied audience|replied|sent audience|sent)\s*/gi;

function normalizeCampaignBaseName(name = '') {
  return String(name)
    .replace(/\.csv$/i, '')
    .replace(SEGMENT_SUFFIX_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferStatusFromFilename(filename = '') {
  const lower = String(filename).toLowerCase();
  if (lower.includes('failed')) return 'failed';
  if (lower.includes('click')) return 'clicked';
  if (lower.includes('read')) return 'read';
  if (lower.includes('deliver')) return 'delivered';
  if (lower.includes('repl')) return 'replied';
  return 'sent';
}

function inferCampaignNameFromFilename(filename = '') {
  return normalizeCampaignBaseName(path.basename(filename, path.extname(filename)));
}

module.exports = {
  SEGMENT_SUFFIX_RE,
  normalizeCampaignBaseName,
  inferStatusFromFilename,
  inferCampaignNameFromFilename,
};
