'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { mirror } from '@/lib/api';

interface SyncStatusChipProps {
  lastSyncAt: string | null;
  stalenessMinutes?: number;
  isHealthy?: boolean;
  compact?: boolean;
}

export function SyncStatusChip({ lastSyncAt, stalenessMinutes = 0, isHealthy = true, compact = false }: SyncStatusChipProps) {
  const [syncing, setSyncing] = useState(false);

  const isStale = stalenessMinutes > 30;
  const statusColor = !isHealthy ? 'bg-red-100 text-red-800 border-red-200'
    : isStale ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-green-100 text-green-800 border-green-200';

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
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isHealthy && !isStale ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        {isHealthy ? (isStale ? `${stalenessMinutes}m stale` : 'synced') : 'offline'}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${statusColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${isHealthy && !isStale ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="flex-1">
        {!isHealthy ? 'Sync worker offline'
          : isStale ? `Last synced ${stalenessMinutes} minutes ago — data may be stale`
          : lastSyncAt ? `Synced ${formatTimeAgo(lastSyncAt)}`
          : 'Sync not yet started'}
      </span>
      {!isStale && lastSyncAt && (
        <span className="text-xs opacity-60">{new Date(lastSyncAt).toLocaleTimeString()}</span>
      )}
      <button
        onClick={handleSyncNow}
        disabled={syncing}
        className="px-2 py-1 text-xs font-medium rounded-md bg-white/60 hover:bg-white border transition-colors disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Sync now'}
      </button>
      {isStale && (
        <button
          onClick={() => window.location.reload()}
          className="px-2 py-1 text-xs font-medium rounded-md bg-amber-200/60 hover:bg-amber-200 border border-amber-300 transition-colors"
        >
          Load live instead
        </button>
      )}
    </motion.div>
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
