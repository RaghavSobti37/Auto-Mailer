const config = require('../config');
const {
  BACKUP_META_COLLECTION,
  FALLBACK_ARCHIVE_COLLECTION,
} = require('./dataHubBackupService');

function redactMongoUri(uri = '') {
  return String(uri).replace(/\/\/([^:/@]+):([^@]+)@/, '//***:***@');
}

function parseMongoUri(uri = '') {
  const raw = String(uri || '').trim();
  if (!raw) return null;
  try {
    const normalized = raw.replace(/^mongodb\+srv:\/\//i, 'https://').replace(/^mongodb:\/\//i, 'https://');
    const u = new URL(normalized);
    const database = decodeURIComponent((u.pathname || '').replace(/^\//, '').split('/')[0] || '') || null;
    const host = u.hostname || '';
    const isSrv = /^mongodb\+srv:/i.test(raw);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(host);
    // host like main-cluster.lgafikg.mongodb.net → cluster label "main-cluster"
    let clusterName = null;
    if (/\.mongodb\.net$/i.test(host)) {
      clusterName = host.split('.')[0] || null;
    }
    return {
      kind: isLocal ? 'local' : isSrv || /\.mongodb\.net$/i.test(host) ? 'atlas' : 'remote',
      host,
      database,
      clusterName,
      redactedUri: redactMongoUri(raw),
    };
  } catch {
    return null;
  }
}

function atlasExplorerUrl({ projectId, clusterName, database, collection }) {
  if (!projectId || !clusterName || !database || !collection) return null;
  return `https://cloud.mongodb.com/v2/${projectId}/explorer/${encodeURIComponent(clusterName)}/${encodeURIComponent(database)}/${encodeURIComponent(collection)}/find`;
}

function buildTarget(uri, { collection, openUrlOverride } = {}) {
  const parsed = parseMongoUri(uri);
  if (!parsed && !openUrlOverride) {
    return { configured: false };
  }

  const database = parsed?.database || 'auto-mailer';
  const collectionName = collection || database;
  const projectId = config.atlasProjectId || '';

  let openUrl = openUrlOverride || null;
  if (!openUrl && parsed?.kind === 'atlas') {
    openUrl = atlasExplorerUrl({
      projectId,
      clusterName: parsed.clusterName,
      database,
      collection: collectionName,
    });
    if (!openUrl) {
      // Atlas login — operator navigates to Data Explorer with db/collection shown in UI
      openUrl = 'https://cloud.mongodb.com/';
    }
  }
  if (!openUrl && parsed?.kind === 'local') {
    // Compass deep-link (registered when Compass is installed)
    openUrl = `mongodb://localhost:27017/${database}`;
  }

  return {
    configured: Boolean(uri),
    kind: parsed?.kind || 'unknown',
    host: parsed?.host || null,
    database,
    collection: collectionName,
    clusterName: parsed?.clusterName || null,
    openUrl,
    redactedUri: parsed?.redactedUri || null,
  };
}

function getMongoOpenTargets() {
  return {
    local: buildTarget(config.mongoUri, {
      collection: 'automailer_people',
      openUrlOverride: config.mongoLocalOpenUrl || '',
    }),
    onlineBackup: buildTarget(config.onlineBackupMongoUri, {
      collection: process.env.BACKUP_OPEN_COLLECTION || BACKUP_META_COLLECTION,
      openUrlOverride: config.mongoBackupOpenUrl || '',
    }),
    // When Atlas M0 caps force fallback archive collection
    onlineBackupFallbackCollection: FALLBACK_ARCHIVE_COLLECTION,
  };
}

module.exports = {
  getMongoOpenTargets,
  parseMongoUri,
  atlasExplorerUrl,
  redactMongoUri,
};
