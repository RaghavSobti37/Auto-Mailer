const mongoose = require('mongoose');
const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const EmailLog = require('../../../models/EmailLog');
const { normalizeEmail } = require('../../../utils/emailValidation');

const MAX_BULK_DELETE = 100;

/**
 * Remove people from the data hub by their email or recipient ID.
 * Deletes from EmailLog and removes from Campaign/MailCampaign recipient arrays.
 */
async function deletePeopleByIds(rawIds = []) {
  if (!Array.isArray(rawIds) || !rawIds.length) {
    return { deleted: 0, requested: rawIds?.length || 0 };
  }

  const ids = rawIds.slice(0, MAX_BULK_DELETE);
  let deleted = 0;

  for (const id of ids) {
    const strId = String(id).trim();
    if (!strId) continue;

    const email = normalizeEmail(strId);
    let handled = false;

    // Delete from EmailLog by email
    if (email && email.includes('@')) {
      const result = await EmailLog.deleteMany({ leadEmail: email });
      deleted += result.deletedCount || 0;

      // Remove from Campaign recipients
      await Campaign.updateMany(
        {},
        { $pull: { recipients: { email } } }
      );
      await MailCampaign.updateMany(
        {},
        { $pull: { recipients: { email } } }
      );
      handled = true;
    }

    // Try by ObjectId (recipient subdocument ID) — only if not already handled as email
    if (!handled && mongoose.Types.ObjectId.isValid(strId)) {
      const oid = new mongoose.Types.ObjectId(strId);
      const [campResult, mailResult] = await Promise.all([
        Campaign.updateOne(
          { 'recipients._id': oid },
          { $set: { 'recipients.$.status': 'Cancelled' } }
        ),
        MailCampaign.updateOne(
          { 'recipients._id': oid },
          { $set: { 'recipients.$.status': 'Cancelled' } }
        ),
      ]);
      if ((campResult.modifiedCount || 0) + (mailResult.modifiedCount || 0) > 0) {
        deleted++;
      }
    }
  }

  return { deleted, requested: ids.length };
}

module.exports = { deletePeopleByIds };
