const assert = require('assert');
const {
  parseMongoUri,
  atlasExplorerUrl,
  getMongoOpenTargets,
} = require('../server/services/mongoOpenLinks');

const local = parseMongoUri('mongodb://localhost:27017/auto-mailer');
assert.strictEqual(local.kind, 'local');
assert.strictEqual(local.database, 'auto-mailer');
assert.strictEqual(local.host, 'localhost');

const atlas = parseMongoUri('mongodb+srv://u:p@main-cluster.lgafikg.mongodb.net/auto-mailer-backup?appName=x');
assert.strictEqual(atlas.kind, 'atlas');
assert.strictEqual(atlas.database, 'auto-mailer-backup');
assert.strictEqual(atlas.clusterName, 'main-cluster');

const deep = atlasExplorerUrl({
  projectId: 'proj123',
  clusterName: 'main-cluster',
  database: 'auto-mailer-backup',
  collection: '_auto_mailer_backup_runs',
});
assert.strictEqual(
  deep,
  'https://cloud.mongodb.com/v2/proj123/explorer/main-cluster/auto-mailer-backup/_auto_mailer_backup_runs/find',
);

const targets = getMongoOpenTargets();
assert.ok(targets.local);
assert.ok(targets.onlineBackup);

console.log('mongo-open-links-self-check passed');
