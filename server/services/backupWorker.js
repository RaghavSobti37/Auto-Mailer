const { runMongoBackup } = require('./dataHubBackupService');
const { getMongoOpenTargets } = require('./mongoOpenLinks');

/** @type {{ status: 'idle'|'queued'|'running'|'completed'|'failed', startedAt?: string, finishedAt?: string, result?: object, error?: string, progress?: object }} */
let state = { status: 'idle' };
/** @type {{ startedAt?: string, finishedAt?: string, result?: object }|null} */
let lastCompleted = null;

function getBackupStatus() {
  return {
    ...state,
    lastCompleted,
    mongo: getMongoOpenTargets(),
  };
}

function startBackupRun() {
  if (state.status === 'running' || state.status === 'queued') {
    return { started: false, reason: 'Backup already running', status: getBackupStatus() };
  }

  state = {
    status: 'queued',
    startedAt: new Date().toISOString(),
    progress: { phase: 'queued', percent: 0, current: 0, total: 0, collectionName: null },
  };

  setImmediate(async () => {
    state = {
      ...state,
      status: 'running',
      progress: { phase: 'connecting', percent: 1, current: 0, total: 0, collectionName: null },
    };
    try {
      const result = await runMongoBackup({
        onProgress: (progress) => {
          if (state.status !== 'running' && state.status !== 'queued') return;
          state = { ...state, status: 'running', progress };
        },
      });
      if (result.skipped) {
        state = {
          status: 'failed',
          startedAt: state.startedAt,
          finishedAt: new Date().toISOString(),
          error: result.reason || 'Backup skipped',
          result,
          progress: { phase: 'failed', percent: 0, current: 0, total: 0, collectionName: null },
        };
        return;
      }
      const finishedAt = new Date().toISOString();
      state = {
        status: 'completed',
        startedAt: state.startedAt,
        finishedAt,
        result,
        progress: { phase: 'completed', percent: 100, current: result.collections || 0, total: result.collections || 0, collectionName: null },
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
        progress: { phase: 'failed', percent: 0, current: 0, total: 0, collectionName: null },
      };
    }
  });

  return { started: true, status: getBackupStatus() };
}

module.exports = { getBackupStatus, startBackupRun };
