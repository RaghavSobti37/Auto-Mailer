'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MongoOpenButtons } from '@/components/MongoOpenButtons';
import { live, type BackupJobStatus } from '@/lib/api';
import { useEffect, useState } from 'react';

function displayApiUrl() {
  if (process.env.NEXT_PUBLIC_LIVE_API_URL) return process.env.NEXT_PUBLIC_LIVE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://auto-mailer-5e54.onrender.com';
  }
  return 'http://localhost:5001';
}

export default function SettingsPage() {
  const [backupStatus, setBackupStatus] = useState<BackupJobStatus>({ status: 'idle' });
  const [backupMessage, setBackupMessage] = useState('');
  const polling = backupStatus.status === 'running' || backupStatus.status === 'queued';

  useEffect(() => {
    live.backup.status().then(setBackupStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      try {
        const status = await live.backup.status();
        setBackupStatus(status);
        if (status.status === 'completed' && status.result) {
          const sizeMb = ((status.result.compressedBytes || 0) / (1024 * 1024)).toFixed(2);
          setBackupMessage(`Backed up ${status.result.documentCount || 0} docs → ${status.result.chunkCount || 0} chunks (${sizeMb} MB).`);
        }
        if (status.status === 'failed') {
          setBackupMessage(status.error || 'Backup failed');
        }
      } catch (error) {
        setBackupMessage(error instanceof Error ? error.message : 'Backup status unavailable');
      }
    }, 1500);
    return () => clearInterval(id);
  }, [polling]);

  async function runBackup() {
    setBackupMessage('');
    try {
      const { status } = await live.backup.start();
      setBackupStatus(status);
    } catch (error) {
      setBackupStatus({ status: 'failed', error: error instanceof Error ? error.message : 'Backup failed' });
      setBackupMessage(error instanceof Error ? error.message : 'Backup failed');
    }
  }

  const active = backupStatus.status === 'running' || backupStatus.status === 'queued';
  const percent = Math.max(0, Math.min(100, backupStatus.progress?.percent ?? (active ? 4 : 0)));
  const progressLabel = backupStatus.progress?.collectionName
    ? `${backupStatus.progress.collectionName} (${backupStatus.progress.current || 0}/${backupStatus.progress.total || 0})`
    : backupStatus.progress?.phase || null;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl tracking-tight">Settings</h1>
          <p className="text-sm text-muted-ledger mt-1">Local Mongo primary · online Mongo compressed backup</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Connection</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">API URL</label><input className="input" defaultValue={displayApiUrl()} readOnly /></div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--status-delivered)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-delivered)' }} />
                <span>Auto-Mailer owns all mail data (not CoreKnot)</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Online backup</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">Primary</label><div className="text-muted-ledger">Local / Render MongoDB</div></div>
              <div><label className="label">Archive</label><div className="text-muted-ledger">gzip EJSON chunks → ONLINE_BACKUP_MONGODB_URI</div></div>
              <div><label className="label">Worker</label><div className="capitalize">{backupStatus.status}</div></div>

              {active && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] mono text-muted-ledger">
                    <span>{progressLabel || 'queued'}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="quota-bar">
                    <div className="quota-fill" style={{ width: `${percent}%`, background: 'var(--status-pending)' }} />
                  </div>
                </div>
              )}

              <MongoOpenButtons
                local={backupStatus.mongo?.local}
                onlineBackup={backupStatus.mongo?.onlineBackup}
              />

              <button
                type="button"
                onClick={runBackup}
                disabled={active}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {active ? 'Backing up in background…' : 'Back up to online Mongo'}
              </button>
              {backupMessage && (
                <p className={backupStatus.status === 'failed' ? 'text-xs text-[var(--status-bounced)]' : 'text-xs'} style={backupStatus.status !== 'failed' ? { color: 'var(--status-delivered)' } : undefined}>
                  {backupMessage}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Compliance</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-[var(--line)]" />
                <span>Include unsubscribe link in campaigns</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-[var(--line)]" />
                <span>Track opens and clicks</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
