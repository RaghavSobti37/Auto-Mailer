'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { MongoOpenButtons } from '@/components/MongoOpenButtons';

export default function SystemPage() {
  const queryClient = useQueryClient();

  const { data: health } = useQuery({ queryKey: ['system-health'], queryFn: () => live.system.health(), refetchInterval: 30_000 });
  const { data: backupStatus } = useQuery({
    queryKey: ['backup-status'],
    queryFn: () => live.backup.status(),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'running' || s === 'queued' ? 1500 : 30_000;
    },
  });

  const backupMutation = useMutation({
    mutationFn: () => live.backup.start(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backup-status'] }),
  });

  const result = backupStatus?.result;
  const active = backupStatus?.status === 'running' || backupStatus?.status === 'queued';
  const percent = Math.max(0, Math.min(100, backupStatus?.progress?.percent ?? (active ? 4 : 0)));
  const progressLabel = backupStatus?.progress?.collectionName
    ? `${backupStatus.progress.collectionName} (${backupStatus.progress.current || 0}/${backupStatus.progress.total || 0})`
    : backupStatus?.progress?.phase || null;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl tracking-tight">System</h1>
          <p className="text-sm text-muted-ledger mt-1">Infrastructure health and online backup</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <PostmarkBadge status={health ? 'healthy' : 'offline'} size="sm" />
              <h3 className="text-sm font-semibold">API Status</h3>
            </div>
            <div className="text-sm text-muted-ledger">
              <div className="flex justify-between py-1"><span>Service</span><span className="font-medium">{health?.service || 'unknown'}</span></div>
              <div className="flex justify-between py-1"><span>Status</span><span className="font-medium">{health?.status || 'unknown'}</span></div>
              <div className="flex justify-between py-1"><span>Last check</span><span className="font-medium">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'never'}</span></div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <PostmarkBadge status={active ? 'queued' : backupStatus?.status === 'completed' ? 'healthy' : backupStatus?.status === 'failed' ? 'degraded' : 'offline'} size="sm" />
              <h3 className="text-sm font-semibold">Online Mongo backup</h3>
            </div>
            <div className="text-sm text-muted-ledger">
              <div className="flex justify-between py-1"><span>Worker</span><span className="font-medium capitalize">{backupStatus?.status || 'idle'}</span></div>
              <div className="flex justify-between py-1"><span>Last run</span><span className="font-medium">{backupStatus?.finishedAt ? new Date(backupStatus.finishedAt).toLocaleString() : 'never'}</span></div>
              {result && (
                <>
                  <div className="flex justify-between py-1"><span>Documents</span><span className="font-medium">{result.documentCount ?? 0}</span></div>
                  <div className="flex justify-between py-1"><span>Compressed</span><span className="font-medium">{((result.compressedBytes || 0) / (1024 * 1024)).toFixed(2)} MB</span></div>
                </>
              )}
              {backupStatus?.error && <p className="text-xs text-[var(--status-bounced)] mt-2">{backupStatus.error}</p>}
            </div>

            {active && (
              <div className="mt-3 space-y-1">
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
              local={backupStatus?.mongo?.local}
              onlineBackup={backupStatus?.mongo?.onlineBackup}
            />

            <button
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending || active}
              className="mt-3 btn-secondary w-full"
            >
              {active ? 'Backup running…' : 'Back up to online Mongo'}
            </button>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <PostmarkBadge status="healthy" size="sm" />
              <h3 className="text-sm font-semibold">Data ownership</h3>
            </div>
            <div className="text-sm text-muted-ledger space-y-1">
              <p>Primary: Auto-Mailer MongoDB (local or Render)</p>
              <p>Archive: compressed chunks in online backup DB</p>
              <p>CoreKnot data-hub / mail tracking: removed</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <PostmarkBadge status="healthy" size="sm" />
              <h3 className="text-sm font-semibold">Webhooks</h3>
            </div>
            <div className="text-sm text-muted-ledger">
              <div className="flex justify-between py-1"><span>Resend webhook</span><span className="font-medium">Active</span></div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
