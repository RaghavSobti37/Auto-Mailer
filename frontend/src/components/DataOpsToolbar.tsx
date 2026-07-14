'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { BackupStatusChip } from './BackupStatusChip';

export function DataOpsToolbar({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();

  const { data: backup } = useQuery({
    queryKey: ['backup-status'],
    queryFn: () => live.backup.status(),
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 3000 : 30_000),
  });

  const { data: sync } = useQuery({
    queryKey: ['sync-local-status'],
    queryFn: () => live.sync.localStatus(),
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 3000 : 30_000),
  });

  const backupMut = useMutation({
    mutationFn: () => live.backup.start(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backup-status'] }),
  });

  const syncMut = useMutation({
    mutationFn: () => live.sync.localStart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sync-local-status'] }),
  });

  const lastBackupAt = backup?.lastCompleted?.finishedAt || (backup?.status === 'completed' ? backup.finishedAt : undefined);
  const lastSyncAt = sync?.lastSyncAt;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <BackupStatusChip
          status={backup?.status || 'idle'}
          compact
          lastBackupAt={lastBackupAt}
        />
        {lastSyncAt && (
          <span className="text-[10px] text-muted-ledger">
            Sync {new Date(lastSyncAt).toLocaleString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
      <div className="flex-1 min-w-[240px]">
        <BackupStatusChip
          status={backup?.status || 'idle'}
          lastBackupAt={lastBackupAt}
          onBackup={() => backupMut.mutate()}
          backingUp={backupMut.isPending}
        />
      </div>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border px-3 py-2 text-sm flex-1 min-w-[240px]"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex-1 text-muted-ledger text-xs sm:text-sm">
          {sync?.status === 'running'
            ? 'Syncing online data to local MongoDB…'
            : lastSyncAt
              ? `Last local sync: ${new Date(lastSyncAt).toLocaleString()}`
              : sync?.localConfigured === false
                ? 'Local sync needs LOCAL_MONGODB_URI on API server'
                : 'Pull mail collections to local MongoDB'}
          {sync?.lastError && sync.status === 'failed' && (
            <span className="block text-postmark mt-0.5">{sync.lastError}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => syncMut.mutate()}
          disabled={syncMut.isPending || sync?.status === 'running' || sync?.localConfigured === false}
          className="btn-secondary px-2 py-1 text-xs shrink-0"
        >
          {sync?.status === 'running' || syncMut.isPending ? 'Syncing…' : 'Sync to local'}
        </button>
      </div>
    </div>
  );
}
