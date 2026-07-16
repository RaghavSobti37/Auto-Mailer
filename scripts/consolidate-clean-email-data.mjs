#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

const BAD_RECIPIENT_STATUSES = new Set(['bounced', 'failed', 'invalid']);
const BAD_EVENT_TYPES = new Set(['bounce', 'bounced', 'complaint', 'failed', 'failure', 'rejected']);
const apply = process.argv.includes('--apply');

loadEnv();
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');

const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000 }).asPromise();
const live = connection.useDb('taskmaster_production').db;
const oldBackup = connection.useDb('backup_2026-05-28').db;
const archive = connection.useDb('coreknot_backups').db;

try {
  const [liveCampaigns, oldCampaigns, archivedCampaigns, oldEvents, archivedEvents, oldLogs, archivedLogs] = await Promise.all([
    live.collection('campaigns').find({}).toArray(),
    oldBackup.collection('campaigns').find({}).toArray(),
    readArchivedCollection(archive, 'campaigns'),
    oldBackup.collection('mailevents').find({}).toArray(),
    readArchivedCollection(archive, 'mailevents'),
    oldBackup.collection('emaillogs').find({}).toArray(),
    readArchivedCollection(archive, 'emaillogs'),
  ]);

  const [liveEvents, liveLogs, badHubRows] = await Promise.all([
    live.collection('mailevents').find({}).toArray(),
    live.collection('emaillogs').find({}).toArray(),
    live.collection('personhubviews').find({
      $or: [
        { emailStatus: /^bounced$/i },
        { inletKeys: { $in: ['failed', 'bounced'] } },
      ],
    }).project({ email: 1, phone: 1, normalizedPhone: 1 }).toArray(),
  ]);

  const campaigns = newestById([...archivedCampaigns, ...oldCampaigns, ...liveCampaigns]);
  const rawEvents = [...archivedEvents, ...oldEvents, ...liveEvents];
  const rawLogs = [...archivedLogs, ...oldLogs, ...liveLogs];
  const excludedEmails = collectExcludedEmails(campaigns, rawEvents, rawLogs, badHubRows);
  const excludedPhones = new Set(badHubRows.flatMap((row) => [row.normalizedPhone, row.phone]).map(normalizePhone).filter(Boolean));

  const cleanedCampaigns = campaigns
    .map((campaign) => cleanCampaign(campaign, excludedEmails))
    .filter((campaign) => (campaign.recipients?.length || 0) > 0 || ['Draft', 'Queued'].includes(campaign.status));
  const cleanedEvents = uniqueByIdentity(rawEvents.filter((event) => {
    const email = normalizeEmail(event.email);
    return email && !excludedEmails.has(email) && !BAD_EVENT_TYPES.has(String(event.eventType || '').toLowerCase());
  }), eventIdentity).map(normalizeMailEvent);
  const cleanedLogs = uniqueByIdentity(rawLogs.filter((log) => {
    const email = normalizeEmail(log.leadEmail);
    return email && !excludedEmails.has(email) && !log.bounced;
  }), logIdentity).map(normalizeEmailLog);

  const before = await databaseCounts(live);
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    sources: {
      live: { campaigns: liveCampaigns.length, events: liveEvents.length, logs: liveLogs.length },
      databaseBackup: { campaigns: oldCampaigns.length, events: oldEvents.length, logs: oldLogs.length },
      compressedArchive: { campaigns: archivedCampaigns.length, events: archivedEvents.length, logs: archivedLogs.length },
    },
    consolidated: {
      campaigns: cleanedCampaigns.length,
      events: cleanedEvents.length,
      logs: cleanedLogs.length,
      excludedEmails: excludedEmails.size,
      excludedPhones: excludedPhones.size,
      cleanRecipients: cleanedCampaigns.reduce((sum, campaign) => sum + (campaign.recipients?.length || 0), 0),
    },
    before,
  };

  if (apply) {
    await applyCleanData({ live, cleanedCampaigns, cleanedEvents, cleanedLogs, excludedEmails, excludedPhones });
    report.after = await databaseCounts(live);
    report.verification = await verifyCleanState(live);
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await connection.close();
}

async function readArchivedCollection(db, collectionName) {
  const file = await db.collection('backup_archives.files').findOne(
    { 'metadata.collectionName': collectionName },
    { sort: { uploadDate: -1 } },
  );
  if (!file) return [];
  const bucket = new GridFSBucket(db, { bucketName: 'backup_archives' });
  const chunks = [];
  await new Promise((resolve, reject) => {
    bucket.openDownloadStream(file._id)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
  const text = zlib.gunzipSync(Buffer.concat(chunks)).toString('utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function newestById(documents) {
  const map = new Map();
  for (const doc of documents) {
    const key = String(doc._id || doc.campaignId || '');
    if (!key) continue;
    const current = map.get(key);
    const time = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
    const currentTime = current ? new Date(current.updatedAt || current.createdAt || 0).getTime() : -1;
    if (!current || time >= currentTime) map.set(key, doc);
  }
  return [...map.values()];
}

function uniqueByIdentity(documents, identity) {
  const map = new Map();
  for (const doc of documents) {
    const key = identity(doc);
    if (!key) continue;
    const current = map.get(key);
    const time = new Date(doc.updatedAt || doc.timestamp || doc.createdAt || 0).getTime();
    const currentTime = current ? new Date(current.updatedAt || current.timestamp || current.createdAt || 0).getTime() : -1;
    if (!current || time >= currentTime) map.set(key, doc);
  }
  return [...map.values()];
}

function eventIdentity(event) {
  return event.dedupeKey || event.messageId || String(event._id || '') || [event.eventType, normalizeEmail(event.email), event.timestamp].join(':');
}

function logIdentity(log) {
  return log.pixelId || log.clickId || String(log._id || '') || [log.campaignId, normalizeEmail(log.leadEmail)].join(':');
}

function collectExcludedEmails(campaigns, events, logs, hubRows) {
  const emails = new Set();
  for (const campaign of campaigns) {
    for (const recipient of campaign.recipients || []) {
      if (BAD_RECIPIENT_STATUSES.has(String(recipient.status || '').toLowerCase())) addEmail(emails, recipient.email);
    }
  }
  for (const event of events) {
    if (BAD_EVENT_TYPES.has(String(event.eventType || '').toLowerCase())) addEmail(emails, event.email);
  }
  for (const log of logs) if (log.bounced) addEmail(emails, log.leadEmail);
  for (const row of hubRows) addEmail(emails, row.email);
  return emails;
}

function cleanCampaign(campaign, excludedEmails) {
  const recipients = uniqueByIdentity(
    (campaign.recipients || []).filter((recipient) => {
      const email = normalizeEmail(recipient.email);
      const status = String(recipient.status || '').toLowerCase();
      return email && !excludedEmails.has(email) && !BAD_RECIPIENT_STATUSES.has(status);
    }).map((recipient) => ({ ...recipient, email: normalizeEmail(recipient.email) })),
    (recipient) => normalizeEmail(recipient.email),
  );
  const counts = countRecipientStatuses(recipients);
  return {
    ...campaign,
    _id: objectId(campaign._id),
    recipients,
    recipientCount: recipients.length,
    metrics: { totalSent: counts.sent, opened: counts.opened, clicked: counts.clicked, bounced: 0 },
    ...(campaign.stats ? { stats: { ...campaign.stats, total: recipients.length, sent: counts.sent, opened: counts.opened, clicked: counts.clicked, bounced: 0, invalid: 0 } } : {}),
  };
}

function countRecipientStatuses(recipients) {
  const out = { sent: 0, opened: 0, clicked: 0 };
  for (const recipient of recipients) {
    const status = String(recipient.status || '').toLowerCase();
    if (['sent', 'opened', 'clicked'].includes(status)) out.sent++;
    if (status === 'opened') out.opened++;
    if (status === 'clicked') out.clicked++;
  }
  return out;
}

function normalizeMailEvent(event) {
  return {
    ...event,
    _id: objectId(event._id),
    email: normalizeEmail(event.email),
    campaignId: objectIdOrValue(event.campaignId),
    timestamp: new Date(event.timestamp),
    createdAt: event.createdAt ? new Date(event.createdAt) : new Date(event.timestamp),
    updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date(event.timestamp),
  };
}

function normalizeEmailLog(log) {
  return {
    ...log,
    _id: objectId(log._id),
    leadEmail: normalizeEmail(log.leadEmail),
    bounced: false,
    createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
    updatedAt: log.updatedAt ? new Date(log.updatedAt) : new Date(),
  };
}

async function applyCleanData({ live, cleanedCampaigns, cleanedEvents, cleanedLogs, excludedEmails, excludedPhones }) {
  await replaceById(live.collection('campaigns'), cleanedCampaigns);
  await replaceById(live.collection('mailevents'), cleanedEvents);
  await replaceById(live.collection('emaillogs'), cleanedLogs);

  const emails = [...excludedEmails];
  const phones = [...excludedPhones];
  await live.collection('personhubviews').deleteMany({
    $or: [
      { email: { $in: emails } },
      { phone: { $in: phones } },
      { normalizedPhone: { $in: phones } },
      { emailStatus: /^bounced$/i },
      { inletKeys: { $in: ['failed', 'bounced'] } },
    ],
  });
  await live.collection('personhubviews').updateMany(
    { email: { $type: 'string' } },
    [{ $set: { email: { $toLower: { $trim: { input: '$email' } } } } }],
  );

  const people = connection.useDb('auto-mailer').db.collection('automailer_people');
  await people.deleteMany({
    $or: [
      { email: { $in: emails } },
      { phone: { $in: phones } },
      { normalizedPhone: { $in: phones } },
      { bounced: true },
      { suppressionReason: 'bounced' },
      { tags: { $in: ['failed', 'bounced'] } },
    ],
  });
}

async function replaceById(collection, documents) {
  const keepIds = documents.map((doc) => doc._id);
  if (keepIds.length) await collection.deleteMany({ _id: { $nin: keepIds } });
  else await collection.deleteMany({});
  for (let i = 0; i < documents.length; i += 500) {
    const batch = documents.slice(i, i + 500).map((document) => ({
      replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true },
    }));
    if (batch.length) await collection.bulkWrite(batch, { ordered: false });
  }
}

async function databaseCounts(db) {
  const [campaigns, events, logs, hubPeople, recipients] = await Promise.all([
    db.collection('campaigns').countDocuments(),
    db.collection('mailevents').countDocuments(),
    db.collection('emaillogs').countDocuments(),
    db.collection('personhubviews').countDocuments(),
    db.collection('campaigns').aggregate([{ $unwind: '$recipients' }, { $count: 'count' }]).toArray(),
  ]);
  return { campaigns, events, logs, hubPeople, recipients: recipients[0]?.count || 0 };
}

async function verifyCleanState(db) {
  const [badRecipients, badEvents, bouncedLogs, badHubPeople] = await Promise.all([
    db.collection('campaigns').countDocuments({ 'recipients.status': { $in: ['Bounced', 'Failed', 'Invalid'] } }),
    db.collection('mailevents').countDocuments({ eventType: { $in: ['Bounce', 'Bounced', 'Complaint', 'Failed', 'Failure', 'Rejected'] } }),
    db.collection('emaillogs').countDocuments({ bounced: true }),
    db.collection('personhubviews').countDocuments({ $or: [{ emailStatus: /^bounced$/i }, { inletKeys: { $in: ['failed', 'bounced'] } }] }),
  ]);
  return { badRecipients, badEvents, bouncedLogs, badHubPeople, pass: badRecipients + badEvents + bouncedLogs + badHubPeople === 0 };
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

function addEmail(set, value) {
  const email = normalizeEmail(value);
  if (email) set.add(email);
}

function objectId(value) {
  return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(String(value));
}

function objectIdOrValue(value) {
  if (!value) return undefined;
  return mongoose.Types.ObjectId.isValid(String(value)) ? objectId(value) : value;
}

function loadEnv() {
  const backupPath = path.resolve('.env.render-backup.json');
  if (fs.existsSync(backupPath) && !process.env.MONGODB_URI) {
    const env = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (env.MONGODB_URI) process.env.MONGODB_URI = env.MONGODB_URI;
  }
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
    }
  }
}
