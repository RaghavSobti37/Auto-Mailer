'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { live, mirror } from '@/lib/api';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { QuotaGauge } from '@/components/QuotaGauge';

const STAT_CARDS = [
  { key: 'totalCampaigns', label: 'Total Campaigns', color: 'bg-blue-50 text-blue-700', icon: '✉' },
  { key: 'totalSent', label: 'Sent', color: 'bg-emerald-50 text-emerald-700', icon: '✓' },
  { key: 'totalOpened', label: 'Opened', color: 'bg-violet-50 text-violet-700', icon: '◉' },
  { key: 'totalClicked', label: 'Clicked', color: 'bg-amber-50 text-amber-700', icon: '↗' },
  { key: 'totalBounced', label: 'Bounced', color: 'bg-red-50 text-red-700', icon: '✕' },
];

export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['mail-stats'],
    queryFn: () => live.stats.get(),
    refetchInterval: 30_000,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => mirror.sync.status(),
    refetchInterval: 15_000,
  });

  const isDegraded = syncStatus && (!syncStatus.isHealthy || 
    (syncStatus.lastSyncAt && (Date.now() - new Date(syncStatus.lastSyncAt).getTime()) > 30 * 60 * 1000));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Org-wide email pulse — live from Atlas</p>
        </div>
        {syncStatus && (
          <SyncStatusChip
            lastSyncAt={syncStatus.lastSyncAt}
            stalenessMinutes={syncStatus.lastSyncAt 
              ? Math.floor((Date.now() - new Date(syncStatus.lastSyncAt).getTime()) / 60000) 
              : 0}
            isHealthy={syncStatus.isHealthy}
            compact
          />
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl p-4 border border-gray-200 ${card.color} bg-opacity-50`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? '...' : (stats as any)?.[card.key] ?? 0}
            </div>
            <div className="text-xs font-medium mt-1 opacity-70">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* System Health Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">System Health</h2>
          <a href="/system" className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
            View details →
          </a>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${syncStatus?.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600">Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">API</span>
          </div>
          {isDegraded && (
            <span className="text-xs text-amber-600 font-medium ml-auto">
              ⚠ Mirror may be stale — <a href="/system" className="underline">check system</a>
            </span>
          )}
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a href="/campaigns/new" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          New campaign
        </a>
        <a href="/whatsapp" className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          Import WhatsApp
        </a>
      </div>
    </div>
  );
}
