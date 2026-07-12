#!/usr/bin/env node
/**
 * One-time migration: CoreKnot taskmaster_production → auto-mailer dedicated DB.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MAIL_COLLECTIONS = [
  'campaigns',
  'mailcampaigns',
  'emaillogs',
  'emailprofiles',
  'mailtemplates',
  'mailevents',
  'whatsappevents',
];

function swapDb(uri, dbName) {
  const q = uri.indexOf('?');
  const base = q >= 0 ? uri.slice(0, q) : uri;
  const qs = q >= 0 ? uri.slice(q) : '';
  const protoEnd = base.indexOf('://') + 3;
  const slash = base.indexOf('/', protoEnd);
  if (slash >= 0) return `${base.slice(0, slash + 1)}${dbName}${qs}`;
  return `${base}/${dbName}${qs}`;
}

function resolveUris() {
  const prod = process.env.COREKNOT_MONGODB_URI
    || process.env.MONGODB_URI_PROD
    || process.env.MONGODB_URI;
  if (!prod) throw new Error('Set COREKNOT_MONGODB_URI or MONGODB_URI');
  const sourceUri = prod.includes('taskmaster_production') ? prod : swapDb(prod, 'taskmaster_production');
  // ponytail: Atlas M0 caps 500 collections/cluster — stay on shared DB, isolate by collection name
  const targetUri = process.env.AUTO_MAILER_MONGODB_URI || sourceUri;
  return { sourceUri, targetUri };
}

function mapHubToPerson(hub) {
  const email = hub.email ? String(hub.email).toLowerCase().trim() : '';
  const phone = hub.phone ? String(hub.phone).trim() : '';
  if (!email && !phone) return null;
  const suppressed = Boolean(hub.unsubscribed)
    || hub.emailStatus === 'Unsubscribed'
    || hub.emailStatus === 'Bounced';
  let suppressionReason;
  if (hub.emailStatus === 'Bounced') suppressionReason = 'bounced';
  else if (hub.unsubscribed || hub.emailStatus === 'Unsubscribed') suppressionReason = 'unsubscribed';
  const normalizedPhone = phone.replace(/\D/g, '') || undefined;
  return {
    email: email || undefined,
    phone: phone || undefined,
    normalizedPhone,
    name: hub.name || email.split('@')[0] || phone,
    suppressed,
    suppressionReason,
    bounced: hub.emailStatus === 'Bounced',
    sourceHubId: hub.personId || hub._id,
    migratedAt: new Date(),
  };
}

async function copyCollection(sourceDb, targetDb, name, dryRun) {
  const source = sourceDb.collection(name);
  const count = await source.countDocuments();
  if (!count) return { name, copied: 0, skipped: true };
  if (dryRun) return { name, copied: count, dryRun: true };

  const cursor = source.find({});
  const batch = [];
  let copied = 0;
  const target = targetDb.collection(name);

  while (await cursor.hasNext()) {
    batch.push(await cursor.next());
    if (batch.length >= 500) {
      await target.insertMany(batch, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err;
      });
      copied += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length) {
    await target.insertMany(batch, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
    copied += batch.length;
  }
  return { name, copied };
}

async function migratePeople(sourceDb, targetDb, dryRun) {
  const hubCol = sourceDb.collection('personhubviews');
  const count = await hubCol.countDocuments();
  console.log(`PersonHubView rows: ${count}`);

  const target = targetDb.collection('automailer_people');
  if (!dryRun) await target.deleteMany({});

  let copied = 0;
  let skipped = 0;
  const cursor = hubCol.find({});
  const batch = [];

  while (await cursor.hasNext()) {
    const hub = await cursor.next();
    const doc = mapHubToPerson(hub);
    if (!doc) {
      skipped += 1;
      continue;
    }
    batch.push(doc);
    if (batch.length >= 500) {
      if (!dryRun) {
        await target.insertMany(batch, { ordered: false }).catch((err) => {
          if (err.code !== 11000) throw err;
        });
      }
      copied += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length) {
    if (!dryRun) {
      await target.insertMany(batch, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err;
      });
    }
    copied += batch.length;
  }
  return { copied, skipped, dryRun };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { sourceUri, targetUri } = resolveUris();
  console.log('Source:', sourceUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  console.log('Target:', targetUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  if (dryRun) console.log('DRY RUN');

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const targetConn = await mongoose.createConnection(targetUri).asPromise();

  try {
    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;

    const people = await migratePeople(sourceDb, targetDb, dryRun);
    console.log('automailer_people:', people);

    for (const name of MAIL_COLLECTIONS) {
      if (sourceUri === targetUri) {
        console.log(`skip ${name} copy (same DB — mail collections already present)`);
        continue;
      }
      const exists = (await sourceDb.listCollections({ name }).toArray()).length > 0;
      if (!exists) {
        console.log(`skip ${name} (missing on source)`);
        continue;
      }
      if (!dryRun) await targetDb.collection(name).deleteMany({});
      const result = await copyCollection(sourceDb, targetDb, name, dryRun);
      console.log(result);
    }

    console.log(dryRun ? 'Dry run OK' : 'Migration complete');
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
