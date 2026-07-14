#!/usr/bin/env node
/**
 * Copy CoreKnot/Atlas production mail + data-hub collections → local MongoDB.
 *
 * Usage:
 *   node scripts/migrate-to-local.mjs              # live copy
 *   node scripts/migrate-to-local.mjs --dry-run      # counts only
 *   node scripts/migrate-to-local.mjs --only=mail    # mail collections only
 *   node scripts/migrate-to-local.mjs --only=datahub
 *
 * Env (first match wins for source):
 *   COREKNOT_MONGODB_URI | ATLAS_MONGODB_URI | MONGODB_URI_PROD
 *   Reads .env.render-backup.json → MONGODB_URI if unset
 *
 * Target:
 *   LOCAL_MONGODB_URI | MONGODB_URI (default mongodb://localhost:27017/auto-mailer)
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT, '.sync-state.json');
dotenv.config({ path: path.join(ROOT, '.env') });

const MAIL_COLLECTIONS = [
  'campaigns',
  'mailcampaigns',
  'emaillogs',
  'emailprofiles',
  'mailtemplates',
  'mailevents',
  'whatsappevents',
];

const DATA_HUB_COLLECTIONS = [
  'personhubviews',
  'personindexes',
  'persons',
  'personidentifiers',
  'personcommunicationprofiles',
  'personsourcelinks',
  'people',
  'leads',
  'contacts',
  'crmimports',
  'crmstatsnapshots',
  'datahubsyncstates',
  'outsourcedrecords',
  'exlybookings',
  'exlyofferings',
  'bookedcalls',
  'newslettersubscribers',
  'artistpathresponses',
  'tscdatas',
];

function redact(uri = '') {
  return String(uri).replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

function swapDb(uri, dbName) {
  const q = uri.indexOf('?');
  const base = q >= 0 ? uri.slice(0, q) : uri;
  const qs = q >= 0 ? uri.slice(q) : '';
  const protoEnd = base.indexOf('://') + 3;
  const slash = base.indexOf('/', protoEnd);
  if (slash >= 0) return `${base.slice(0, slash + 1)}${dbName}${qs}`;
  return `${base}/${dbName}${qs}`;
}

function loadRenderBackupMongo() {
  const file = path.join(ROOT, '.env.render-backup.json');
  if (!fs.existsSync(file)) return '';
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.MONGODB_URI || '';
  } catch {
    return '';
  }
}

function resolveUris() {
  const backupUri = loadRenderBackupMongo();
  const prod =
    process.env.COREKNOT_MONGODB_URI
    || process.env.ATLAS_MONGODB_URI
    || process.env.MONGODB_URI_PROD
    || backupUri
    || process.env.MONGODB_URI;

  if (!prod || prod.includes('localhost') || prod.includes('127.0.0.1')) {
    throw new Error(
      'Set COREKNOT_MONGODB_URI (Atlas) as source — local .env MONGODB_URI is the target, not the source.',
    );
  }

  const sourceUri = prod.includes('taskmaster_production')
    ? prod
    : swapDb(prod, 'taskmaster_production');

  const targetUri =
    process.env.LOCAL_MONGODB_URI
    || process.env.MONGODB_URI
    || 'mongodb://localhost:27017/auto-mailer';

  if (sourceUri === targetUri) {
    throw new Error('Source and target Mongo URIs are identical — aborting.');
  }

  return { sourceUri, targetUri };
}

async function copyCollection(sourceDb, targetDb, name, dryRun) {
  const source = sourceDb.collection(name);
  const count = await source.countDocuments();
  if (!count) return { name, copied: 0, skipped: true };

  if (dryRun) return { name, copied: count, dryRun: true };

  const target = targetDb.collection(name);
  await target.deleteMany({});

  const cursor = source.find({});
  const batch = [];
  let copied = 0;

  while (await cursor.hasNext()) {
    batch.push(await cursor.next());
    if (batch.length >= 500) {
      await target.insertMany(batch, { ordered: false }).catch((err) => {
        if (err.code !== 11000) throw err;
      });
      copied += batch.length;
      batch.length = 0;
      process.stdout.write(`  ${name}: ${copied}/${count}\r`);
    }
  }
  if (batch.length) {
    await target.insertMany(batch, { ordered: false }).catch((err) => {
      if (err.code !== 11000) throw err;
    });
    copied += batch.length;
  }

  return { name, copied, total: count };
}

function parseOnlyArg() {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return 'all';
  const v = arg.split('=')[1]?.trim().toLowerCase();
  if (v === 'mail' || v === 'datahub' || v === 'all') return v;
  throw new Error('--only must be mail | datahub | all');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const only = parseOnlyArg();
  const { sourceUri, targetUri } = resolveUris();

  let collections = [...new Set([...MAIL_COLLECTIONS, ...DATA_HUB_COLLECTIONS])];
  if (only === 'mail') collections = MAIL_COLLECTIONS;
  if (only === 'datahub') collections = DATA_HUB_COLLECTIONS;

  console.log('Source:', redact(sourceUri));
  console.log('Target:', redact(targetUri));
  console.log('Scope:', only, dryRun ? '(dry-run)' : '');

  const sourceConn = await mongoose.createConnection(sourceUri, {
    serverSelectionTimeoutMS: 30_000,
  }).asPromise();
  const targetConn = await mongoose.createConnection(targetUri, {
    serverSelectionTimeoutMS: 10_000,
  }).asPromise();

  const summary = [];

  try {
    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;

    for (const name of collections) {
      const exists = (await sourceDb.listCollections({ name }).toArray()).length > 0;
      if (!exists) {
        console.log(`skip ${name} (missing on source)`);
        summary.push({ name, copied: 0, skipped: true });
        continue;
      }
      console.log(`copy ${name}…`);
      const result = await copyCollection(sourceDb, targetDb, name, dryRun);
      console.log(result.skipped ? `  skip ${name} (empty)` : `  ${name}: ${result.copied}${result.dryRun ? ' (dry-run)' : ''}`);
      summary.push(result);
    }

    if (!dryRun) {
      const verify = ['personhubviews', 'mailcampaigns', 'campaigns', 'emaillogs'];
      console.log('\nLocal counts:');
      for (const name of verify) {
        try {
          const n = await targetDb.collection(name).countDocuments();
          console.log(`  ${name}: ${n.toLocaleString()}`);
        } catch { /* collection may not exist */ }
      }
    }

    console.log(dryRun ? '\nDry run OK' : '\nMigration to local Mongo complete');
    if (!dryRun) {
      fs.writeFileSync(STATE_FILE, JSON.stringify({
        lastSyncAt: new Date().toISOString(),
        rowsSynced: summary.reduce((sum, item) => sum + (item.copied || 0), 0),
        method: 'node-copy',
        collections: summary.filter((item) => item.copied > 0).map((item) => item.name),
      }, null, 2));
    }
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }

  return summary;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
