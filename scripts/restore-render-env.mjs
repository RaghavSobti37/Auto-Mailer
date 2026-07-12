#!/usr/bin/env node
/**
 * Restore Auto-Mailer Render env vars (full PUT).
 * ponytail: Render PUT replaces ALL vars — never partial PUT.
 *
 * Usage (from repo root):
 *   node scripts/restore-render-env.mjs [--dry-run]
 *
 * Requires RENDER_API_KEY in env or coreknot/.cursor/render-api.local.env
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVICE_ID = 'srv-d7istknaqgkc73a4rv70';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadRenderApiKey() {
  if (process.env.RENDER_API_KEY) return process.env.RENDER_API_KEY.trim();
  const candidates = [
    path.resolve(repoRoot, '..', 'coreknot', '.cursor', 'render-api.local.env'),
    path.resolve(repoRoot, '..', 'coreknot', 'Taskmaster', 'server', '.env'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^RENDER_API_KEY=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  throw new Error('RENDER_API_KEY not found');
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function loadBackupSecrets() {
  const backupPath = path.join(repoRoot, '.env.render-backup.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Missing ${backupPath} — create from Render dashboard export`);
  }
  return JSON.parse(fs.readFileSync(backupPath, 'utf8'));
}

function buildEnvPayload() {
  const nestEnv = parseDotEnv(path.resolve(repoRoot, '..', 'coreknot', 'nestjs-server', '.env'));
  const backup = loadBackupSecrets();

  const mongoUri =
    backup.MONGODB_URI ||
    nestEnv.MONGODB_URI_PROD ||
    nestEnv.MONGODB_URI;

  if (!mongoUri) throw new Error('MONGODB_URI missing from backup and nestjs-server/.env');

  const primaryMongo = backup.MONGODB_URI || nestEnv.MONGODB_URI_PROD || nestEnv.MONGODB_URI;
  const onlineBackupMongo = backup.ONLINE_BACKUP_MONGODB_URI
    || (primaryMongo ? primaryMongo.replace(/(\/[^/?]+)(\?|$)/, '/auto-mailer-backup$2') : '');

  const corsOrigin =
    'https://auto-mailer-raghavsobti37s-projects.vercel.app,' +
    'https://auto-mailer-git-main-raghavsobti37s-projects.vercel.app,' +
    'https://auto-mailer.vercel.app,' +
    'https://auto-mailer-blue.vercel.app';

  const apiBase = 'https://auto-mailer-5e54.onrender.com';

  const entries = {
    NODE_VERSION: '20.18.1',
    MONGODB_URI: primaryMongo,
    ONLINE_BACKUP_MONGODB_URI: onlineBackupMongo,
    FRONTEND_URL: 'https://auto-mailer-blue.vercel.app',
    TRACKING_BASE_URL: apiBase,
    APP_BASE_URL: apiBase,
    CORS_ORIGIN: corsOrigin,
    BACKUP_SCHEDULE_HOUR: '2',
    SYSTEM_VERIFIED_FROM_EMAIL: backup.SYSTEM_VERIFIED_FROM_EMAIL || 'helloworld@theshakticollective.in',
    SMTP_USER: backup.SMTP_USER || 'helloworld@theshakticollective.in',
    SMTP_PASS: backup.SMTP_PASS || '',
    RESEND_API_KEY: backup.RESEND_API_KEY || '',
    RESEND_WEBHOOK_SECRET: backup.RESEND_WEBHOOK_SECRET || nestEnv.RESEND_WEBHOOK_SECRET || '',
    HOLYSHEET_API_KEY: backup.HOLYSHEET_API_KEY || '',
    API_KEY: backup.API_KEY || 'auto-mailer-secret-key-2024',
  };

  for (const [key, value] of Object.entries(entries)) {
    if (value === '' && /^(RESEND_API_KEY|SMTP_PASS|MONGODB_URI)$/.test(key)) {
      throw new Error(`Required Render env ${key} is empty`);
    }
  }

  return Object.entries(entries).map(([key, value]) => ({ key, value }));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const payload = buildEnvPayload();
  console.log(`Prepared ${payload.length} env vars: ${payload.map((e) => e.key).join(', ')}`);

  if (dryRun) {
    console.log('dry-run OK');
    return;
  }

  const apiKey = loadRenderApiKey();
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('Render env restore failed:', res.status, text);
    process.exit(1);
  }

  const restored = JSON.parse(text);
  console.log(`Restored ${restored.length} env vars`);

  const deployRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clearCache: 'do_not_clear' }),
  });
  const deployText = await deployRes.text();
  if (!deployRes.ok) {
    console.error('Deploy trigger failed:', deployRes.status, deployText);
    process.exit(1);
  }
  console.log('Deploy triggered:', JSON.parse(deployText).id);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
