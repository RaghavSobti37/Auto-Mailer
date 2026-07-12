const { runMongoBackup } = require('./dataHubBackupService');

/** @type {{ status: 'idle'|'running'|'completed'|'failed', startedAt?: string, finishedAt?: string, result?: object, error?: string }} */
let state = { status: 'idle' };

function getBackupStatus() {
  return { ...state };
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
      state = {
        status: 'completed',
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
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
