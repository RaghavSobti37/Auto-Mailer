'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { live } from '@/lib/api';
import type { SortState } from '@/lib/columnSort';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ContactDrawer } from '@/components/ContactDrawer';
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
  lastActivityAt?: string;
};

const SERVER_SORT_KEYS: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  emailStatus: 'emailStatus',
  lastActivity: 'lastActivity',
};

const STAMP_CLASS: Record<string, string> = {
  bounced: 'stamp bounced',
  pending: 'stamp pending',
  active: 'stamp active',
  delivered: 'stamp active',
  subscribed: 'stamp active',
  unsubscribed: 'stamp pending',
};

const STAMP_LABEL: Record<string, string> = {
  bounced: 'Bounced',
  pending: 'Pending',
  active: 'Active',
  delivered: 'Delivered',
  subscribed: 'Subscribed',
  unsubscribed: 'Unsubscribed',
};

function statusStamp(p: AudiencePerson) {
  let key = 'active';
  if (p.suppressed) key = p.suppressionReason === 'bounced' ? 'bounced' : 'pending';
  else if (p.emailStatus) {
    const s = p.emailStatus.toLowerCase();
    if (s.includes('bounce')) key = 'bounced';
    else if (s.includes('unsub')) key = 'pending';
    else if (s.includes('subscrib')) key = 'active';
    else if (s.includes('active')) key = 'active';
    else key = 'pending';
  }
  return <span className={STAMP_CLASS[key] || 'stamp active'}>{STAMP_LABEL[key]}</span>;
}

export default function AudiencePage() {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [suppressed, setSuppressed] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortState, setSortState] = useState<SortState>({ key: 'lastActivity', direction: 'desc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortParam = sortState?.key ? SERVER_SORT_KEYS[sortState.key] : 'lastActivity';
  const orderParam = sortState?.direction || 'desc';

  // Debounce search with cleanup
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

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
    placeholderData: (prev) => prev,
  });

  const columns = useMemo<DataTableColumn<AudiencePerson>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      render: (p) => <span className="font-display text-base">{p.name || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortKey: 'email',
      render: (p) => <span className="mono text-muted-ledger text-sm">{p.email || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      sortKey: 'phone',
      render: (p) => <span className="mono text-muted-ledger text-sm">{p.phone || p.normalizedPhone || '—'}</span>,
    },
    {
      header: 'Tags',
      sortable: false,
      render: (p) => <TagBadges tags={p.tags} />,
    },
    {
      header: 'Status',
      sortKey: 'emailStatus',
      render: (p) => statusStamp(p),
    },
  ], []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSearchInput('');
    setTag('');
    setSuppressed('');
    setEmailStatus('');
    setPage(1);
  }, []);

  const hasFilters = search || tag || suppressed || emailStatus;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="eyebrow">
              <span>Reach / Dispatch Ledger</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">Audience</h1>
            <p className="text-sm text-muted-ledger mt-1">
              <span className="mono text-base font-medium text-[var(--ink-text)]">{audience?.total?.toLocaleString() ?? '…'}</span> contacts on file · pulled from hub view
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="pill">
              <span className="dot"></span> Online
            </div>
            <DataOpsToolbar compact />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 overflow-hidden rounded border" style={{ borderColor: 'var(--line)' }}>
          <input
            className="input !border-none !rounded-none flex-1 min-w-[180px]"
            placeholder="Search name, email, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select className="input !border-none !rounded-none !border-l w-auto flex-1" style={{ borderLeft: '1px solid var(--line)' }} value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }}>
            <option value="">All tags</option>
            {(tagData?.tags || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input !border-none !rounded-none !border-l w-auto" style={{ borderLeft: '1px solid var(--line)' }} value={suppressed} onChange={(e) => { setSuppressed(e.target.value); setPage(1); }}>
            <option value="">All suppression</option>
            <option value="false">Active only</option>
            <option value="true">Suppressed</option>
          </select>
          <select className="input !border-none !rounded-none !border-l w-auto" style={{ borderLeft: '1px solid var(--line)' }} value={emailStatus} onChange={(e) => { setEmailStatus(e.target.value); setPage(1); }}>
            <option value="">All email status</option>
            <option value="Subscribed">Subscribed</option>
            <option value="Unsubscribed">Unsubscribed</option>
            <option value="Bounced">Bounced</option>
          </select>
        </div>

        {hasFilters && (
          <button type="button" onClick={resetFilters} className="btn-secondary text-xs">
            Clear filters
          </button>
        )}

        <DataTable
          columns={columns}
          data={(audience?.items || []) as AudiencePerson[]}
          getRowId={(p) => String(p._id)}
          onRowClick={(p) => setSelectedId(String(p._id))}
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

        <ContactDrawer personId={selectedId} onClose={() => setSelectedId(null)} />
      </div>
    </ErrorBoundary>
  );
}
