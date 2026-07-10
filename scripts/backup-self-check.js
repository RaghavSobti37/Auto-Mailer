const assert = require('assert');
const { getTodayDelay } = require('../server/services/dataHubBackupService');

const morning = new Date(2026, 6, 9, 1, 30, 0, 0);
assert.strictEqual(getTodayDelay(morning, 2), 30 * 60 * 1000);

const afterWindow = new Date(2026, 6, 9, 3, 0, 0, 0);
assert.strictEqual(getTodayDelay(afterWindow, 2), 23 * 60 * 60 * 1000);

console.log('backup-self-check passed');
