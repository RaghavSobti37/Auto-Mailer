'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';

export default function AudiencePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: audience, isLoading } = useQuery({
    queryKey: ['audience', page, search],
    queryFn: () => live.audience.list({ page, limit: pageSize, search: search || undefined }),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audience</h1>
            <p className="text-sm text-muted-ledger mt-1">Local MongoDB contacts — independent of CoreKnot</p>
          </div>
          <span className="text-xs text-muted-ledger">{audience?.total?.toLocaleString() ?? '…'} people</span>
        </div>

        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Search by email or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-ledger">Loading audience...</div>
        ) : !audience?.items?.length ? (
          <div className="text-center py-12 text-muted-ledger">No audience data yet. Run migration or import contacts.</div>
        ) : (
          <>
            <div className="ledger-shell">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="text-center">Suppressed</th>
                  </tr>
                </thead>
                <tbody>
                  {(audience.items || []).map((person: any) => (
                    <tr key={person._id}
                      className="cursor-pointer"
                      onClick={() => window.location.href = '/audience/' + person._id}
                    >
                      <td className="font-medium">{person.name || '-'}</td>
                      <td className="text-muted-ledger">{person.email || '-'}</td>
                      <td className="mono text-muted-ledger">{person.phone || person.normalizedPhone || '-'}</td>
                      <td className="text-center">
                        {person.suppressed ? (
                          <PostmarkBadge status="failed" label={person.suppressionReason || 'suppressed'} size="sm" />
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Page {page + 1} / {Math.max(1, Math.ceil((audience.total || 0) / pageSize))}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary text-xs">Previous</button>
                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= (audience.total || 0)} className="btn-secondary text-xs">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
