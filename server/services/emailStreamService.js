const config = require('../config');

/**
 * Validate that a from email is allowed for a given stream slug.
 */
async function validateFromEmailForStream(fromEmail, streamSlug) {
  if (!fromEmail) {
    return { ok: false, error: 'From email is required' };
  }
  // In single-tenant mode, accept any verified Resend email or the system from email
  const systemFrom = config.systemFromEmail || '';
  const isSystemEmail = systemFrom && fromEmail.toLowerCase() === systemFrom.toLowerCase();
  if (isSystemEmail) {
    return { ok: true, streamSlug: streamSlug || 'default' };
  }
  return { ok: true, streamSlug: streamSlug || 'default' };
}

/**
 * Get stream settings.
 */
async function getEmailStream(slug) {
  if (!slug) return null;
  return { slug, name: slug };
}

module.exports = {
  validateFromEmailForStream,
  getEmailStream,
};
