const assert = require('assert');
const {
  parseCsv,
  mapAisensyRow,
  inferCampaignNameFromFilename,
  inferStatusFromFilename,
} = require('../server/services/aisensyCampaignImportService');
const {
  normalizePhone,
  pickHigherStatus,
} = require('../server/services/aisensyCampaignSyncService');

const rows = parseCsv('Name,Mobile Number,Status,Read At\nRiya,+91 98765 43210,Delivered,2026-07-10T10:00:00Z\n');
assert.strictEqual(rows.length, 1);
assert.strictEqual(normalizePhone(rows[0]['Mobile Number']), '9876543210');

const mapped = mapAisensyRow(rows[0], { defaultStatus: 'sent' });
assert.strictEqual(mapped.status, 'read');
assert.strictEqual(mapped.phone, '9876543210');

assert.strictEqual(inferCampaignNameFromFilename('Launch Read Audience.csv'), 'Launch');
assert.strictEqual(inferStatusFromFilename('Launch Failed Audience.csv'), 'failed');
assert.strictEqual(pickHigherStatus('delivered', 'read'), 'read');
assert.strictEqual(pickHigherStatus('clicked', 'delivered'), 'clicked');

console.log('aisensy-self-check passed');
