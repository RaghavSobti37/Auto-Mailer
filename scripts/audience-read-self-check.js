#!/usr/bin/env node
/** Self-check for audienceReadService pure helpers */
const {
  mapHubRow,
  buildAudienceFilter,
  buildSort,
} = require('../server/services/audienceReadService');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  }
}

const row = mapHubRow({
  _id: '1',
  email: 'Test@Example.com',
  name: 'Ada',
  phone: '+1 555',
  inletKeys: ['newsletter', 'exly'],
  emailStatus: 'Subscribed',
  unsubscribed: false,
  lastActivityAt: new Date('2025-01-01'),
});

assert(row.email === 'test@example.com', 'email normalized');
assert(row.tags.length === 2 && row.tags[0] === 'newsletter', 'tags from inletKeys');
assert(row.suppressed === false, 'not suppressed');

const bounced = mapHubRow({ email: 'b@x.com', emailStatus: 'Bounced' });
assert(bounced.suppressed === true && bounced.suppressionReason === 'bounced', 'bounce suppression');

const f = buildAudienceFilter({ tag: 'vip', suppressed: 'true' });
assert(f.$and && f.$and.some((c) => c.inletKeys === 'vip'), 'tag filter');
assert(f.$and.some((c) => c.$or), 'suppressed filter');

const sortDesc = buildSort('email', 'desc');
assert(sortDesc.email === -1, 'sort desc email');

const sortAsc = buildSort('name', 'asc');
assert(sortAsc.name === 1, 'sort asc name');

const {
  parseCsv,
  inferStatusFromRow,
  pickTimestamp,
  addImportResults,
} = require('../server/domains/whatsapp/importService');

const parsed = parseCsv('Name,Mobile Number,Sent At,Read At\n"Ada","+91999","May 6, 2026, 2:29 PM","May 6, 2026, 3:23 PM"\n');
assert(parsed.length === 1, 'csv row parsed');
assert(parsed[0]['Sent At'] === 'May 6, 2026, 2:29 PM', 'quoted csv comma preserved');
assert(parsed[0]['Mobile Number'] === '+91999', 'mobile number parsed');
assert(inferStatusFromRow(parsed[0]) === 'read', 'read status inferred');
assert(pickTimestamp(parsed[0], 'read') === 'May 6, 2026, 3:23 PM', 'read timestamp picked');

const failedCsv = parseCsv('Name,Mobile Number,Sent At,Failure Reason\n"Ada","+91999","","template paused"\n');
assert(inferStatusFromRow(failedCsv[0]) === 'failed', 'failed status inferred');

const mergedImport = addImportResults(
  { totalRows: 2, matched: 1, unmatched: 1, needsReview: 0, importBatchId: 'a', inserted: 2, updated: 0 },
  { totalRows: 3, matched: 2, unmatched: 0, needsReview: 1, importBatchId: 'b', inserted: 1, updated: 2 },
);
assert(mergedImport.totalRows === 5, 'bulk import totals rows');
assert(mergedImport.matched === 3, 'bulk import totals matched');
assert(mergedImport.importBatchId === 'b', 'bulk import keeps latest batch id');

if (failed) {
  console.error(`audience-read-self-check: ${failed} failure(s)`);
  process.exit(1);
}
console.log('audience-read-self-check: ok');
