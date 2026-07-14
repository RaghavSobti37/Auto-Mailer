const mongoose = require('mongoose');
const zlib = require('zlib');
const { BSON } = require('mongodb');
const config = require('../config');

const BACKUP_META_COLLECTION = '_auto_mailer_backup_runs';
const BACKUP_CHUNKS_COLLECTION = '_auto_mailer_backup_chunks';
const FALLBACK_ARCHIVE_COLLECTION = 'logarchives';
const MAX_UNCOMPRESSED_CHUNK_BYTES = 4 * 1024 * 1024;

function redactMongoUri(uri = '') {
  return String(uri).replace(/\/\/([^:/@]+):([^@]+)@/, '//***:***@');
}

function getTodayDelay(now = new Date(), hour = 2) {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function listSourceCollections(sourceDb) {
  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  return collections
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));
}

function serializeBackupDoc(doc) {
  return BSON.EJSON.stringify(doc, { relaxed: false });
}

function gzipPayload(text) {
  return zlib.gzipSync(Buffer.from(text, 'utf8'));
}

function isCollectionCapError(err) {
  return /cannot create a new collection|already using 500 collections/i.test(err?.message || '');
}

async function insertBackupRecord(targetDb, collectionName, doc) {
  await targetDb.collection(collectionName).insertOne(doc);
}

function chunkRecord({ runId, collectionName, sequence, docs, targetCollection }) {
  const payload = `${docs.map(serializeBackupDoc).join('\n')}\n`;
  const compressed = gzipPayload(payload);
  const record = {
    runId,
    recordType: 'auto_mailer_backup_chunk',
    collectionName,
    sequence,
    documentCount: docs.length,
    uncompressedBytes: Buffer.byteLength(payload),
    compressedBytes: compressed.length,
    compression: 'gzip',
    format: 'ejsonl',
    data: compressed,
    createdAt: new Date(),
  };
  if (targetCollection === FALLBACK_ARCHIVE_COLLECTION) {
    record.archiveType = 'auto_mailer_backup';
    record.source = 'auto-mailer';
  }
  return { record, payload };
}

async function insertCompressedChunk(targetDb, { runId, collectionName, sequence, docs, targetCollection = BACKUP_CHUNKS_COLLECTION }) {
  if (!docs.length) return { documents: 0, uncompressedBytes: 0, compressedBytes: 0 };

  const { record, payload } = chunkRecord({ runId, collectionName, sequence, docs, targetCollection });
  await insertBackupRecord(targetDb, targetCollection, record);

  return {
    documents: docs.length,
    uncompressedBytes: Buffer.byteLength(payload),
    compressedBytes: record.compressedBytes,
  };
}

async function copyCollection(sourceDb, targetDb, collectionName, startedAt, runId = new mongoose.Types.ObjectId(), backupCollections = {}) {
  const source = sourceDb.collection(collectionName);

  let copied = 0;
  let sequence = 0;
  let uncompressedBytes = 0;
  let compressedBytes = 0;
  let chunkDocs = [];
  let chunkBytes = 0;
  const cursor = source.find({});

  async function flushChunk() {
    const result = await insertCompressedChunk(targetDb, {
      runId,
      collectionName,
      sequence,
      docs: chunkDocs,
      targetCollection: backupCollections.chunks || BACKUP_CHUNKS_COLLECTION,
    });
    if (result.documents > 0) sequence += 1;
    copied += result.documents;
    uncompressedBytes += result.uncompressedBytes;
    compressedBytes += result.compressedBytes;
    chunkDocs = [];
    chunkBytes = 0;
  }

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const docBytes = Buffer.byteLength(serializeBackupDoc(doc)) + 1;
    if (chunkDocs.length && chunkBytes + docBytes > MAX_UNCOMPRESSED_CHUNK_BYTES) {
      await flushChunk();
    }
    chunkDocs.push(doc);
    chunkBytes += docBytes;
  }
  await flushChunk();

  await insertBackupRecord(targetDb, backupCollections.meta || BACKUP_META_COLLECTION, {
    runId,
    recordType: 'auto_mailer_backup_collection',
    archiveType: backupCollections.meta === FALLBACK_ARCHIVE_COLLECTION ? 'auto_mailer_backup' : undefined,
    source: backupCollections.meta === FALLBACK_ARCHIVE_COLLECTION ? 'auto-mailer' : undefined,
    collectionName,
    copied,
    chunks: sequence,
    uncompressedBytes,
    compressedBytes,
    compressionRatio: uncompressedBytes ? Number((compressedBytes / uncompressedBytes).toFixed(4)) : 0,
    sourceDatabase: sourceDb.databaseName,
    backupDatabase: targetDb.databaseName,
    startedAt,
    completedAt: new Date(),
  });

  return { copied, chunks: sequence, uncompressedBytes, compressedBytes };
}

async function resolveBackupDestination({ sourceDb, targetDb, startedAt, runId }) {
  const startRecord = {
    runId,
    recordType: 'auto_mailer_backup_run',
    status: 'started',
    compression: 'gzip',
    format: 'ejsonl',
    sourceDatabase: sourceDb.databaseName,
    backupDatabase: targetDb.databaseName,
    sourceUri: redactMongoUri(config.mongoUri),
    startedAt,
  };

  try {
    await insertBackupRecord(targetDb, BACKUP_META_COLLECTION, startRecord);
    return {
      db: targetDb,
      collections: { meta: BACKUP_META_COLLECTION, chunks: BACKUP_CHUNKS_COLLECTION },
      mode: 'dedicated',
    };
  } catch (err) {
    if (!isCollectionCapError(err)) throw err;
    const existing = await sourceDb.listCollections({ name: FALLBACK_ARCHIVE_COLLECTION }, { nameOnly: true }).toArray();
    if (!existing.length) throw err;
    await insertBackupRecord(sourceDb, FALLBACK_ARCHIVE_COLLECTION, {
      ...startRecord,
      archiveType: 'auto_mailer_backup',
      source: 'auto-mailer',
      backupDatabase: sourceDb.databaseName,
      fallbackReason: 'Atlas collection cap blocked dedicated backup collections',
    });
    return {
      db: sourceDb,
      collections: { meta: FALLBACK_ARCHIVE_COLLECTION, chunks: FALLBACK_ARCHIVE_COLLECTION },
      mode: 'fallback_existing_archive_collection',
      fallbackReason: 'Atlas collection cap blocked dedicated backup collections',
    };
  }
}

async function runMongoBackup({
  sourceConnection = mongoose.connection,
  targetUri = config.onlineBackupMongoUri,
} = {}) {
  if (!targetUri) {
    return { skipped: true, reason: 'ONLINE_BACKUP_MONGODB_URI is not set' };
  }
  if (!sourceConnection?.db) {
    throw new Error('Local MongoDB connection is not ready');
  }

  const startedAt = new Date();
  const runId = new mongoose.Types.ObjectId();
  const targetConnection = await mongoose.createConnection(targetUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();

  try {
    const sourceDb = sourceConnection.db;
    let targetDb = targetConnection.db;
    const collections = await listSourceCollections(sourceDb);
    const copied = {};
    const destination = await resolveBackupDestination({ sourceDb, targetDb, startedAt, runId });
    targetDb = destination.db;

    for (const collectionName of collections) {
      copied[collectionName] = await copyCollection(sourceDb, targetDb, collectionName, startedAt, runId, destination.collections);
    }
    const documentCount = Object.values(copied).reduce((sum, row) => sum + row.copied, 0);
    const chunkCount = Object.values(copied).reduce((sum, row) => sum + row.chunks, 0);
    const uncompressedBytes = Object.values(copied).reduce((sum, row) => sum + row.uncompressedBytes, 0);
    const compressedBytes = Object.values(copied).reduce((sum, row) => sum + row.compressedBytes, 0);

    await insertBackupRecord(targetDb, destination.collections.meta, {
      runId,
      recordType: 'auto_mailer_backup_run',
      archiveType: destination.collections.meta === FALLBACK_ARCHIVE_COLLECTION ? 'auto_mailer_backup' : undefined,
      source: destination.collections.meta === FALLBACK_ARCHIVE_COLLECTION ? 'auto-mailer' : undefined,
      status: 'completed',
      backupMode: destination.mode,
      fallbackReason: destination.fallbackReason,
      compression: 'gzip',
      format: 'ejsonl',
      sourceDatabase: sourceDb.databaseName,
      backupDatabase: targetDb.databaseName,
      collectionCount: collections.length,
      documentCount,
      chunkCount,
      uncompressedBytes,
      compressedBytes,
      compressionRatio: uncompressedBytes ? Number((compressedBytes / uncompressedBytes).toFixed(4)) : 0,
      copied,
      startedAt,
      completedAt: new Date(),
    });

    return {
      skipped: false,
      runId: runId.toString(),
      backupMode: destination.mode,
      fallbackReason: destination.fallbackReason,
      collections: collections.length,
      documentCount,
      chunkCount,
      uncompressedBytes,
      compressedBytes,
      copied,
    };
  } finally {
    await targetConnection.close();
  }
}

function scheduleDailyBackup({
  hour = config.backupScheduleHour,
  run = runMongoBackup,
  logger = console,
} = {}) {
  if (!config.onlineBackupMongoUri) {
    logger.info('[Auto-Mailer] Online Mongo backup disabled (ONLINE_BACKUP_MONGODB_URI not set)');
    return null;
  }

  let timer = null;
  const scheduleNext = () => {
    timer = setTimeout(async () => {
      try {
        const result = await run();
        logger.info('[Auto-Mailer] Online Mongo backup complete', result);
      } catch (err) {
        logger.error('[Auto-Mailer] Online Mongo backup failed:', err.message);
      } finally {
        scheduleNext();
      }
    }, getTodayDelay(new Date(), hour));
    if (timer.unref) timer.unref();
  };

  scheduleNext();
  return () => {
    if (timer) clearTimeout(timer);
  };
}

module.exports = {
  BACKUP_META_COLLECTION,
  BACKUP_CHUNKS_COLLECTION,
  MAX_UNCOMPRESSED_CHUNK_BYTES,
  FALLBACK_ARCHIVE_COLLECTION,
  copyCollection,
  gzipPayload,
  getTodayDelay,
  insertCompressedChunk,
  isCollectionCapError,
  listSourceCollections,
  runMongoBackup,
  serializeBackupDoc,
  scheduleDailyBackup,
};
