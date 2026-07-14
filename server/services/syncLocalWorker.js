const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '..', '.sync-state.json');
const SYNC_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'migrate-to-local.mjs');

/** @type {{ status: 'idle'|'running'|'completed'|'failed', startedAt?: string, finishedAt?: string, error?: string }} */
let state = { status: 'idle' };
/** @type {import('child_process').ChildProcess|null} */
let child = null;

function readSyncStateFile() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { /* ignore */ }
  return null;
}

function getSyncLocalStatus() {
  const file = readSyncStateFile();
  return {
    ...state,
    lastSyncAt: file?.lastSyncAt || null,
    rowsSynced: file?.rowsSynced ?? null,
    collections: file?.collections || null,
    lastError: file?.lastError || null,
    lastErrorAt: file?.lastErrorAt || null,
    localConfigured: Boolean(process.env.LOCAL_MONGODB_URI),
  };
}

function startSyncLocalRun() {
  if (state.status === 'running') {
    return { started: false, reason: 'Sync already running', status: getSyncLocalStatus() };
  }
  if (!process.env.LOCAL_MONGODB_URI) {
    return {
      started: false,
      reason: 'LOCAL_MONGODB_URI is not configured on this server',
      status: getSyncLocalStatus(),
    };
  }

  state = { status: 'running', startedAt: new Date().toISOString() };

  child = spawn(process.execPath, [SYNC_SCRIPT], {
    cwd: path.join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'ignore',
  });

  child.on('error', (err) => {
    state = {
      status: 'failed',
      startedAt: state.startedAt,
      finishedAt: new Date().toISOString(),
      error: err.message || 'Sync process failed to start',
    };
    child = null;
  });

  child.on('close', (code) => {
    const file = readSyncStateFile();
    if (code === 0) {
      state = {
        status: 'completed',
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
      };
    } else {
      state = {
        status: 'failed',
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        error: file?.lastError || `Sync exited with code ${code}`,
      };
    }
    child = null;
  });

  return { started: true, status: getSyncLocalStatus() };
}

module.exports = { getSyncLocalStatus, startSyncLocalRun };
