'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { FlatMetricTile } from '@/components/FlatMetricTile';
import { PostmarkBadge } from '@/components/PostmarkBadge';

const LINK_CLASS = 'text-xs font-semibold text-postmark';

const STAT_CARDS = [
  { key: 'totalCampaigns', label: 'Campaigns' },
  { key: 'totalSent', label: 'Sent' },
  { key: 'totalOpened', label: 'Opened' },
  { key: 'totalClicked', label: 'Clicked' },
  { key: 'totalBounced', label: 'Bounced' },
];

export default function OverviewPage() {
  const router = useRouter();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['mail-stats'],
    queryFn: () => live.stats.get(),
    refetchInterval: 30_000,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns-overview'],
    queryFn: () => live.campaigns.list(),
    refetchInterval: 30_000,
  });

  const { data: backupStatus } = useQuery({
    queryKey: ['backup-status'],
    queryFn: () => live.backup.status(),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'running' || s === 'queued' ? 1500 : 30_000;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-ledger">Dispatch ledger · local Mongo</p>
        </div>
        <button type="button" onClick={() => router.push('/settings')} className={LINK_CLASS}>
          Backup: {backupStatus?.status ?? '…'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <FlatMetricTile
            key={card.key}
            label={card.label}
            value={isLoading ? '...' : (stats as any)?.[card.key] ?? 0}
          />
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">System Health</h2>
          <button type="button" onClick={() => router.push('/system')} className={LINK_CLASS}>View details</button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <PostmarkBadge status="healthy" size="sm" />
            <span className="text-muted-ledger">API</span>
          </div>
          <div className="flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center gap-2">
              <PostmarkBadge
                status={backupStatus?.status === 'running' || backupStatus?.status === 'queued' ? 'queued' : 'synced'}
                size="sm"
              />
              <span className="text-muted-ledger">
                Online backup
                {(backupStatus?.status === 'running' || backupStatus?.status === 'queued') && (
                  <span className="mono text-[10px] ml-1">{backupStatus.progress?.percent ?? 0}%</span>
                )}
              </span>
            </div>
            {(backupStatus?.status === 'running' || backupStatus?.status === 'queued') && (
              <div className="quota-bar">
                <div
                  className="quota-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, backupStatus.progress?.percent ?? 4))}%`,
                    background: 'var(--status-pending)',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ledger-shell">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-sm font-semibold">Recent Dispatches</h2>
          <button type="button" onClick={() => router.push('/campaigns')} className={LINK_CLASS}>All campaigns</button>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="text-right">Sent</th>
                <th className="text-right">Opened</th>
                <th className="text-right">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns || []).slice(0, 6).map((campaign: any) => (
                <tr key={campaign._id} className="cursor-pointer" onClick={() => router.push(`/campaigns/${campaign._id}`)}>
                  <td>
                    <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${campaign._id}`); }} className="font-semibold hover:text-postmark text-left">{campaign.title}</button>
                    {campaign.subject && <div className="text-xs text-muted-ledger">{campaign.subject}</div>}
                  </td>
                  <td><PostmarkBadge status={campaign.status} size="sm" /></td>
                  <td className="mono text-right">{campaign.metrics?.totalSent || campaign.stats?.sent || 0}</td>
                  <td className="mono text-right">{campaign.metrics?.opened || campaign.stats?.opened || 0}</td>
                  <td className="mono text-right">{campaign.metrics?.clicked || campaign.stats?.clicked || 0}</td>
                </tr>
              ))}
              {!campaigns?.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-ledger">No dispatches yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push('/campaigns/new')} className="btn-primary">New campaign</button>
        <button type="button" onClick={() => router.push('/whatsapp')} className="btn-secondary">Import WhatsApp</button>
      </div>
    </div>
  );
}
