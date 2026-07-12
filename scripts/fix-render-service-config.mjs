#!/usr/bin/env node
/** Fix Auto-Mailer Render service rootDir + build (was CoreKnot Taskmaster paths). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVICE_ID = 'srv-d7istknaqgkc73a4rv70';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadRenderApiKey() {
  if (process.env.RENDER_API_KEY) return process.env.RENDER_API_KEY.trim();
  const file = path.resolve(repoRoot, '..', 'coreknot', '.cursor', 'render-api.local.env');
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^RENDER_API_KEY=(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('RENDER_API_KEY not found');
}

async function main() {
  const apiKey = loadRenderApiKey();
  const body = {
    rootDir: '',
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'npm start',
      },
    },
  };

  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('PATCH failed', res.status, text);
    process.exit(1);
  }
  const svc = JSON.parse(text);
  console.log('Updated service:', svc.name);
  console.log('rootDir:', svc.rootDir ?? '(repo root)');
  console.log('build:', svc.serviceDetails?.envSpecificDetails?.buildCommand);

  const deployRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clearCache: 'clear' }),
  });
  const deployText = await deployRes.text();
  if (!deployRes.ok) {
    console.error('Deploy failed', deployRes.status, deployText);
    process.exit(1);
  }
  console.log('Deploy:', JSON.parse(deployText).id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
