const { runMongoBackup } = require('./dataHubBackupService');

/** @type {{ status: 'idle'|'running'|'completed'|'failed', startedAt?: string, finishedAt?: string, result?: object, error?: string }} */
let state = { status: 'idle' };
/** @type {{ startedAt?: string, finishedAt?: string, result?: object }|null} */
let lastCompleted = null;

function getBackupStatus() {
  return { ...state, lastCompleted };
}

function startBackupRun() {
  if (state.status === 'running') {
    return { started: false, reason: 'Backup already running', status: getBackupStatus() };
  }

  state = { status: 'running', startedAt: new Date().toISOString() };

  setImmediate(async () => {
    try {
      const result = await runMongoBackup();
      if (result.skipped) {
        state = {
          status: 'failed',
          startedAt: state.startedAt,
          finishedAt: new Date().toISOString(),
          error: result.reason || 'Backup skipped',
          result,
        };
        return;
      }
      const finishedAt = new Date().toISOString();
      state = {
        status: 'completed',
        startedAt: state.startedAt,
        finishedAt,
        result,
      };
      lastCompleted = {
        startedAt: state.startedAt,
        finishedAt,
        result,
      };
    } catch (err) {
      state = {
        status: 'failed',
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        error: err.message || 'Backup failed',
      };
    }
  });

  return { started: true, status: getBackupStatus() };
}

module.exports = { getBackupStatus, startBackupRun };
