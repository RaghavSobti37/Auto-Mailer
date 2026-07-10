const EmailLog = require('../models/EmailLog');

async function processStreamUnsubscribe(email, streamSlug) {
  if (!email || !streamSlug) return false;
  try {
    await EmailLog.updateMany(
      { leadEmail: email.toLowerCase().trim() },
      { $set: { bounced: true } },
    );
    return true;
  } catch (err) {
    console.error('[EmailStreamUnsubscribe] Error:', err.message);
    return false;
  }
}

async function isEmailUnsubscribedFromStream(email, streamSlug) {
  if (!email) return false;
  try {
    const log = await EmailLog.findOne({
      leadEmail: email.toLowerCase().trim(),
      bounced: true,
    });
    return !!log;
  } catch {
    return false;
  }
}

module.exports = {
  processStreamUnsubscribe,
  isEmailUnsubscribedFromStream,
};
