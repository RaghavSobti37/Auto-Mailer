'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { mirror } from '@/lib/api';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AudiencePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: syncStatus } = useQuery({ queryKey: ['sync-status'], queryFn: () => mirror.sync.status(), refetchInterval: 15_000 });
  const { data: audience, isLoading } = useQuery({
    queryKey: ['audience', page, search],
    queryFn: () => mirror.audience.list({ page, limit: pageSize, search: search || undefined }),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audience</h1>
            <p className="text-sm text-gray-500 mt-1">Data Hub - mirror path</p>
          </div>
          {syncStatus && (
            <SyncStatusChip lastSyncAt={syncStatus.lastSyncAt}
              stalenessMinutes={syncStatus.lastSyncAt ? Math.floor((Date.now() - new Date(syncStatus.lastSyncAt).getTime()) / 60000) : 0}
              isHealthy={syncStatus.isHealthy} />
          )}
        </div>

        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Search by email or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading audience...</div>
        ) : !audience?.items?.length ? (
          <div className="text-center py-12 text-gray-400">No audience data found</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Suppressed</th>
                  </tr>
                </thead>
                <tbody>
                  {(audience.items || []).map((person: any, i: number) => (
                    <motion.tr key={person._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => window.location.href = '/audience/' + person._id}
                    >
                      <td className="px-4 py-3 font-medium">{person.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{person.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{person.phone || person.normalizedPhone || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {person.suppressed ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">{person.suppressionReason || 'suppressed'}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Page {page + 1} / {Math.ceil((audience.total || 0) / pageSize)}</span>
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
