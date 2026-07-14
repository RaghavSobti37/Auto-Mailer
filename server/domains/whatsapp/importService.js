const crypto = require('crypto');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const Person = require('../../models/Person');
const { normalizePhone } = require('./phoneUtils');

const VALID_STATUSES = ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'];
const EMPTY_STATS = { sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0 };

async function importAiSensyFiles(files, { linkedCampaignId, defaultCountryCode = '91', syncAfter = true } = {}) {
  const fileResults = [];
  let totals = emptyImportResult();

  for (const file of files || []) {
    const text = file.buffer.toString('utf8').trim();
    const rows = parseCsv(text);
    const result = rows.length
      ? await importAiSensyRows(rows, { linkedCampaignId, defaultCountryCode })
      : emptyImportResult();
    const namedResult = { fileName: file.originalname || 'upload.csv', ...result };
    fileResults.push(namedResult);
    totals = addImportResults(totals, result);
  }

  const sync = syncAfter ? await syncWhatsAppEventsToPeople({ linkedCampaignId }) : null;
  return { ...totals, files: fileResults, sync };
}

async function importAiSensyRows(rows, { linkedCampaignId, defaultCountryCode = '91' } = {}) {
  if (!rows || !rows.length) {
    return emptyImportResult();
  }

  const importBatchId = crypto.randomUUID();
  let matched = 0;
  let unmatched = 0;
  let needsReview = 0;
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const rawPhone = String(row.phone || row.Phone || row.PHONE || row['Phone Number'] || row.Mobile || row['Mobile Number'] || '').trim();
    if (!rawPhone) continue;

    const normalized = normalizePhone(rawPhone, defaultCountryCode);
    const match = await findMatchingPerson(rawPhone, normalized);
    if (match.person) matched++;
    else if (normalized) unmatched++;
    else needsReview++;

    const rawStatus = String(row.status || row.Status || row.STATUS || row['Message Status'] || inferStatusFromRow(row)).toLowerCase().trim();
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'sent';
    const rawTime = pickTimestamp(row, status);
    const parsedTime = rawTime ? new Date(rawTime) : new Date();
    const timestamp = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
    const eventKey = `${linkedCampaignId || 'global'}:${normalized || rawPhone}:${status}:${timestamp.toISOString()}`;

    const result = await WhatsAppEvent.updateOne(
      { eventKey },
      {
        $setOnInsert: {
          phone: rawPhone,
          normalizedPhone: normalized || undefined,
          name: String(row.name || row.Name || row.NAME || row['Contact Name'] || '').trim() || undefined,
          status,
          timestamp,
          linkedEmailCampaignId: linkedCampaignId || undefined,
          matchedToPersonId: match.person?._id,
          needsReview: !match.person,
          eventKey,
        },
        $set: {
          importBatchId,
          rawRow: { ...row },
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount) {
      inserted++;
      if (match.person?._id) await updatePersonWhatsAppStats(match.person._id, { linkedCampaignId, status, timestamp });
    } else {
      updated++;
    }
  }

  return { totalRows: rows.length, matched, unmatched, needsReview, importBatchId, inserted, updated };
}

async function syncWhatsAppEventsToPeople({ linkedCampaignId } = {}) {
  const match = { normalizedPhone: { $type: 'string', $ne: '' } };

  const groups = await WhatsAppEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$normalizedPhone',
        statuses: { $push: '$status' },
        eventIds: { $push: '$_id' },
        latest: { $max: '$timestamp' },
        name: { $first: '$name' },
        phone: { $first: '$phone' },
      },
    },
  ]);

  let matchedPeople = 0;
  let matchedEvents = 0;

  for (const group of groups) {
    const person = await Person.findOne({ normalizedPhone: group._id });
    if (!person) continue;
    matchedPeople++;
    matchedEvents += group.eventIds.length;

    const whatsappStats = { ...EMPTY_STATS };
    for (const status of group.statuses) {
      if (Object.prototype.hasOwnProperty.call(whatsappStats, status)) whatsappStats[status]++;
    }

    await Person.updateOne(
      { _id: person._id },
      {
        $set: {
          whatsappStats,
          channel: person.channel === 'email' ? 'both' : (person.channel || 'whatsapp'),
        },
        $push: {
          campaignHistory: {
            $each: [{
              campaignId: linkedCampaignId || undefined,
              channel: 'whatsapp',
              outcome: 'synced',
              timestamp: group.latest || new Date(),
            }],
            $slice: -100,
          },
        },
      },
    );

    await WhatsAppEvent.updateMany(
      { _id: { $in: group.eventIds } },
      { $set: { matchedToPersonId: person._id, needsReview: false } },
    );
  }

  const needsReview = await WhatsAppEvent.countDocuments({ needsReview: true });
  return { matchedPeople, matchedEvents, needsReview, syncedAt: new Date().toISOString() };
}

function emptyImportResult() {
  return { totalRows: 0, matched: 0, unmatched: 0, needsReview: 0, importBatchId: null, inserted: 0, updated: 0 };
}

function addImportResults(a, b) {
  return {
    totalRows: a.totalRows + b.totalRows,
    matched: a.matched + b.matched,
    unmatched: a.unmatched + b.unmatched,
    needsReview: a.needsReview + b.needsReview,
    importBatchId: b.importBatchId || a.importBatchId,
    inserted: a.inserted + b.inserted,
    updated: a.updated + b.updated,
  };
}

async function findMatchingPerson(rawPhone, normalized) {
  if (!normalized) return { person: null };
  const existing = await Person.findOne({ normalizedPhone: normalized });
  if (existing) return { person: existing };
  const byRawPhone = await Person.findOne({ phone: rawPhone });
  if (!byRawPhone) return { person: null };
  byRawPhone.normalizedPhone = normalized;
  await byRawPhone.save();
  return { person: byRawPhone };
}

async function updatePersonWhatsAppStats(personId, { linkedCampaignId, status, timestamp }) {
  const $inc = { [`whatsappStats.${status}`]: 1 };
  if (status !== 'sent') $inc['whatsappStats.sent'] = 0;
  await Person.findByIdAndUpdate(personId, {
    $inc,
    $push: { campaignHistory: { campaignId: linkedCampaignId, channel: 'whatsapp', outcome: status, timestamp } },
  });
}

function inferStatusFromRow(row) {
  if (row['Failure Reason']) return 'failed';
  if (row['Clicked At']) return 'clicked';
  if (row['Replied At']) return 'replied';
  if (row['Read At']) return 'read';
  if (row['Delivered At']) return 'delivered';
  return 'sent';
}

function pickTimestamp(row, status) {
  const byStatus = {
    failed: row['Failed At'] || row['Failure At'] || row['Sent At'],
    clicked: row['Clicked At'],
    replied: row['Replied At'],
    read: row['Read At'],
    delivered: row['Delivered At'],
    sent: row['Sent At'],
  };
  return byStatus[status] || row.timestamp || row.Timestamp || row.TIMESTAMP || row['Created At'] || row['Sent At'];
}

function parseCsv(text) {
  const rawRows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rawRows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rawRows.push(row);
  if (!rawRows.length) return [];

  const headers = rawRows[0].map((h) => h.trim());
  return rawRows.slice(1).map((values) => {
    const out = {};
    headers.forEach((h, i) => {
      out[h] = String(values[i] || '').trim();
    });
    return out;
  });
}

module.exports = {
  importAiSensyFiles,
  importAiSensyRows,
  syncWhatsAppEventsToPeople,
  inferStatusFromRow,
  pickTimestamp,
  parseCsv,
  addImportResults,
};
