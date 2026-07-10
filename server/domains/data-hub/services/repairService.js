const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const EmailLog = require('../../../models/EmailLog');

/**
 * Repair duplicate inlet entries — in auto-mailer, this means
 * deduplicating EmailLog entries and fixing malformed recipient data.
 */
async function repairDuplicateInlets({ onProgress } = {}) {
  let fixed = 0;

  // Find duplicate EmailLog entries by email
  const dupes = await EmailLog.aggregate([
    { $group: { _id: '$leadEmail', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const dupe of dupes) {
    // Keep the most recent entry, remove older ones
    const [keep, ...remove] = dupe.ids;
    await EmailLog.deleteMany({ _id: { $in: remove } });
    fixed += remove.length;
    if (onProgress && fixed % 50 === 0) onProgress(`removed ${fixed} duplicate email log entries`);
  }

  if (onProgress) onProgress(`repaired ${fixed} duplicate entries`);
  return fixed;
}

/**
 * Rebuild person hub from index — in auto-mailer, this means
 * rebuilding the EmailLog index from campaign recipient data.
 */
async function rebuildPersonHubFromIndex({ mode, filter } = {}) {
  let processed = 0;

  const pipeline = [
    { $unwind: '$recipients' },
    { $match: { 'recipients.email': { $exists: true, $ne: '' } } },
    ...(filter ? [{ $match: { 'recipients.email': { $regex: '@' } } }] : []),
    { $group: { _id: { $toLower: { $trim: { input: '$recipients.email' } } } } },
  ];

  const [campEmails, mailCampEmails] = await Promise.all([
    Campaign.aggregate(pipeline),
    MailCampaign.aggregate(pipeline),
  ]);

  const allEmails = new Set();
  for (const row of [...campEmails, ...mailCampEmails]) {
    if (row._id) allEmails.add(row._id);
  }

  // Ensure EmailLog entries exist for all campaign recipients
  for (const email of allEmails) {
    const existing = await EmailLog.findOne({ leadEmail: email }).lean();
    if (!existing) {
      await EmailLog.create({
        campaignId: 'hub_rebuild',
        leadEmail: email,
        opened: false,
        clicked: false,
        bounced: false,
      });
      processed++;
    }
  }

  return { processed };
}

module.exports = { repairDuplicateInlets, rebuildPersonHubFromIndex };
