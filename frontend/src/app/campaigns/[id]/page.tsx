'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryErrorDisplay } from '@/components/QueryErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { FlatMetricTile } from '@/components/FlatMetricTile';

const TABS = ['Compose', 'Recipients', 'Results'] as const;

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Results');

  const { data: campaign, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => live.campaigns.getById(id),
    refetchInterval: (query) => query.state.data?.status === 'Sending' ? 5000 : false,
  });

  const { data: analytics } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => live.campaigns.analytics(id),
  });

  const { data: recipients } = useQuery({
    queryKey: ['campaign-recipients', id],
    queryFn: () => live.campaigns.recipients(id, { limit: 100 }),
    enabled: tab === 'Recipients',
  });

  const dispatchMut = useMutation({
    mutationFn: () => live.campaigns.dispatch(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); },
  });
  const stopMut = useMutation({
    mutationFn: () => live.campaigns.stop(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); },
  });

  if (error) return <QueryErrorDisplay error={error} retry={() => refetch()} />;
  if (isLoading) return <div className="py-12 text-center text-muted-ledger">Loading campaign...</div>;
  if (!campaign) return <div className="py-12 text-center text-muted-ledger">Campaign not found</div>;

  const isLegacy = campaign && 'stats' in campaign;
  const isSending = campaign?.status === 'Sending';
  const isDraft = campaign?.status === 'Draft';
  const sent = campaign.metrics?.totalSent || campaign.stats?.sent || 0;
  const total = campaign.recipientCount || campaign.stats?.total || 0;
  const progress = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/campaigns" className="text-sm font-semibold text-postmark">Back to campaigns</a>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{campaign.title}</h1>
            {campaign.subject && <p className="mt-1 text-sm text-muted-ledger">{campaign.subject}</p>}
          </div>
          <div className="flex items-center gap-2">
            <PostmarkBadge status={campaign.status} pressed={dispatchMut.isPending} />
            {isLegacy && <PostmarkBadge status="draft" label="legacy" size="sm" />}
          </div>
        </div>

        <div className="flex flex-wrap gap-5 border-b" style={{ borderColor: 'var(--line)' }}>
          {TABS.map((nextTab) => (
            <button
              key={nextTab}
              onClick={() => setTab(nextTab)}
              className={`pb-2 text-sm font-semibold transition-colors ${tab === nextTab ? 'text-postmark border-b-2' : 'text-muted-ledger hover:text-postmark'}`}
              style={{ borderColor: tab === nextTab ? 'var(--postmark)' : 'transparent' }}
            >
              {nextTab}
            </button>
          ))}
        </div>

        {!isLegacy && (
          <div className="flex gap-3">
            {isDraft && <button onClick={() => dispatchMut.mutate()} disabled={dispatchMut.isPending} className="btn-primary">{dispatchMut.isPending ? 'Dispatching...' : 'Dispatch'}</button>}
            {isSending && <button onClick={() => stopMut.mutate()} disabled={stopMut.isPending} className="btn-secondary">{stopMut.isPending ? 'Stopping...' : 'Stop'}</button>}
          </div>
        )}

        {tab === 'Compose' && (
          <div className="grid gap-4 md:grid-cols-2">
            <FlatMetricTile label="Sender mode" value={campaign.senderMode || 'single'} />
            <FlatMetricTile label="Footer" value={campaign.removeUnsubscribe ? 'No unsubscribe' : 'Unsubscribe on'} />
            <div className="card md:col-span-2">
              <h2 className="mb-3 text-sm font-semibold">Saved content</h2>
              <iframe title="Campaign content" srcDoc={campaign.content || ''} className="h-[520px] w-full rounded-lg border bg-white" style={{ borderColor: 'var(--line)' }} />
            </div>
          </div>
        )}

        {tab === 'Recipients' && (
          <div className="ledger-shell">
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Opened</th>
                    <th>Clicked</th>
                    <th>Sent at</th>
                  </tr>
                </thead>
                <tbody>
                  {(recipients?.recipients || []).map((recipient: any) => (
                    <tr key={recipient._id || recipient.email}>
                      <td className="font-semibold">{recipient.email}</td>
                      <td><PostmarkBadge status={recipient.status} size="sm" /></td>
                      <td>{recipient.eventDetails?.opened ? <span className="text-postmark">●</span> : <span className="text-muted-ledger">○</span>}</td>
                      <td>{recipient.eventDetails?.clicked ? <span className="text-postmark">●</span> : <span className="text-muted-ledger">○</span>}</td>
                      <td className="mono text-xs">{recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Results' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <FlatMetricTile label="Sent" value={sent} />
              <FlatMetricTile label="Opened" value={campaign.metrics?.opened || campaign.stats?.opened || 0} />
              <FlatMetricTile label="Clicked" value={campaign.metrics?.clicked || campaign.stats?.clicked || 0} />
              <FlatMetricTile label="Bounced" value={campaign.metrics?.bounced || campaign.stats?.bounced || 0} />
            </div>

            <div className="card">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Send progress</span>
                <span className="mono text-muted-ledger">{sent} / {total} sent</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(23,35,46,0.12)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--postmark)' }} />
              </div>
            </div>

            {analytics?.timeSeries?.length > 0 && (
              <div className="ledger-shell">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th className="text-right">Opens</th>
                      <th className="text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.timeSeries.map((point: any) => (
                      <tr key={point.time}>
                        <td className="mono">{point.time}</td>
                        <td className="mono text-right">{point.opens}</td>
                        <td className="mono text-right">{point.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
