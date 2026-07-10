'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { live } from '@/lib/api';
import type { CampaignStatus } from '@/lib/types';
import { PostmarkBadge } from '@/components/PostmarkBadge';

const STATUS_ACTIONS: Record<CampaignStatus, string[]> = {
  Draft: ['Dispatch'],
  Queued: ['Stop'],
  Sending: ['Stop'],
  Stopped: ['View'],
  Completed: ['View'],
  Failed: ['Retry'],
};

const FILTERS = ['all', 'Draft', 'Queued', 'Sending', 'Stopped', 'Completed', 'Failed'] as const;

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => live.campaigns.list(),
    refetchInterval: 15_000,
  });

  const filtered = statusFilter === 'all'
    ? (campaigns || [])
    : (campaigns || []).filter((campaign: any) => campaign.status === statusFilter);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-ledger">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/campaigns/new" className="btn-primary">New campaign</a>
      </div>

      <div className="flex flex-wrap gap-5 border-b" style={{ borderColor: 'var(--line)' }}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`pb-2 text-sm font-semibold transition-colors ${statusFilter === filter ? 'text-postmark border-b-2' : 'text-muted-ledger hover:text-postmark'}`}
            style={{ borderColor: statusFilter === filter ? 'var(--postmark)' : 'transparent' }}
          >
            {filter === 'all' ? 'All' : filter}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-ledger">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-ledger">No campaigns found</div>
      ) : (
        <div className="ledger-shell">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Postmark</th>
                  <th className="text-right">Recipients</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Opened</th>
                  <th className="text-right">Clicked</th>
                  <th className="text-right">Last action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign: any) => {
                  const isLegacy = !!campaign.stats;
                  const status = campaign.status as CampaignStatus;
                  const actions = STATUS_ACTIONS[status] || ['View'];
                  return (
                    <tr key={campaign._id}>
                      <td>
                        <a href={`/campaigns/${campaign._id}`} className="font-semibold hover:text-postmark">{campaign.title}</a>
                        <div className="text-xs text-muted-ledger">{campaign.subject || 'No subject'}{isLegacy ? ' · legacy' : ''}</div>
                      </td>
                      <td><PostmarkBadge status={status} size="sm" /></td>
                      <td className="mono text-right">{campaign.recipientCount || campaign.recipients?.length || 0}</td>
                      <td className="mono text-right">{campaign.metrics?.totalSent || campaign.stats?.sent || 0}</td>
                      <td className="mono text-right">{campaign.metrics?.opened || campaign.stats?.opened || 0}</td>
                      <td className="mono text-right">{campaign.metrics?.clicked || campaign.stats?.clicked || 0}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <a href={`/campaigns/${campaign._id}`} className="btn-secondary px-2 py-1 text-xs">View</a>
                          {!isLegacy && actions.filter((action) => action !== 'View').map((action) => (
                            <button
                              key={action}
                              onClick={() => handleAction(campaign._id, action)}
                              disabled={actionLoading === campaign._id}
                              className={action === 'Dispatch' || action === 'Retry' ? 'btn-primary px-2 py-1 text-xs' : 'btn-secondary px-2 py-1 text-xs'}
                            >
                              {actionLoading === campaign._id ? '...' : action}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
