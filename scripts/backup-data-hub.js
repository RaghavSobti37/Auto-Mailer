require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../server/config');
const { runMongoBackup } = require('../server/services/dataHubBackupService');

async function main() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  const result = await runMongoBackup();
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  if (result.skipped) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
