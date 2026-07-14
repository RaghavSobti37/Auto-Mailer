'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { live } from '@/lib/api';
import type { SortState } from '@/lib/columnSort';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { DataOpsToolbar } from '@/components/DataOpsToolbar';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';
import { TagBadges } from '@/components/table/TagBadges';

type AudiencePerson = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  normalizedPhone?: string;
  tags?: string[];
  emailStatus?: string;
  suppressed?: boolean;
  suppressionReason?: string;
};

const SERVER_SORT_KEYS: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  emailStatus: 'emailStatus',
  lastActivity: 'lastActivity',
};

export default function AudiencePage() {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [suppressed, setSuppressed] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortState, setSortState] = useState<SortState>({ key: 'lastActivity', direction: 'desc' });

  const sortParam = sortState?.key ? SERVER_SORT_KEYS[sortState.key] : 'lastActivity';
  const orderParam = sortState?.direction || 'desc';

  const { data: tagData } = useQuery({
    queryKey: ['audience-tags'],
    queryFn: () => live.audience.tags(),
    staleTime: 60_000,
  });

  const { data: audience, isLoading } = useQuery({
    queryKey: ['audience', page, pageSize, search, tag, suppressed, emailStatus, sortParam, orderParam],
    queryFn: () => live.audience.list({
      page,
      limit: pageSize,
      search: search || undefined,
      tag: tag || undefined,
      suppressed: suppressed || undefined,
      emailStatus: emailStatus || undefined,
      sort: sortParam,
      order: orderParam,
    }),
  });

  const columns = useMemo<DataTableColumn<AudiencePerson>[]>(() => [
    { key: 'name', header: 'Name', sortKey: 'name', render: (p) => <span className="font-medium">{p.name || '-'}</span> },
    { key: 'email', header: 'Email', sortKey: 'email', render: (p) => <span className="text-muted-ledger">{p.email || '-'}</span> },
    {
      key: 'phone',
      header: 'Phone',
      sortKey: 'phone',
      render: (p) => <span className="mono text-muted-ledger">{p.phone || p.normalizedPhone || '-'}</span>,
    },
    {
      header: 'Tags',
      sortable: false,
      render: (p) => <TagBadges tags={p.tags} />,
    },
    {
      header: 'Email status',
      sortKey: 'emailStatus',
      render: (p) => (p.emailStatus ? <span className="text-xs capitalize">{p.emailStatus}</span> : <span className="text-gray-300">-</span>),
    },
    {
      header: 'Suppressed',
      align: 'center',
      sortable: false,
      render: (p) => (p.suppressed
        ? <PostmarkBadge status="failed" label={p.suppressionReason || 'suppressed'} size="sm" />
        : <span className="text-gray-300">-</span>),
    },
  ], []);

  const resetFilters = () => {
    setSearch('');
    setTag('');
    setSuppressed('');
    setEmailStatus('');
    setPage(1);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audience</h1>
            <p className="text-sm text-muted-ledger mt-1">
              {audience?.total?.toLocaleString() ?? '…'} contacts from hub view
            </p>
          </div>
          <DataOpsToolbar compact />
        </div>

        <DataOpsToolbar />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="input lg:col-span-2"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="input" value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }}>
            <option value="">All tags</option>
            {(tagData?.tags || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={suppressed} onChange={(e) => { setSuppressed(e.target.value); setPage(1); }}>
            <option value="">All suppression</option>
            <option value="false">Active only</option>
            <option value="true">Suppressed</option>
          </select>
          <select className="input" value={emailStatus} onChange={(e) => { setEmailStatus(e.target.value); setPage(1); }}>
            <option value="">All email status</option>
            <option value="Subscribed">Subscribed</option>
            <option value="Unsubscribed">Unsubscribed</option>
            <option value="Bounced">Bounced</option>
          </select>
        </div>

        {(search || tag || suppressed || emailStatus) && (
          <button type="button" onClick={resetFilters} className="btn-secondary text-xs">
            Clear filters
          </button>
        )}

        <DataTable
          columns={columns}
          data={(audience?.items || []) as AudiencePerson[]}
          getRowId={(p) => String(p._id)}
          onRowClick={(p) => { window.location.href = `/audience/${p._id}`; }}
          serverSide
          paginated
          isLoading={isLoading}
          currentPage={page}
          pageSize={pageSize}
          totalItems={audience?.total || 0}
          totalPages={audience?.totalPages || 1}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          sortState={sortState}
          onSortChange={(next) => {
            if (next?.key && !SERVER_SORT_KEYS[next.key]) return;
            setSortState(next);
            setPage(1);
          }}
          emptyTitle="No audience matches"
          emptyDescription="Try clearing filters or run migration/import."
        />
      </div>
    </ErrorBoundary>
  );
}
