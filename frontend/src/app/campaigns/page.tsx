'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import type { CampaignStatus } from '@/lib/types';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';

const STATUS_ACTIONS: Record<CampaignStatus, string[]> = {
  Draft: ['Dispatch'],
  Queued: ['Stop'],
  Sending: ['Stop'],
  Stopped: ['View'],
  Completed: ['View'],
  Failed: ['Retry'],
};

const FILTERS = ['all', 'Draft', 'Queued', 'Sending', 'Stopped', 'Completed', 'Failed'] as const;

type CampaignRow = {
  _id: string;
  title: string;
  subject?: string;
  status: CampaignStatus;
  stats?: { sent?: number; opened?: number; clicked?: number };
  metrics?: { totalSent?: number; opened?: number; clicked?: number };
  recipientCount?: number;
  recipients?: unknown[];
};

export default function CampaignsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => live.campaigns.list(),
    refetchInterval: 15_000,
  });

  const filtered = useMemo(() => {
    const list = (campaigns || []) as CampaignRow[];
    return statusFilter === 'all' ? list : list.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      if (action === 'Dispatch' || action === 'Retry') await live.campaigns.dispatch(id);
      else if (action === 'Stop') await live.campaigns.stop(id);
      await refetch();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const columns = useMemo<DataTableColumn<CampaignRow>[]>(() => [
    {
      header: 'Subject',
      sortKey: 'title',
      sortFn: (c) => c.title,
      render: (campaign) => {
        const isLegacy = !!campaign.stats;
        return (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${campaign._id}`); }} className="font-semibold hover:text-postmark text-left">{campaign.title}</button>
            <div className="text-xs text-muted-ledger">{campaign.subject || 'No subject'}{isLegacy ? ' · legacy' : ''}</div>
          </>
        );
      },
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (campaign) => <PostmarkBadge status={campaign.status} size="sm" />,
    },
    {
      header: 'Recipients',
      align: 'right',
      sortKey: 'recipients',
      sortFn: (c) => c.recipientCount || c.recipients?.length || 0,
      render: (c) => <span className="mono">{c.recipientCount || c.recipients?.length || 0}</span>,
    },
    {
      header: 'Sent',
      align: 'right',
      sortFn: (c) => c.metrics?.totalSent || c.stats?.sent || 0,
      render: (c) => <span className="mono">{c.metrics?.totalSent || c.stats?.sent || 0}</span>,
    },
    {
      header: 'Opened',
      align: 'right',
      sortFn: (c) => c.metrics?.opened || c.stats?.opened || 0,
      render: (c) => <span className="mono">{c.metrics?.opened || c.stats?.opened || 0}</span>,
    },
    {
      header: 'Clicked',
      align: 'right',
      sortFn: (c) => c.metrics?.clicked || c.stats?.clicked || 0,
      render: (c) => <span className="mono">{c.metrics?.clicked || c.stats?.clicked || 0}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (campaign) => {
        const isLegacy = !!campaign.stats;
        const status = campaign.status;
        const actions = STATUS_ACTIONS[status] || ['View'];
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${campaign._id}`); }} className="btn-secondary px-2 py-1 text-xs">View</button>
            {!isLegacy && actions.filter((a) => a !== 'View').map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => handleAction(campaign._id, action)}
                disabled={actionLoading === campaign._id}
                className={action === 'Dispatch' || action === 'Retry' ? 'btn-primary px-2 py-1 text-xs' : 'btn-secondary px-2 py-1 text-xs'}
              >
                {actionLoading === campaign._id ? '…' : action}
              </button>
            ))}
          </div>
        );
      },
    },
  ], [actionLoading]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-ledger">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={() => router.push('/campaigns/new')} className="btn-primary">New campaign</button>
      </div>

      <div className="flex flex-wrap gap-5 border-b" style={{ borderColor: 'var(--line)' }}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`pb-2 text-sm font-semibold transition-colors ${statusFilter === filter ? 'text-postmark border-b-2' : 'text-muted-ledger hover:text-postmark'}`}
            style={{ borderColor: statusFilter === filter ? 'var(--postmark)' : 'transparent' }}
          >
            {filter === 'all' ? 'All' : filter}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(c) => c._id}
        onRowClick={(c) => { router.push(`/campaigns/${c._id}`); }}
        isLoading={isLoading}
        defaultPageSize={25}
        emptyTitle="No campaigns found"
        emptyDescription={statusFilter !== 'all' ? 'Try another status filter.' : 'Create your first campaign.'}
      />
    </div>
  );
}
