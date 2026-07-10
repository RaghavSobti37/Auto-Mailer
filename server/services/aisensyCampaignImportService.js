const fs = require('fs');
const path = require('path');
const { syncCampaignOutcome } = require('./aisensyCampaignSyncService');
const { inferCampaignNameFromFilename, inferStatusFromFilename } = require('./aisensyCampaignNameUtils');
const { normalizeEmail, normalizePhone } = require('./aisensyCampaignSyncService');

const AISENSY_COLUMN_ALIASES = {
  name: ['name', 'user name', 'customer name', 'full name'],
  phone: ['mobile number', 'mobile', 'phone', 'phone number', 'whatsapp number', 'destination'],
  email: ['email', 'email id', 'e-mail'],
  sentAt: ['sent at', 'sent time', 'timestamp', 'date'],
  deliveredAt: ['delivered at', 'delivered_at'],
  readAt: ['read at', 'read_at'],
  clickedAt: ['link clicked at', 'clicked at', 'link click at'],
  failureReason: ['failure reason', 'reason', 'error', 'status reason', 'failed reason'],
  status: ['status', 'delivery status', 'message status'],
  tags: ['tags', 'tag', 'audience tags', 'segment'],
};

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => clean(cell))) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => clean(cell))) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => clean(header));
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

async function readCsvRows(filePath) {
  const text = await fs.promises.readFile(filePath, 'utf8');
  return parseCsv(text);
}

function headerMap(row) {
  const map = new Map();
  for (const [key, value] of Object.entries(row || {})) {
    map.set(String(key || '').trim().toLowerCase(), value);
  }
  return map;
}

function pickColumn(row, aliases = []) {
  const lookup = headerMap(row);
  for (const key of aliases) {
    if (lookup.has(key.toLowerCase())) return lookup.get(key.toLowerCase());
  }
  return '';
}

function parseDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRowStatus(row, defaultStatus) {
  const failureReason = clean(pickColumn(row, AISENSY_COLUMN_ALIASES.failureReason));
  const statusText = clean(pickColumn(row, AISENSY_COLUMN_ALIASES.status)).toLowerCase();
  const clickedAt = parseDate(pickColumn(row, AISENSY_COLUMN_ALIASES.clickedAt));
  const readAt = parseDate(pickColumn(row, AISENSY_COLUMN_ALIASES.readAt));
  const deliveredAt = parseDate(pickColumn(row, AISENSY_COLUMN_ALIASES.deliveredAt));
  const sentAt = parseDate(pickColumn(row, AISENSY_COLUMN_ALIASES.sentAt));

  let status = defaultStatus;
  if (clickedAt) status = 'clicked';
  else if (readAt) status = 'read';
  else if (deliveredAt) status = 'delivered';
  else if (failureReason || statusText.includes('fail')) status = 'failed';
  else if (statusText.includes('repl')) status = 'replied';
  else if (statusText.includes('click')) status = 'clicked';
  else if (statusText.includes('read')) status = 'read';
  else if (statusText.includes('deliver')) status = 'delivered';
  else if (statusText.includes('sent')) status = 'sent';

  return { status, failureReason, sentAt, deliveredAt, readAt, clickedAt };
}

function mapAisensyRow(row, { defaultStatus }) {
  const tagsRaw = clean(pickColumn(row, AISENSY_COLUMN_ALIASES.tags));
  const resolved = resolveRowStatus(row, defaultStatus);
  return {
    name: clean(pickColumn(row, AISENSY_COLUMN_ALIASES.name)) || 'Anonymous',
    phone: normalizePhone(pickColumn(row, AISENSY_COLUMN_ALIASES.phone)),
    email: normalizeEmail(pickColumn(row, AISENSY_COLUMN_ALIASES.email)),
    status: resolved.status,
    failureReason: resolved.failureReason,
    sentAt: resolved.sentAt,
    tags: tagsRaw ? tagsRaw.split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean) : [],
    metadata: {
      deliveredAt: resolved.deliveredAt || undefined,
      readAt: resolved.readAt || undefined,
      clickedAt: resolved.clickedAt || undefined,
    },
    raw: row,
  };
}

async function importAisensyCampaignCsv({
  filePath,
  campaignName,
  defaultStatus,
  sourceFilename,
  tags = [],
  dryRun = false,
}) {
  const resolvedCampaign = campaignName || inferCampaignNameFromFilename(sourceFilename || filePath);
  const resolvedStatus = defaultStatus || inferStatusFromFilename(sourceFilename || filePath);
  const rows = await readCsvRows(filePath);
  const stats = {
    campaignName: resolvedCampaign,
    defaultStatus: resolvedStatus,
    rowsRead: rows.length,
    imported: 0,
    skippedNoPhone: 0,
    errors: 0,
    dryRun,
  };

  for (const row of rows) {
    const mapped = mapAisensyRow(row, { defaultStatus: resolvedStatus });
    if (!mapped.phone) {
      stats.skippedNoPhone += 1;
      continue;
    }
    try {
      const result = await syncCampaignOutcome({
        campaignName: resolvedCampaign,
        phone: mapped.phone,
        name: mapped.name,
        email: mapped.email,
        status: mapped.status,
        failureReason: mapped.failureReason,
        sentAt: mapped.sentAt,
        tags: [...tags, ...(mapped.tags || [])],
        sourceFilename: sourceFilename || path.basename(filePath),
        metadata: mapped.metadata,
        dryRun,
      });
      if (result.ok) stats.imported += 1;
    } catch {
      stats.errors += 1;
    }
  }
  return stats;
}

module.exports = {
  AISENSY_COLUMN_ALIASES,
  parseCsv,
  inferCampaignNameFromFilename,
  inferStatusFromFilename,
  mapAisensyRow,
  importAisensyCampaignCsv,
};
