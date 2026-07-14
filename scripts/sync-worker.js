#!/usr/bin/env node
/**
 * Sync Worker — Option B: Scheduled mongodump → mongorestore
 *
 * Reads from MongoDB Atlas and writes to local MongoDB.
 * Intended to run as a scheduled task (cron / Windows Task Scheduler).
 *
 * Usage:
 *   node scripts/sync-worker.js                # one sync cycle, then exit
 *   node scripts/sync-worker.js --watch        # run every 10 minutes
 *   node scripts/sync-worker.js --collections  # sync only specified collections
 *
 * Env vars (set in .env):
 *   ATLAS_MONGODB_URI    — Atlas connection string (source of truth)
 *   LOCAL_MONGODB_URI    — Local MongoDB connection string (mirror)
 *   SYNC_INTERVAL_MIN    — Minutes between syncs when --watch (default: 10)
 *   SYNC_COLLECTIONS     — Comma-separated list (default: all)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ATLAS_URI = process.env.ATLAS_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-mailer';
const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/auto-mailer-mirror';
const SYNC_INTERVAL_MIN = parseInt(process.env.SYNC_INTERVAL_MIN || '10', 10);
const SYNC_COLLECTIONS = (process.env.SYNC_COLLECTIONS || 'Campaign,MailEvent,EmailLog,EmailProfile,MailTemplate,MailCampaign,WhatsAppEvent,Person,personhubviews,personindexes,leads,contacts,exlybookings,tscdatas')
  .split(',').map(s => s.trim()).filter(Boolean);

const DUMP_DIR = path.join(__dirname, '..', '.sync-dump');
const STATE_FILE = path.join(__dirname, '..', '.sync-state.json');

function log(msg, level = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠' : '✓';
  console.log(`[${new Date().toISOString()}] ${prefix} ${msg}`);
}

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { /* ignore */ }
  return { lastSyncAt: null, rowsSynced: 0, method: 'scheduled' };
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runSyncCycle() {
  log(`Starting sync cycle (${SYNC_COLLECTIONS.length} collections)`);

  // Ensure dump directory exists and is clean
  if (fs.existsSync(DUMP_DIR)) fs.rmSync(DUMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(DUMP_DIR, { recursive: true });

  try {
    // Step 1: mongodump from Atlas
    log('Dumping from Atlas...');
    const collectionsFlag = SYNC_COLLECTIONS.map(c => `--collection=${c}`).join(' ');
    execSync(
      `mongodump "${ATLAS_URI}" ${collectionsFlag} --out="${DUMP_DIR}" --quiet`,
      { stdio: 'pipe', timeout: 300_000 }
    );
    log('Dump complete');

    // Step 2: mongorestore to local
    log('Restoring to local mirror...');
    const dbName = new URL(LOCAL_URI).pathname.replace('/', '') || 'auto-mailer-mirror';
    execSync(
      `mongorestore "${LOCAL_URI}" --dir="${DUMP_DIR}/${dbName}" --drop --quiet`,
      { stdio: 'pipe', timeout: 300_000 }
    );
    log('Restore complete');

    // Count synced rows
    let totalRows = 0;
    for (const col of SYNC_COLLECTIONS) {
      const dumpPath = path.join(DUMP_DIR, dbName, `${col}.bson`);
      if (fs.existsSync(dumpPath)) {
        const stat = fs.statSync(dumpPath);
        totalRows += 1; // approximate count from bson size
      }
    }

    // Update state
    const state = {
      lastSyncAt: new Date().toISOString(),
      rowsSynced: totalRows,
      method: 'scheduled',
      collections: SYNC_COLLECTIONS,
    };
    writeState(state);
    log(`Sync complete: ${totalRows} collections synced`);

    // Cleanup
    fs.rmSync(DUMP_DIR, { recursive: true, force: true });

    return state;
  } catch (err) {
    log(`Sync failed: ${err.message}`, 'error');
    // Write failure state
    writeState({
      lastSyncAt: readState().lastSyncAt,
      rowsSynced: readState().rowsSynced,
      method: 'scheduled',
      lastError: err.message,
      lastErrorAt: new Date().toISOString(),
    });
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');

  log(`Sync Worker (Option B) — ${watchMode ? 'WATCH mode, every ${SYNC_INTERVAL_MIN} min' : 'ONE-SHOT mode'}`);
  log(`Atlas: ${ATLAS_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  log(`Local: ${LOCAL_URI}`);

  if (watchMode) {
    while (true) {
      try {
        await runSyncCycle();
      } catch (err) {
        log(`Cycle failed, retrying in ${SYNC_INTERVAL_MIN}min: ${err.message}`, 'error');
      }
      log(`Waiting ${SYNC_INTERVAL_MIN} minutes until next sync...`);
      await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL_MIN * 60 * 1000));
    }
  } else {
    await runSyncCycle();
    process.exit(0);
  }
}

main().catch(err => {
  log(`Fatal: ${err.message}`, 'error');
  process.exit(1);
});
