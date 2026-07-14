const crypto = require('crypto');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const Person = require('../../models/Person');
const { normalizePhone } = require('./phoneUtils');

const VALID_STATUSES = ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'];
const EMPTY_STATS = { sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0 };
let personCollectionWritable = true;
let eventCollectionWritable = true;

async function importAiSensyFiles(files, { linkedCampaignId, defaultCountryCode = '91', syncAfter = true } = {}) {
  const fileResults = [];
  let totals = emptyImportResult();

  for (const file of files || []) {
    const fileName = file.originalname || 'upload.csv';
    const source = buildSourceFromFileName(fileName);
    const text = file.buffer.toString('utf8').trim();
    const rows = parseCsv(text);
    const result = rows.length
      ? await importAiSensyRows(rows, { linkedCampaignId, defaultCountryCode, source })
      : emptyImportResult();
    const namedResult = { fileName, source, ...result };
    fileResults.push(namedResult);
    totals = addImportResults(totals, result);
  }

  const sync = syncAfter ? await syncWhatsAppEventsToPeople({ linkedCampaignId }) : null;
  return { ...totals, files: fileResults, sync };
}

async function importAiSensyRows(rows, { linkedCampaignId, defaultCountryCode = '91', source = {} } = {}) {
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
    const rawName = String(row.name || row.Name || row.NAME || row['Contact Name'] || '').trim();
    const rawStatus = String(row.status || row.Status || row.STATUS || row['Message Status'] || source.status || inferStatusFromRow(row)).toLowerCase().trim();
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'sent';
    const rawTime = pickTimestamp(row, status);
    const parsedTime = rawTime ? new Date(rawTime) : new Date();
    const timestamp = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
    const tags = buildTags({ source, status });
    const match = await findOrCreateMatchingPerson(rawPhone, normalized, {
      name: rawName,
      source,
      status,
      timestamp,
      linkedCampaignId,
      tags,
    });
    if (match.person) matched++;
    else if (normalized) unmatched++;
    else needsReview++;

    const eventKey = `${linkedCampaignId || source.key || 'global'}:${normalized || rawPhone}:${status}:${timestamp.toISOString()}`;

    const eventOnInsert = {
      phone: rawPhone,
      normalizedPhone: normalized || undefined,
      name: rawName || undefined,
      status,
      timestamp,
      linkedEmailCampaignId: linkedCampaignId || undefined,
      needsReview: !match.person,
      eventKey,
    };
    if (match.person?._id && match.persisted !== false) eventOnInsert.matchedToPersonId = match.person._id;

    let result = { upsertedCount: 0, matchedCount: 0, skippedByCollectionCap: true };
    if (eventCollectionWritable) {
      result = await WhatsAppEvent.updateOne(
        { eventKey },
        {
          $setOnInsert: eventOnInsert,
          $set: {
            importBatchId,
            rawRow: { ...row },
          },
        },
        { upsert: true },
      ).catch((err) => {
        if (isCollectionCapError(err)) {
          eventCollectionWritable = false;
          return { upsertedCount: 0, matchedCount: 0, skippedByCollectionCap: true };
        }
        throw err;
      });
    }

    if (result.skippedByCollectionCap) {
      updated++;
    } else if (result.upsertedCount) {
      inserted++;
      if (match.person?._id && match.persisted !== false) await updatePersonWhatsAppStats(match.person._id, { linkedCampaignId, status, timestamp });
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

async function findOrCreateMatchingPerson(rawPhone, normalized, { name, source, status, timestamp, linkedCampaignId, tags = [] } = {}) {
  if (!normalized) return { person: null };
  const existing = await Person.findOne({ normalizedPhone: normalized }).catch((err) => {
    if (isCollectionCapError(err)) return null;
    throw err;
  });
  if (existing) {
    await enrichPerson(existing, { name, rawPhone, tags, status, timestamp, linkedCampaignId, source });
    await upsertPersonHubView(existing, { name, rawPhone, normalized, tags, timestamp, status });
    return { person: existing };
  }
  const byRawPhone = await Person.findOne({ phone: rawPhone }).catch((err) => {
    if (isCollectionCapError(err)) return null;
    throw err;
  });
  if (byRawPhone) {
    byRawPhone.normalizedPhone = normalized;
    await enrichPerson(byRawPhone, { name, rawPhone, tags, status, timestamp, linkedCampaignId, source });
    await upsertPersonHubView(byRawPhone, { name, rawPhone, normalized, tags, timestamp, status });
    return { person: byRawPhone };
  }

  const fallbackPerson = {
    _id: `automailer-whatsapp:${normalized}`,
    phone: rawPhone,
    normalizedPhone: normalized,
    name: name || undefined,
    channel: 'whatsapp',
    tags,
    source: source?.campaignName || 'whatsapp-import',
    collectionCapFallback: true,
  };

  const person = personCollectionWritable
    ? await Person.create({
      phone: rawPhone,
      normalizedPhone: normalized,
      name: name || undefined,
      channel: 'whatsapp',
      tags,
      source: source?.campaignName || 'whatsapp-import',
      campaignHistory: [{
        campaignId: linkedCampaignId || undefined,
        campaignTitle: source?.campaignName,
        channel: 'whatsapp',
        outcome: status,
        timestamp,
      }],
    }).catch((err) => {
      if (isCollectionCapError(err)) {
        personCollectionWritable = false;
        return fallbackPerson;
      }
      throw err;
    })
    : fallbackPerson;
  await upsertPersonHubView(person, { name, rawPhone, normalized, tags, timestamp, status });
  return { person, persisted: !person.collectionCapFallback };
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
  if (row['Clicked At'] || row['Link Clicked At'] || row['Link Click Count']) return 'clicked';
  if (row['Replied At']) return 'replied';
  if (row['Read At']) return 'read';
  if (row['Delivered At']) return 'delivered';
  return 'sent';
}

function pickTimestamp(row, status) {
  const byStatus = {
    failed: row['Failed At'] || row['Failure At'] || row['Sent At'],
    clicked: row['Clicked At'] || row['Link Clicked At'],
    replied: row['Replied At'],
    read: row['Read At'],
    delivered: row['Delivered At'],
    sent: row['Sent At'],
  };
  return byStatus[status] || row.timestamp || row.Timestamp || row.TIMESTAMP || row['Created At'] || row['Sent At'];
}

function buildSourceFromFileName(fileName = '') {
  const base = String(fileName).replace(/\.csv$/i, '').trim();
  const statusMatch = base.match(/\b(SENT|DELIVERED|READ|CLICKED|REPLIED|FAILED)\s+AUDIENCE\b/i);
  const status = statusMatch ? statusMatch[1].toLowerCase() : undefined;
  const campaignName = statusMatch
    ? base.slice(0, statusMatch.index).replace(/\s+\(\d+\)$/i, '').trim()
    : base.replace(/\s+\(\d+\)$/i, '').trim();
  const key = slugify(campaignName || base || 'whatsapp-import');
  return { fileName, campaignName: campaignName || 'WhatsApp import', key, status };
}

function buildTags({ source = {}, status } = {}) {
  return [...new Set([
    'whatsapp',
    'aisensy',
    source.key ? `campaign:${source.key}` : '',
    source.campaignName ? `campaign-name:${source.campaignName}` : '',
    status ? `whatsapp:${status}` : '',
  ].filter(Boolean))];
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'whatsapp-import';
}

async function enrichPerson(person, { name, rawPhone, tags, status, timestamp, linkedCampaignId, source }) {
  const mergedTags = [...new Set([...(person.tags || []), ...tags])];
  person.name = person.name || name || undefined;
  person.phone = person.phone || rawPhone;
  person.channel = person.channel === 'email' ? 'both' : (person.channel || 'whatsapp');
  person.tags = mergedTags;
  person.source = person.source || source?.campaignName || 'whatsapp-import';
  person.campaignHistory = [
    ...(person.campaignHistory || []),
    {
      campaignId: linkedCampaignId || undefined,
      campaignTitle: source?.campaignName,
      channel: 'whatsapp',
      outcome: status,
      timestamp,
    },
  ].slice(-100);
  await person.save().catch((err) => {
    if (!isCollectionCapError(err)) throw err;
  });
}

async function upsertPersonHubView(person, { name, rawPhone, normalized, tags, timestamp, status }) {
  const mongoose = require('mongoose');
  if (!mongoose.connection?.db) return;

  const col = mongoose.connection.db.collection('personhubviews');
  const now = new Date();
  const personId = `automailer-whatsapp:${normalized}`;
  const internalEmail = buildInternalWhatsAppEmail(normalized || rawPhone);
  const query = {
    $or: [
      { personId },
      { phone: normalized },
      { phone: rawPhone },
      { email: internalEmail },
    ],
  };

  await col.updateOne(query, {
    $setOnInsert: {
      personId,
      tenantId: 'auto-mailer',
      firstSeenAt: timestamp || now,
      createdAt: now,
      emailStatus: 'Pending',
      unsubscribed: false,
      inCRM: false,
      inExly: false,
      inBookedCalls: false,
      inEnquiries: false,
      inCommunity: false,
      inNewsletter: false,
      inArtistPath: false,
      inArtistCrm: false,
    },
    $set: {
      name: person.name || name || normalized || rawPhone || 'WhatsApp Contact',
      email: internalEmail,
      phone: normalized || rawPhone,
      inMailer: true,
      lastActivityAt: timestamp || now,
      updatedAt: now,
      whatsappStatus: status,
      autoMailerPersonId: person._id,
    },
    $addToSet: {
      inletKeys: { $each: tags },
    },
  }, { upsert: true });

  await col.updateMany(query, [
    {
      $set: {
        inletCount: { $size: { $ifNull: ['$inletKeys', []] } },
        isMultiInlet: { $gt: [{ $size: { $ifNull: ['$inletKeys', []] } }, 1] },
      },
    },
  ]);
}

function isCollectionCapError(err) {
  return /cannot create a new collection|using 500 collections/i.test(String(err?.message || err || ''));
}

function buildInternalWhatsAppEmail(phone) {
  const digits = String(phone || '').replace(/\D/g, '') || crypto.randomUUID().replace(/-/g, '');
  return `whatsapp-${digits}@auto-mailer.local`;
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
