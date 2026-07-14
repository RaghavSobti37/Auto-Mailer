'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FlatMetricTile } from '@/components/FlatMetricTile';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';

type CampaignAnalyticsRow = {
  _id: string;
  title: string;
  subject?: string;
  status: string;
  metrics?: { totalSent?: number; opened?: number; clicked?: number };
  stats?: { sent?: number; opened?: number; clicked?: number };
};

export default function AnalyticsPage() {
  const { data: stats } = useQuery({ queryKey: ['mail-stats-mirror'], queryFn: () => live.stats.get(), refetchInterval: 60_000 });
  const { data: campaigns, isLoading } = useQuery({ queryKey: ['campaigns-mirror'], queryFn: () => live.campaigns.list() });

  const totalSent = stats?.totalSent || 0;
  const totalOpened = stats?.totalOpened || 0;
  const totalClicked = stats?.totalClicked || 0;
  const totalBounced = stats?.totalBounced || 0;

  const columns = useMemo<DataTableColumn<CampaignAnalyticsRow>[]>(() => [
    {
      header: 'Campaign',
      sortKey: 'title',
      render: (campaign) => (
        <>
          <a href={`/campaigns/${campaign._id}`} className="font-semibold hover:text-postmark" onClick={(e) => e.stopPropagation()}>{campaign.title}</a>
          {campaign.subject && <div className="text-xs text-muted-ledger">{campaign.subject}</div>}
        </>
      ),
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (c) => <PostmarkBadge status={c.status} size="sm" />,
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
      header: 'Open rate',
      align: 'right',
      sortFn: (c) => {
        const sent = c.metrics?.totalSent || c.stats?.sent || 0;
        const opened = c.metrics?.opened || c.stats?.opened || 0;
        return sent > 0 ? opened / sent : 0;
      },
      render: (c) => {
        const sent = c.metrics?.totalSent || c.stats?.sent || 0;
        const opened = c.metrics?.opened || c.stats?.opened || 0;
        return <span className="mono">{sent > 0 ? Math.round((opened / sent) * 100) : 0}%</span>;
      },
    },
    {
      header: 'Click rate',
      align: 'right',
      sortFn: (c) => {
        const sent = c.metrics?.totalSent || c.stats?.sent || 0;
        const clicked = c.metrics?.clicked || c.stats?.clicked || 0;
        return sent > 0 ? clicked / sent : 0;
      },
      render: (c) => {
        const sent = c.metrics?.totalSent || c.stats?.sent || 0;
        const clicked = c.metrics?.clicked || c.stats?.clicked || 0;
        return <span className="mono">{sent > 0 ? Math.round((clicked / sent) * 100) : 0}%</span>;
      },
    },
  ], []);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-ledger">Plain campaign tracking; no geo breakdown.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <FlatMetricTile label="Sent" value={totalSent} />
          <FlatMetricTile label="Opened" value={totalOpened} hint={`${totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0}%`} />
          <FlatMetricTile label="Clicked" value={totalClicked} hint={`${totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0}%`} />
          <FlatMetricTile label="Bounced" value={totalBounced} />
        </div>

        <DataTable
          columns={columns}
          data={(campaigns || []) as CampaignAnalyticsRow[]}
          getRowId={(c) => c._id}
          onRowClick={(c) => { window.location.href = `/campaigns/${c._id}`; }}
          isLoading={isLoading}
          defaultPageSize={25}
          emptyTitle="No campaign analytics yet"
        />
      </div>
    </ErrorBoundary>
  );
}
