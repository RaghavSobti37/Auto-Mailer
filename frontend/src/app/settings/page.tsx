'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { live } from '@/lib/api';
import { useState } from 'react';

function displayApiUrl() {
  if (process.env.NEXT_PUBLIC_LIVE_API_URL) return process.env.NEXT_PUBLIC_LIVE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://auto-mailer-5e54.onrender.com';
  }
  return 'http://localhost:5001';
}

export default function SettingsPage() {
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState('');

  async function runBackup() {
    setBackupStatus('running');
    setBackupMessage('');
    try {
      const result = await live.dataHub.backup();
      if (result.skipped) {
        setBackupStatus('error');
        setBackupMessage(result.reason || 'Backup skipped');
        return;
      }
      const sizeMb = ((result.compressedBytes || 0) / (1024 * 1024)).toFixed(2);
      setBackupStatus('success');
      setBackupMessage(`Backed up ${result.documentCount || 0} documents into ${result.chunkCount || 0} compressed chunks (${sizeMb} MB).`);
    } catch (error) {
      setBackupStatus('error');
      setBackupMessage(error instanceof Error ? error.message : 'Backup failed');
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Settings</h1><p className="text-sm text-gray-500 mt-1">Environment and connection configuration</p></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Connection</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">Local API URL</label><input className="input" defaultValue={displayApiUrl()} readOnly /></div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Local data source</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sync Configuration</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">Method</label><div className="text-gray-700">Local MongoDB primary</div></div>
              <div><label className="label">Backup</label><div className="text-gray-700">Manual compressed online Mongo copy</div></div>
              <div><label className="label">Collections</label><div className="text-gray-700">Campaign, MailEvent, EmailLog, EmailProfile, MailTemplate, MailCampaign, WhatsAppEvent, Person</div></div>
              <button
                type="button"
                onClick={runBackup}
                disabled={backupStatus === 'running'}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {backupStatus === 'running' ? 'Backing up...' : 'Back up now'}
              </button>
              {backupMessage && (
                <p className={backupStatus === 'error' ? 'text-xs text-red-600' : 'text-xs text-green-600'}>
                  {backupMessage}
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span>Include unsubscribe link in campaigns</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span>Track opens and clicks</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
