const assert = require('assert');
const zlib = require('zlib');
const { BSON, ObjectId } = require('mongodb');
const {
  getTodayDelay,
  gzipPayload,
  insertCompressedChunk,
  serializeBackupDoc,
} = require('../server/services/dataHubBackupService');

const morning = new Date(2026, 6, 9, 1, 30, 0, 0);
assert.strictEqual(getTodayDelay(morning, 2), 30 * 60 * 1000);

const afterWindow = new Date(2026, 6, 9, 3, 0, 0, 0);
assert.strictEqual(getTodayDelay(afterWindow, 2), 23 * 60 * 60 * 1000);

const doc = { _id: new ObjectId('507f1f77bcf86cd799439011'), createdAt: new Date('2026-07-12T00:00:00.000Z') };
const serialized = serializeBackupDoc(doc);
assert(serialized.includes('$oid'));
assert(serialized.includes('$date'));

const compressed = gzipPayload(`${serialized}\n`);
const restored = BSON.EJSON.parse(zlib.gunzipSync(compressed).toString('utf8').trim());
assert.strictEqual(restored._id.toString(), doc._id.toString());
assert.strictEqual(restored.createdAt.toISOString(), doc.createdAt.toISOString());

(async () => {
  const inserted = [];
  const fakeDb = { collection: () => ({ insertOne: async (row) => inserted.push(row) }) };
  const result = await insertCompressedChunk(fakeDb, {
    runId: new ObjectId('507f1f77bcf86cd799439012'),
    collectionName: 'people',
    sequence: 0,
    docs: [doc],
  });
  assert.strictEqual(result.documents, 1);
  assert.strictEqual(inserted.length, 1);
  assert.strictEqual(inserted[0].compression, 'gzip');
  assert(Buffer.isBuffer(inserted[0].data));
  console.log('backup-self-check passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
