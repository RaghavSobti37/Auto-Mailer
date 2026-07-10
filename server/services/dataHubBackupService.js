const mongoose = require('mongoose');
const config = require('../config');

const BACKUP_META_COLLECTION = '_auto_mailer_backup_runs';

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

async function copyCollection(sourceDb, targetDb, collectionName, startedAt) {
  const source = sourceDb.collection(collectionName);
  const target = targetDb.collection(collectionName);
  await target.deleteMany({});

  let copied = 0;
  const cursor = source.find({});
  while (await cursor.hasNext()) {
    const batch = [];
    while (batch.length < 500 && await cursor.hasNext()) {
      batch.push(await cursor.next());
    }
    if (batch.length) {
      await target.insertMany(batch, { ordered: false });
      copied += batch.length;
    }
  }

  await targetDb.collection(BACKUP_META_COLLECTION).insertOne({
    collectionName,
    copied,
    sourceDatabase: sourceDb.databaseName,
    backupDatabase: targetDb.databaseName,
    startedAt,
    completedAt: new Date(),
  });

  return copied;
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
  const targetConnection = await mongoose.createConnection(targetUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();

  try {
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;
    const collections = await listSourceCollections(sourceDb);
    const copied = {};

    await targetDb.collection(BACKUP_META_COLLECTION).insertOne({
      status: 'started',
      sourceDatabase: sourceDb.databaseName,
      backupDatabase: targetDb.databaseName,
      sourceUri: redactMongoUri(config.mongoUri),
      startedAt,
    });

    for (const collectionName of collections) {
      copied[collectionName] = await copyCollection(sourceDb, targetDb, collectionName, startedAt);
    }

    await targetDb.collection(BACKUP_META_COLLECTION).insertOne({
      status: 'completed',
      sourceDatabase: sourceDb.databaseName,
      backupDatabase: targetDb.databaseName,
      collectionCount: collections.length,
      documentCount: Object.values(copied).reduce((sum, n) => sum + n, 0),
      copied,
      startedAt,
      completedAt: new Date(),
    });

    return { skipped: false, collections: collections.length, copied };
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
  copyCollection,
  getTodayDelay,
  listSourceCollections,
  runMongoBackup,
  scheduleDailyBackup,
};
