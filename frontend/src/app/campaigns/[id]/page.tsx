'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryErrorDisplay } from '@/components/QueryErrorBoundary';

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: campaign, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => live.campaigns.getById(id),
    refetchInterval: (query) => {
      const c = query.state.data;
      return c?.status === 'Sending' ? 5000 : false;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => live.campaigns.analytics(id),
  });

  const dispatchMut = useMutation({ mutationFn: () => live.campaigns.dispatch(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); } });
  const stopMut = useMutation({ mutationFn: () => live.campaigns.stop(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); } });

  const isLegacy = campaign && 'stats' in campaign;
  const isSending = campaign?.status === 'Sending';
  const isDraft = campaign?.status === 'Draft';

  if (error) return <QueryErrorDisplay error={error} retry={() => refetch()} />;
  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading campaign...</div>;
  if (!campaign) return <div className="text-center py-12 text-gray-400">Campaign not found</div>;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <a href="/campaigns" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to campaigns</a>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{campaign.title}</h1>
            {campaign.subject && <p className="text-sm text-gray-500 mt-1">{campaign.subject}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${campaign.status === 'Sending' ? 'bg-amber-100 text-amber-700 animate-pulse' : campaign.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : campaign.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{campaign.status}</span>
            {isLegacy && <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Legacy</span>}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Sent', value: campaign.metrics?.totalSent || campaign.stats?.sent || 0, color: 'text-emerald-600' },
            { label: 'Opened', value: campaign.metrics?.opened || campaign.stats?.opened || 0, color: 'text-blue-600' },
            { label: 'Clicked', value: campaign.metrics?.clicked || campaign.stats?.clicked || 0, color: 'text-violet-600' },
            { label: 'Bounced', value: campaign.metrics?.bounced || campaign.stats?.bounced || 0, color: 'text-red-600' },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card text-center">
              <div className={`text-2xl font-bold tabular-nums ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500 mt-1">{m.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        {!isLegacy && (
          <div className="flex gap-3">
            {isDraft && <button onClick={() => dispatchMut.mutate()} disabled={dispatchMut.isPending} className="btn-primary">{dispatchMut.isPending ? 'Dispatching...' : 'Dispatch'}</button>}
            {isSending && <button onClick={() => stopMut.mutate()} disabled={stopMut.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">{stopMut.isPending ? 'Stopping...' : 'Stop'}</button>}
          </div>
        )}

        {/* Time series chart */}
        {analytics?.timeSeries?.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Engagement Over Time</h3>
            <div className="h-48 flex items-end gap-1">
              {analytics.timeSeries.map((point: any, i: number) => {
                const maxOpens = Math.max(...analytics.timeSeries.map((t: any) => t.opens), 1);
                const maxClicks = Math.max(...analytics.timeSeries.map((t: any) => t.clicks), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${point.time}: ${point.opens} opens, ${point.clicks} clicks`}>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(point.clicks / maxClicks) * 100}%` }} className="w-full bg-violet-400 rounded-t" style={{ maxHeight: '100%' }} />
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(point.opens / maxOpens) * 100}%` }} className="w-full bg-blue-400 rounded-t" style={{ maxHeight: '100%' }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400" /> Opens</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-400" /> Clicks</span>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
