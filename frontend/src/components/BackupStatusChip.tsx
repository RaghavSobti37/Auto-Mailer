'use client';

import { PostmarkBadge } from './PostmarkBadge';
import { MongoOpenButtons } from './MongoOpenButtons';
import type { BackupJobStatus } from '@/lib/api';

interface BackupStatusChipProps {
  status: BackupJobStatus['status'];
  compact?: boolean;
  lastBackupAt?: string;
  onBackup?: () => void;
  backingUp?: boolean;
  progress?: BackupJobStatus['progress'];
  mongo?: BackupJobStatus['mongo'];
}

function formatWhen(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isActive(status: BackupJobStatus['status']) {
  return status === 'running' || status === 'queued';
}

export function BackupStatusChip({
  status,
  compact = false,
  lastBackupAt,
  onBackup,
  backingUp = false,
  progress,
  mongo,
}: BackupStatusChipProps) {
  const active = isActive(status);
  const badge = active ? 'queued' : status === 'completed' ? 'synced' : status === 'failed' ? 'failed' : 'offline';
  const when = formatWhen(lastBackupAt);
  const percent = Math.max(0, Math.min(100, progress?.percent ?? (active ? 4 : 0)));
  const progressLabel = progress?.collectionName
    ? `${progress.collectionName} (${progress.current || 0}/${progress.total || 0})`
    : progress?.phase === 'queued'
      ? 'Queued…'
      : progress?.phase === 'connecting'
        ? 'Connecting…'
        : progress?.phase === 'finalizing'
          ? 'Finalizing…'
          : active
            ? 'Backing up…'
            : null;

  if (compact) {
    return (
      <div className="inline-flex flex-col gap-1 min-w-[140px]">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-ledger">
          <PostmarkBadge status={badge} size="sm" />
          {active
            ? (progressLabel || 'backing up')
            : when
              ? `backup ${when}`
              : status === 'failed'
                ? 'backup failed'
                : 'no backup yet'}
        </span>
        {active && (
          <div className="quota-bar-wrap gap-1.5" title={progressLabel || 'Backup in progress'}>
            <div className="quota-bar h-1.5">
              <div
                className="quota-fill"
                style={{ width: `${percent}%`, background: 'var(--status-pending)' }}
              />
            </div>
            <span className="quota-label text-[10px]">{percent}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-none border px-3 py-2 text-sm h-full" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3">
        <PostmarkBadge status={badge} size="sm" />
        <span className="flex-1 text-muted-ledger text-xs sm:text-sm">
          {active
            ? (progressLabel
              ? `Backup ${progress?.phase === 'queued' ? 'queued' : 'in progress'} — ${progressLabel}`
              : 'Compressed backup to online MongoDB in progress…')
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
            disabled={backingUp || active}
            className="btn-secondary px-2 py-1 text-xs shrink-0"
          >
            {backingUp || active ? 'Backing up…' : 'Back up now'}
          </button>
        )}
      </div>

      {active && (
        <div className="quota-bar-wrap" aria-label="Backup progress">
          <div className="quota-bar">
            <div
              className="quota-fill"
              style={{ width: `${percent}%`, background: 'var(--status-pending)' }}
            />
          </div>
          <span className="quota-label">{percent}%</span>
        </div>
      )}

      <MongoOpenButtons local={mongo?.local} onlineBackup={mongo?.onlineBackup} />
    </div>
  );
}
