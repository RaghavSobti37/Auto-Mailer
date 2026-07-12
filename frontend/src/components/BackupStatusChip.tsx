'use client';

import { useState } from 'react';
import { live } from '@/lib/api';
import { PostmarkBadge } from './PostmarkBadge';

interface BackupStatusChipProps {
  status: 'idle' | 'running' | 'completed' | 'failed';
  compact?: boolean;
  onBackup?: () => void;
  backingUp?: boolean;
}

export function BackupStatusChip({ status, compact = false, onBackup, backingUp = false }: BackupStatusChipProps) {
  const badge = status === 'running' ? 'queued' : status === 'completed' ? 'synced' : status === 'failed' ? 'failed' : 'offline';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-ledger">
        <PostmarkBadge status={badge} size="sm" />
        {status === 'running' ? 'backing up' : status === 'completed' ? 'backup ok' : status === 'failed' ? 'backup failed' : 'local primary'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
      <PostmarkBadge status={badge} size="sm" />
      <span className="flex-1 text-muted-ledger">
        {status === 'running' ? 'Compressed backup to online MongoDB in progress…'
          : status === 'completed' ? 'Last online backup completed'
          : status === 'failed' ? 'Last online backup failed — retry from Settings'
          : 'Local MongoDB is primary; back up to online Mongo when ready'}
      </span>
      {onBackup && (
        <button onClick={onBackup} disabled={backingUp || status === 'running'} className="btn-secondary px-2 py-1 text-xs">
          {backingUp || status === 'running' ? 'Backing up…' : 'Back up now'}
        </button>
      )}
    </div>
  );
}
