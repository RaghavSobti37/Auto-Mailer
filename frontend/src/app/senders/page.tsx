'use client';

import { useQuery } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { QuotaBar } from '@/components/QuotaBar';

export default function SendersPage() {
  const { data: senders, isLoading, error } = useQuery({
    queryKey: ['senders'],
    queryFn: () => live.senders.list(),
    staleTime: 30_000,
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">
              <span>Reach / Senders</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">Senders</h1>
            <p className="mt-1 text-sm text-muted-ledger">
              <span className="mono text-base font-medium text-[var(--ink-text)]">{senders?.length ?? '…'}</span> email profiles
            </p>
          </div>
          <a href="/senders/new" className="btn-primary">Add sender</a>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-ledger">Loading senders...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="font-semibold text-[var(--status-bounced)]">Failed to load senders</p>
            <p className="mt-1 text-xs text-muted-ledger">{(error as Error).message}</p>
          </div>
        ) : !senders?.length ? (
          <div className="py-12 text-center text-muted-ledger">No sender profiles configured</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {senders.map((profile: any) => {
              const dailyUsage = profile.sendStats?.today || 0;
              const dailyLimit = profile.dailyLimit || 500;
              return (
                <a
                  key={profile._id}
                  href={`/senders/${profile._id}`}
                  className="card block cursor-pointer transition-all hover:border-[var(--status-delivered)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-medium truncate">{profile.name}</h3>
                      <p className="mt-0.5 text-sm text-muted-ledger truncate">{profile.email}</p>
                    </div>
                    <PostmarkBadge
                      status={profile.rotationEnabled ? 'synced' : 'draft'}
                      label={profile.rotationEnabled ? 'R' : 'S'}
                      size="sm"
                    />
                  </div>
                  <QuotaBar current={dailyUsage} limit={dailyLimit} />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-ledger">
                    <span>Total sent</span>
                    <span className="mono font-medium">{profile.sendStats?.total || 0}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
