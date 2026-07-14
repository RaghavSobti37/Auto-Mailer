#!/usr/bin/env node
/**
 * Boot local Mongo (Docker) and migrate Atlas mail + data-hub → LOCAL_MONGODB_URI.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const LOCAL_URI =
  process.env.LOCAL_MONGODB_URI
  || process.env.MONGODB_URI
  || 'mongodb://localhost:27017/auto-mailer';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}`);
  }
}

async function waitForMongo(uri, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 2000,
      }).asPromise();
      await conn.close();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

async function main() {
  console.log('Local Mongo URI:', LOCAL_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

  const up = await waitForMongo(LOCAL_URI, 3);
  if (!up) {
    console.log('Starting Docker Mongo + Redis…');
    if (!fs.existsSync(path.join(ROOT, 'docker-compose.yml'))) {
      throw new Error('docker-compose.yml missing');
    }
    run('docker', ['compose', 'up', '-d', 'mongodb']);
    const ready = await waitForMongo(LOCAL_URI, 30);
    if (!ready) throw new Error('Local Mongo did not become ready on :27017');
  } else {
    console.log('Local Mongo already reachable');
  }

  const migrateArgs = ['scripts/migrate-to-local.mjs'];
  if (process.argv.includes('--dry-run')) migrateArgs.push('--dry-run');
  const only = process.argv.find((a) => a.startsWith('--only='));
  if (only) migrateArgs.push(only);

  run('node', migrateArgs);

  console.log('\nDone. Set in .env:');
  console.log('  MONGODB_URI=' + LOCAL_URI);
  console.log('  LOCAL_MONGODB_URI=' + LOCAL_URI);
  console.log('  ATLAS_MONGODB_URI=<your Atlas taskmaster_production URI>  # for sync-worker / re-pull');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
