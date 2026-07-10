const crypto = require('crypto');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const Person = require('../../models/Person');
const { normalizePhone } = require('./phoneUtils');

async function importAiSensyRows(rows, { linkedCampaignId, defaultCountryCode = '91' } = {}) {
  if (!rows || !rows.length) return { totalRows: 0, matched: 0, unmatched: 0, needsReview: 0, importBatchId: null };

  const importBatchId = crypto.randomUUID();
  let matched = 0, unmatched = 0, needsReview = 0;

  for (const row of rows) {
    const rawPhone = String(row.phone || row.Phone || row.PHONE || row['Phone Number'] || row['Mobile'] || '').trim();
    if (!rawPhone) continue;

    const normalized = normalizePhone(rawPhone, defaultCountryCode);
    let matchedPersonId = null;
    let reviewFlag = false;

    if (normalized) {
      const existing = await Person.findOne({ normalizedPhone: normalized });
      if (existing) {
        matchedPersonId = existing._id;
        matched++;
      } else {
        const byRawPhone = await Person.findOne({ phone: rawPhone });
        if (byRawPhone) {
          matchedPersonId = byRawPhone._id;
          byRawPhone.normalizedPhone = normalized;
          await byRawPhone.save();
          matched++;
        } else {
          unmatched++;
          reviewFlag = true;
        }
      }
    } else {
      needsReview++;
      reviewFlag = true;
    }

    const rawStatus = String(row.status || row.Status || row.STATUS || row['Message Status'] || 'sent').toLowerCase();
    const validStatuses = ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'];
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'sent';

    const rawTime = row.timestamp || row.Timestamp || row.TIMESTAMP || row['Sent At'] || row['Created At'];
    const timestamp = rawTime ? new Date(rawTime) : new Date();

    const dupCheck = await WhatsAppEvent.findOne({ phone: rawPhone, importBatchId, status });
    if (dupCheck) continue;

    await WhatsAppEvent.create({
      phone: rawPhone,
      normalizedPhone: normalized || undefined,
      name: String(row.name || row.Name || row.NAME || row['Contact Name'] || '').trim() || undefined,
      status, timestamp,
      linkedEmailCampaignId: linkedCampaignId || undefined,
      matchedToPersonId: matchedPersonId,
      needsReview: reviewFlag, importBatchId,
      rawRow: { ...row },
    });

    if (matchedPersonId) {
      const $inc = { 'whatsappStats.sent': 1 };
      $inc['whatsappStats.' + status] = 1;
      await Person.findByIdAndUpdate(matchedPersonId, {
        $inc,
        $push: { campaignHistory: { campaignId: linkedCampaignId, channel: 'whatsapp', outcome: status, timestamp } },
      });
    }
  }

  return { totalRows: rows.length, matched, unmatched, needsReview, importBatchId };
}

module.exports = { importAiSensyRows };
