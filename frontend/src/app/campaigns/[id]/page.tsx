'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryErrorDisplay } from '@/components/QueryErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { FlatMetricTile } from '@/components/FlatMetricTile';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';

const TABS = ['Compose', 'Recipients', 'Results'] as const;
type FilterStatus = 'all' | 'sent' | 'opened' | 'clicked' | 'bounced';

function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  // Strip full-document wrapper tags so the content renders cleanly in an iframe
  return html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .trim();
}

const PAGE_SIZE = 25;

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Results');
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientStatus, setRecipientStatus] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<FilterStatus>('all');
  const [resultPage, setResultPage] = useState(1);

  const { data: campaign, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => live.campaigns.getById(id),
    refetchInterval: (query) => query.state.data?.status === 'Sending' ? 5000 : false,
  });

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['campaign-recipients', id, recipientPage, recipientStatus],
    queryFn: () => live.campaigns.recipients(id, {
      page: recipientPage,
      limit: PAGE_SIZE,
      status: recipientStatus !== 'all' ? recipientStatus : undefined,
    }),
    enabled: tab === 'Recipients',
  });

  // Separate query for Results tab so it works independently with its own filter
  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['campaign-results', id, resultPage, resultFilter],
    queryFn: () => live.campaigns.recipients(id, {
      page: resultPage,
      limit: PAGE_SIZE,
      status: resultFilter !== 'all' ? resultFilter.charAt(0).toUpperCase() + resultFilter.slice(1) : undefined,
    }),
    enabled: tab === 'Results',
  });

  const dispatchMut = useMutation({
    mutationFn: () => live.campaigns.dispatch(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); },
  });
  const stopMut = useMutation({
    mutationFn: () => live.campaigns.stop(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); refetch(); },
  });

  const deleteMut = useMutation({
    mutationFn: () => live.campaigns.delete(id),
    onSuccess: () => { router.push('/campaigns'); },
  });

  const handleDelete = () => {
    if (window.confirm('Delete this campaign and all its tracking data? This cannot be undone.')) {
      deleteMut.mutate();
    }
  };

  if (error) return <QueryErrorDisplay error={error} retry={() => refetch()} />;
  if (isLoading) return <div className="py-12 text-center text-muted-ledger">Loading campaign...</div>;
  if (!campaign) return <div className="py-12 text-center text-muted-ledger">Campaign not found</div>;

  const isLegacy = campaign && 'stats' in campaign;
  const isSending = campaign?.status === 'Sending';
  const isDraft = campaign?.status === 'Draft';
  const sent = campaign.metrics?.totalSent || campaign.stats?.sent || 0;
  const opened = campaign.metrics?.opened || campaign.stats?.opened || 0;
  const clicked = campaign.metrics?.clicked || campaign.stats?.clicked || 0;
  const bounced = campaign.metrics?.bounced || campaign.stats?.bounced || 0;
  const total = campaign.recipientCount || campaign.stats?.total || 0;
  const progress = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

  const statusFilterOptions = ['all', 'Sent', 'Opened', 'Clicked', 'Bounced', 'Failed', 'Pending'];
  const isCampaignContent = Boolean(campaign.content);

  const recipientsColumns = useMemo<DataTableColumn<any>[]>(() => [
    {
      header: 'Email',
      sortKey: 'email',
      render: (r) => <span className="font-semibold">{r.email}</span>,
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (r) => <PostmarkBadge status={r.status} size="sm" />,
    },
    {
      header: 'Opened',
      render: (r) => <span className="mono">{r.eventDetails?.opened ? '● Yes' : '○ No'}</span>,
    },
    {
      header: 'Clicked',
      render: (r) => <span className="mono">{r.eventDetails?.clicked ? '● Yes' : '○ No'}</span>,
    },
    {
      header: 'Sent at',
      sortKey: 'sentAt',
      sortFn: (r) => r.sentAt ? new Date(r.sentAt).getTime() : 0,
      render: (r) => <span className="mono text-xs">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</span>,
    },
  ], []);

  // Clicking a metric card filters the Results table inline (stays on Results tab)
  const handleCardClick = (filter: FilterStatus) => {
    setResultFilter(resultFilter === filter ? 'all' : filter);
    setResultPage(1);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => router.push('/campaigns')} className="text-sm font-semibold text-postmark">← Back to campaigns</button>
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
            {!isSending && !isDraft && (
              <button onClick={handleDelete} disabled={deleteMut.isPending} className="btn-secondary" style={{ color: 'var(--status-bounced)', borderColor: 'var(--status-bounced)' }}>{deleteMut.isPending ? 'Deleting...' : 'Delete'}</button>
            )}
          </div>
        )}

        {tab === 'Compose' && (
          <div className="grid gap-4 md:grid-cols-2">
            <FlatMetricTile label="Sender mode" value={campaign.senderMode || 'single'} />
            <FlatMetricTile label="Footer" value={campaign.removeUnsubscribe ? 'No unsubscribe' : 'Unsubscribe on'} />
            {isCampaignContent && (
              <div className="card md:col-span-2">
                <h2 className="mb-3 text-sm font-semibold">Saved content</h2>
                <iframe
                  title="Campaign content"
                  srcDoc={sanitizeEmailHtml(campaign.content)}
                  className="h-[520px] w-full rounded-lg border bg-white"
                  style={{ borderColor: 'var(--line)' }}
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        )}

        {tab === 'Recipients' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase text-muted-ledger">Filter:</span>
              <select
                className="input w-auto"
                value={recipientStatus}
                onChange={(e) => { setRecipientStatus(e.target.value); setRecipientPage(1); }}
              >
                {statusFilterOptions.map((s) => (
                  <option key={s} value={s === 'all' ? 'all' : s}>
                    {s === 'all' ? 'All statuses' : s}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-ledger mono">
                {recipientsData?.pagination?.total ?? 0} total
              </span>
            </div>
            <DataTable
              columns={recipientsColumns}
              data={(recipientsData?.recipients || []) as any[]}
              getRowId={(r) => r._id || r.email}
              serverSide
              paginated
              isLoading={recipientsLoading}
              currentPage={recipientPage}
              pageSize={PAGE_SIZE}
              totalItems={recipientsData?.pagination?.total || 0}
              totalPages={recipientsData?.pagination?.totalPages || 1}
              onPageChange={setRecipientPage}
              onPageSizeChange={() => { setRecipientPage(1); }}
              emptyTitle="No recipients found"
              emptyDescription={recipientStatus !== 'all' ? 'No recipients match this status.' : 'This campaign has no recipients.'}
            />
          </div>
        )}

        {tab === 'Results' && (
          <div className="space-y-5">
            {/* Clickable metric cards — clicking stays on Results and filters the table below */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <button
                type="button"
                onClick={() => handleCardClick('sent')}
                className={`text-left transition-all ${resultFilter === 'sent' ? 'ring-2 ring-postmark ring-offset-2' : 'hover:opacity-80'}`}
              >
                <FlatMetricTile label="Sent" value={sent} />
              </button>
              <button
                type="button"
                onClick={() => handleCardClick('opened')}
                className={`text-left transition-all ${resultFilter === 'opened' ? 'ring-2 ring-postmark ring-offset-2' : 'hover:opacity-80'}`}
              >
                <FlatMetricTile label="Opened" value={opened} hint={sent > 0 ? `${Math.round((opened / sent) * 100)}%` : undefined} />
              </button>
              <button
                type="button"
                onClick={() => handleCardClick('clicked')}
                className={`text-left transition-all ${resultFilter === 'clicked' ? 'ring-2 ring-postmark ring-offset-2' : 'hover:opacity-80'}`}
              >
                <FlatMetricTile label="Clicked" value={clicked} hint={sent > 0 ? `${Math.round((clicked / sent) * 100)}%` : undefined} />
              </button>
              <button
                type="button"
                onClick={() => handleCardClick('bounced')}
                className={`text-left transition-all ${resultFilter === 'bounced' ? 'ring-2 ring-postmark ring-offset-2' : 'hover:opacity-80'}`}
              >
                <FlatMetricTile label="Bounced" value={bounced} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="card">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Send progress</span>
                <span className="mono text-muted-ledger">{sent} / {total} sent</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(23,35,46,0.12)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--postmark)' }} />
              </div>
            </div>

            {/* People table — filtered by card clicks, stays on this page */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                {resultFilter === 'all' ? 'All recipients' : `${resultFilter.charAt(0).toUpperCase() + resultFilter.slice(1)} recipients`}
                {resultFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCardClick('all')}
                    className="ml-2 text-xs text-postmark font-semibold hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </h3>
              <DataTable
                columns={recipientsColumns}
                data={(resultsData?.recipients || []) as any[]}
                getRowId={(r) => r._id || r.email}
                serverSide
                paginated
                isLoading={resultsLoading}
                currentPage={resultPage}
                pageSize={PAGE_SIZE}
                totalItems={resultsData?.pagination?.total || 0}
                totalPages={resultsData?.pagination?.totalPages || 1}
                onPageChange={setResultPage}
                onPageSizeChange={() => { setResultPage(1); }}
                emptyTitle="No results yet"
                emptyDescription="No recipients match this filter."
              />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
