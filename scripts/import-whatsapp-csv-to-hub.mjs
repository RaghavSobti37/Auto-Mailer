#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCsv, inferStatusFromRow, pickTimestamp } = require('../server/domains/whatsapp/importService');
const { normalizePhone } = require('../server/domains/whatsapp/phoneUtils');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/import-whatsapp-csv-to-hub.mjs <csv...>');
  process.exit(1);
}

loadEnv();
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
const col = mongoose.connection.db.collection('personhubviews');

let totalRows = 0;
let upserts = 0;
let matched = 0;
const byFile = [];

for (const file of files) {
  const source = buildSourceFromFileName(path.basename(file));
  const text = fs.readFileSync(file, 'utf8').trim();
  const rows = parseCsv(text);
  const ops = [];
  let fileRows = 0;

  for (const row of rows) {
    const rawPhone = String(row.phone || row.Phone || row.PHONE || row['Phone Number'] || row.Mobile || row['Mobile Number'] || '').trim();
    const normalized = normalizePhone(rawPhone, '91');
    if (!normalized) continue;

    const rawName = String(row.name || row.Name || row.NAME || row['Contact Name'] || '').trim();
    const rawStatus = String(row.status || row.Status || row.STATUS || row['Message Status'] || source.status || inferStatusFromRow(row)).toLowerCase().trim();
    const status = ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'].includes(rawStatus) ? rawStatus : 'sent';
    const rawTime = pickTimestamp(row, status);
    const parsedTime = rawTime ? new Date(rawTime) : new Date();
    const timestamp = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
    const tags = buildTags({ source, status });
    const internalEmail = buildInternalWhatsAppEmail(normalized);
    const personId = `automailer-whatsapp:${normalized}`;
    const now = new Date();

    ops.push({
      updateOne: {
        filter: { personId },
        update: {
          $setOnInsert: {
            personId,
            tenantId: 'auto-mailer',
            firstSeenAt: timestamp,
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
            name: rawName || normalized || rawPhone || 'WhatsApp Contact',
            email: internalEmail,
            phone: normalized,
            inMailer: true,
            lastActivityAt: timestamp,
            updatedAt: now,
            whatsappStatus: status,
          },
          $addToSet: {
            inletKeys: { $each: tags },
          },
        },
        upsert: true,
      },
    });
    fileRows++;

    if (ops.length >= 500) {
      const result = await col.bulkWrite(ops, { ordered: true });
      upserts += result.upsertedCount || 0;
      matched += result.matchedCount || 0;
      ops.length = 0;
    }
  }

  if (ops.length) {
    const result = await col.bulkWrite(ops, { ordered: true });
    upserts += result.upsertedCount || 0;
    matched += result.matchedCount || 0;
  }

  totalRows += fileRows;
  byFile.push({ file: path.basename(file), rows: fileRows, source });
  console.log(`${path.basename(file)} rows=${fileRows}`);
}

await col.updateMany(
  { personId: /^automailer-whatsapp:/ },
  [{
    $set: {
      inletKeys: {
        $filter: {
          input: { $ifNull: ['$inletKeys', []] },
          as: 'tag',
          cond: {
            $and: [
              { $not: { $in: ['$$tag', ['whatsapp', 'aisensy']] } },
              { $not: { $regexMatch: { input: '$$tag', regex: /^(campaign:|campaign-name:|whatsapp:)/ } } },
            ],
          },
        },
      },
    },
  }],
);

await mongoose.disconnect();
console.log(JSON.stringify({ totalRows, upserts, matched, files: byFile.length }, null, 2));

function loadEnv() {
  const renderEnvPath = path.resolve('.env.render-backup.json');
  if (fs.existsSync(renderEnvPath) && !process.env.MONGODB_URI) {
    const parsed = JSON.parse(fs.readFileSync(renderEnvPath, 'utf8'));
    if (parsed.MONGODB_URI) process.env.MONGODB_URI = parsed.MONGODB_URI;
  }
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
    }
  }
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
  return status ? [status] : [];
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'whatsapp-import';
}

function buildInternalWhatsAppEmail(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `whatsapp-${digits}@auto-mailer.local`;
}
