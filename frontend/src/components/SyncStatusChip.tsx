'use client';

import { useState } from 'react';
import { mirror } from '@/lib/api';
import { PostmarkBadge } from './PostmarkBadge';

interface SyncStatusChipProps {
  lastSyncAt: string | null;
  stalenessMinutes?: number;
  isHealthy?: boolean;
  compact?: boolean;
}

export function SyncStatusChip({ lastSyncAt, stalenessMinutes = 0, isHealthy = true, compact = false }: SyncStatusChipProps) {
  const [syncing, setSyncing] = useState(false);
  const isStale = stalenessMinutes > 30;
  const status = isHealthy && !isStale ? 'synced' : isStale ? 'queued' : 'offline';

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await mirror.sync.trigger();
    } catch (err) {
      console.error('Sync trigger failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-ledger">
        <PostmarkBadge status={status} size="sm" />
        {isHealthy ? (isStale ? `${stalenessMinutes}m stale` : 'synced') : 'offline'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
      <PostmarkBadge status={status} size="sm" />
      <span className="flex-1 text-muted-ledger">
        {!isHealthy ? 'Sync worker offline'
          : isStale ? `Last synced ${stalenessMinutes} minutes ago; data may be stale`
          : lastSyncAt ? `Synced ${formatTimeAgo(lastSyncAt)}`
          : 'Sync not yet started'}
      </span>
      {!isStale && lastSyncAt && (
        <span className="mono text-xs text-muted-ledger">{new Date(lastSyncAt).toLocaleTimeString()}</span>
      )}
      <button onClick={handleSyncNow} disabled={syncing} className="btn-secondary px-2 py-1 text-xs">
        {syncing ? 'Syncing...' : 'Sync now'}
      </button>
      {isStale && (
        <button onClick={() => window.location.reload()} className="btn-secondary px-2 py-1 text-xs">
          Load live instead
        </button>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
