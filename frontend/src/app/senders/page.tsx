'use client';

import { useQuery } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { QuotaBar } from '@/components/QuotaBar';

export default function SendersPage() {
  const { data: senders, isLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: () => live.senders.list(),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Senders</h1>
            <p className="mt-1 text-sm text-muted-ledger">{senders?.length || 0} email profiles</p>
          </div>
          <a href="/senders/new" className="btn-primary">Add sender</a>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-ledger">Loading senders...</div>
        ) : !senders?.length ? (
          <div className="py-12 text-center text-muted-ledger">No sender profiles configured</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {senders.map((profile: any) => {
              const dailyUsage = profile.sendStats?.today || 0;
              const dailyLimit = profile.dailyLimit || 500;
              return (
                <a key={profile._id} href={`/senders/${profile._id}`} className="card block cursor-pointer transition-colors hover:bg-white/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{profile.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-ledger">{profile.email}</p>
                    </div>
                    <PostmarkBadge status={profile.rotationEnabled ? 'synced' : 'draft'} label={profile.rotationEnabled ? 'rotation' : 'static'} size="sm" />
                  </div>
                  <QuotaBar current={dailyUsage} limit={dailyLimit} />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-ledger">
                    <span>Total sent</span>
                    <span className="mono">{profile.sendStats?.total || 0}</span>
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
