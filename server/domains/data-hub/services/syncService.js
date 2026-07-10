const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const EmailLog = require('../../../models/EmailLog');
const { normalizeEmail, isValidEmail } = require('../../../utils/emailValidation');

const syncState = {
  lastSyncedAt: null,
  lastFullSyncAt: null,
  lastStats: null,
};

async function getSyncState() {
  return syncState;
}

/**
 * Sync campaign recipient data into a unified view.
 * Reads from Campaign and MailCampaign models, deduplicates by email,
 * and ensures EmailLog entries exist for tracking purposes.
 */
async function syncAllInlets({ incremental = true, onProgress, full = false } = {}) {
  const syncStartedAt = new Date();
  const stats = { campaigns: 0, recipients: 0, emailLogs: 0, errors: 0 };

  try {
    // Gather recipients from both campaign models
    const [campaigns, mailCampaigns] = await Promise.all([
      Campaign.find({}).select('campaignId title subject recipients').lean(),
      MailCampaign.find({}).select('title subject recipients').lean(),
    ]);
    stats.campaigns = campaigns.length + mailCampaigns.length;

    const allRecipients = [];
    for (const camp of campaigns) {
      for (const r of (camp.recipients || [])) {
        allRecipients.push({ ...r, campaignId: camp.campaignId || String(camp._id), source: 'Campaign' });
      }
    }
    for (const camp of mailCampaigns) {
      for (const r of (camp.recipients || [])) {
        allRecipients.push({ ...r, campaignId: String(camp._id), source: 'MailCampaign' });
      }
    }

    stats.recipients = allRecipients.length;

    // Deduplicate and ensure EmailLog entries exist for valid emails
    const seen = new Set();
    let logCreated = 0;

    for (const r of allRecipients) {
      const email = normalizeEmail(r.email);
      if (!email || !isValidEmail(email) || seen.has(email)) continue;
      seen.add(email);

      try {
        const existing = await EmailLog.findOne({ leadEmail: email }).lean();
        if (!existing) {
          await EmailLog.create({
            campaignId: r.campaignId || 'unknown',
            leadEmail: email,
            opened: ['Opened', 'Clicked'].includes(r.status),
            clicked: r.status === 'Clicked',
            bounced: ['Bounced', 'Failed', 'Invalid'].includes(r.status),
          });
          logCreated++;
        } else if (!incremental || full) {
          // Full sync: update stale statuses
          const updates = {};
          if (r.status && !existing.opened && ['Opened', 'Clicked'].includes(r.status)) updates.opened = true;
          if (r.status === 'Clicked' && !existing.clicked) updates.clicked = true;
          if (['Bounced', 'Failed', 'Invalid'].includes(r.status) && !existing.bounced) updates.bounced = true;
          if (Object.keys(updates).length) {
            await EmailLog.updateOne({ _id: existing._id }, { $set: updates });
          }
        }
      } catch (err) {
        stats.errors++;
      }
    }

    stats.emailLogs = logCreated;
    syncState.lastSyncedAt = syncStartedAt;
    syncState.lastStats = stats;
    if (full) syncState.lastFullSyncAt = syncStartedAt;
  } catch (err) {
    stats.errors++;
  }

  return { ...stats, incremental: incremental && !full, syncedAt: syncStartedAt };
}

module.exports = { getSyncState, syncAllInlets };
