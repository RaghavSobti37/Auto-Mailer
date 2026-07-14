'use client';

import { PostmarkBadge } from './PostmarkBadge';

interface BackupStatusChipProps {
  status: 'idle' | 'running' | 'completed' | 'failed';
  compact?: boolean;
  lastBackupAt?: string;
  onBackup?: () => void;
  backingUp?: boolean;
}

function formatWhen(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function BackupStatusChip({
  status,
  compact = false,
  lastBackupAt,
  onBackup,
  backingUp = false,
}: BackupStatusChipProps) {
  const badge = status === 'running' ? 'queued' : status === 'completed' ? 'synced' : status === 'failed' ? 'failed' : 'offline';
  const when = formatWhen(lastBackupAt);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-ledger">
        <PostmarkBadge status={badge} size="sm" />
        {status === 'running' ? 'backing up' : when ? `backup ${when}` : status === 'failed' ? 'backup failed' : 'no backup yet'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm h-full" style={{ borderColor: 'var(--line)' }}>
      <PostmarkBadge status={badge} size="sm" />
      <span className="flex-1 text-muted-ledger text-xs sm:text-sm">
        {status === 'running'
          ? 'Compressed backup to online MongoDB in progress…'
          : when
            ? `Last backup: ${when}`
            : status === 'failed'
              ? 'Last online backup failed — retry below'
              : 'Online backup not run yet on this server'}
      </span>
      {onBackup && (
        <button
          type="button"
          onClick={onBackup}
          disabled={backingUp || status === 'running'}
          className="btn-secondary px-2 py-1 text-xs shrink-0"
        >
          {backingUp || status === 'running' ? 'Backing up…' : 'Back up now'}
        </button>
      )}
    </div>
  );
}
