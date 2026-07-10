'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import type { Campaign, CampaignStatus } from '@/lib/types';

const STATUS_COLORS: Record<CampaignStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Queued: 'bg-blue-100 text-blue-700',
  Sending: 'bg-amber-100 text-amber-700 animate-pulse',
  Stopped: 'bg-orange-100 text-orange-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
};

const STATUS_ACTIONS: Record<CampaignStatus, string[]> = {
  Draft: ['Edit', 'Dispatch'],
  Queued: ['View', 'Stop'],
  Sending: ['Stop'],
  Stopped: ['View', 'Duplicate'],
  Completed: ['View', 'Duplicate'],
  Failed: ['View', 'Retry'],
};

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
    : (campaigns || []).filter((c: any) => c.status === statusFilter);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      if (action === 'Dispatch') await live.campaigns.dispatch(id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/campaigns/new" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          New campaign
        </a>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'Draft', 'Queued', 'Sending', 'Stopped', 'Completed', 'Failed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No campaigns found</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Recipients</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Sent</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Opened</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign: any, i: number) => {
                const isLegacy = !!campaign.stats;
                const status = campaign.status as CampaignStatus;
                const actions = STATUS_ACTIONS[status] || ['View'];
                return (
                  <motion.tr
                    key={campaign._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`/campaigns/${campaign._id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                          {campaign.title}
                        </a>
                        {isLegacy && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
                            Legacy
                          </span>
                        )}
                      </div>
                      {campaign.subject && (
                        <div className="text-xs text-gray-400 mt-0.5">{campaign.subject}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{campaign.recipientCount || campaign.recipients?.length || 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{campaign.metrics?.totalSent || campaign.stats?.sent || 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{campaign.metrics?.opened || campaign.stats?.opened || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {!isLegacy && actions.filter(a => a !== 'Edit').map((action) => (
                          action === 'Dispatch' || action === 'Stop' ? (
                            <button
                              key={action}
                              onClick={() => handleAction(campaign._id, action)}
                              disabled={actionLoading === campaign._id}
                              className="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === campaign._id ? '...' : action}
                            </button>
                          ) : (
                            <a
                              key={action}
                              href={`/campaigns/${campaign._id}`}
                              className="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              View
                            </a>
                          )
                        ))}
                        {isLegacy && (
                          <a href={`/campaigns/${campaign._id}`} className="px-2 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                            View
                          </a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
