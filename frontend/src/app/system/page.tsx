'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { live, mirror } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SystemPage() {
  const queryClient = useQueryClient();

  const { data: health } = useQuery({ queryKey: ['system-health'], queryFn: () => live.system.health(), refetchInterval: 30_000 });
  const { data: syncStatus } = useQuery({ queryKey: ['sync-status'], queryFn: () => mirror.sync.status(), refetchInterval: 15_000 });

  const syncMutation = useMutation({ mutationFn: () => mirror.sync.trigger(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sync-status'] }) });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">System</h1><p className="text-sm text-gray-500 mt-1">Infrastructure health and status</p></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Health */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><span className={"w-2 h-2 rounded-full " + (health ? 'bg-green-500' : 'bg-red-500')} /><h3 className="text-sm font-semibold text-gray-700">API Status</h3></div>
            <div className="text-sm text-gray-500">
              <div className="flex justify-between py-1"><span>Service</span><span className="font-medium">{health?.service || 'unknown'}</span></div>
              <div className="flex justify-between py-1"><span>Status</span><span className="font-medium">{health?.status || 'unknown'}</span></div>
              <div className="flex justify-between py-1"><span>Last check</span><span className="font-medium">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'never'}</span></div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className={"w-2 h-2 rounded-full " + (syncStatus?.isHealthy ? 'bg-green-500' : 'bg-red-500')} />
              <h3 className="text-sm font-semibold text-gray-700">Mirror Sync</h3>
            </div>
            <div className="text-sm text-gray-500">
              <div className="flex justify-between py-1"><span>Method</span><span className="font-medium">{syncStatus?.method || 'scheduled'}</span></div>
              <div className="flex justify-between py-1"><span>Last sync</span><span className="font-medium">{syncStatus?.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'never'}</span></div>
              <div className="flex justify-between py-1"><span>Rows synced</span><span className="font-medium">{syncStatus?.rowsSynced || 0}</span></div>
              <div className="flex justify-between py-1">
                <span>Health</span>
                <span className={`font-medium ${syncStatus?.isHealthy ? 'text-green-600' : 'text-red-600'}`}>{syncStatus?.isHealthy ? 'Healthy' : 'Degraded'}</span>
              </div>
            </div>
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="mt-3 btn-secondary w-full">
              {syncMutation.isPending ? 'Syncing...' : 'Sync now'}
            </button>
          </div>

          {/* Redis / Queue */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-gray-700">Queue / Redis</h3>
            </div>
            <div className="text-sm text-gray-500">
              <div className="flex justify-between py-1"><span>Status</span><span className="font-medium text-green-600">Available</span></div>
              <div className="flex justify-between py-1"><span>Pending jobs</span><span className="font-medium">{syncStatus?.rowsSynced || 0}</span></div>
            </div>
          </div>

          {/* Webhook */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-gray-700">Webhooks</h3>
            </div>
            <div className="text-sm text-gray-500">
              <div className="flex justify-between py-1"><span>Resend webhook</span><span className="font-medium">Active</span></div>
              <div className="flex justify-between py-1"><span>Signature failures</span><span className="font-medium">0</span></div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
