const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const repoRoot = path.resolve(__dirname, '..', '..');

function isHostedRuntime() {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.VERCEL || process.env.K_SERVICE);
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      shell: process.platform === 'win32',
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (error) => resolve({ code: 1, stdout, stderr: error.message }));
  });
}

async function dockerComposeUp() {
  if (isHostedRuntime()) {
    return {
      ok: true,
      skipped: true,
      mode: 'hosted',
      command: 'docker compose up -d',
      message: 'Hosted Render/Vercel runtimes cannot start Docker Desktop on this laptop. Data Hub sync will run against the configured MongoDB instead.',
    };
  }
  const ready = await ensureDockerReady();
  if (!ready.ok) return ready;
  const result = await run('docker', ['compose', 'up', '-d']);
  if (result.code !== 0) {
    const fallback = await run('docker-compose', ['up', '-d']);
    return { ok: fallback.code === 0, command: 'docker-compose up -d', ...fallback };
  }
  return { ok: true, command: 'docker compose up -d', ...result };
}

async function dockerStatus() {
  if (isHostedRuntime()) {
    return {
      ok: true,
      skipped: true,
      mode: 'hosted',
      command: 'docker compose ps --format json',
      stdout: '',
      stderr: '',
      message: 'Docker status is only available from the local laptop runtime.',
    };
  }
  const result = await run('docker', ['compose', 'ps', '--format', 'json']);
  return {
    ok: result.code === 0,
    command: 'docker compose ps --format json',
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function dockerInfo() {
  const result = await run('docker', ['info']);
  return { ok: result.code === 0, ...result };
}

function startDockerDesktop() {
  if (process.platform !== 'win32') return { attempted: false };
  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Docker', 'Docker Desktop.exe'),
  ];
  const exe = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!exe) return { attempted: false, reason: 'Docker Desktop executable not found' };
  const child = spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return { attempted: true, exe };
}

async function ensureDockerReady({ timeoutMs = 90000 } = {}) {
  let info = await dockerInfo();
  if (info.ok) return { ok: true, dockerStarted: false };

  const desktop = startDockerDesktop();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    info = await dockerInfo();
    if (info.ok) return { ok: true, dockerStarted: desktop.attempted, dockerDesktop: desktop };
  }

  return {
    ok: false,
    command: 'docker info',
    stdout: info.stdout,
    stderr: info.stderr || desktop.reason || 'Docker daemon did not become ready before timeout',
    dockerStarted: desktop.attempted,
    dockerDesktop: desktop,
  };
}

async function getDatabaseStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    name: mongoose.connection.name || '',
    host: mongoose.connection.host || '',
  };
}

module.exports = {
  dockerComposeUp,
  dockerStatus,
  getDatabaseStatus,
  ensureDockerReady,
  isHostedRuntime,
};
