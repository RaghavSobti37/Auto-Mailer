'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QuotaBar } from '@/components/QuotaBar';
import { PostmarkBadge } from '@/components/PostmarkBadge';

export default function SenderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: profile, isLoading } = useQuery({ queryKey: ['sender', id], queryFn: () => live.senders.getById(id) });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <a href="/senders" className="text-sm font-semibold text-postmark">Back to senders</a>
        {isLoading ? <div className="py-12 text-center text-muted-ledger">Loading...</div> : !profile ? <div className="py-12 text-center text-muted-ledger">Sender not found</div> : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                <p className="mt-1 text-sm text-muted-ledger">{profile.email}</p>
              </div>
              <PostmarkBadge status={profile.rotationEnabled ? 'synced' : 'draft'} label={profile.rotationEnabled ? 'rotation' : 'static'} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold">Daily Usage</h3>
                <QuotaBar current={profile.sendStats?.today || 0} limit={profile.dailyLimit || 500} />
                <div className="mt-3 flex justify-between text-sm text-muted-ledger"><span>Total all-time</span><span className="mono font-medium">{profile.sendStats?.total || 0}</span></div>
              </div>
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold">Rotation</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-ledger">Enabled</span>
                  <PostmarkBadge status={profile.rotationEnabled ? 'synced' : 'draft'} label={profile.rotationEnabled ? 'Yes' : 'No'} size="sm" />
                </div>
              </div>
            </div>

            {profile.providerUsage && Object.keys(profile.providerUsage).length > 0 && (
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold">Provider Usage</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Object.entries(profile.providerUsage).map(([provider, usage]: [string, any]) => (
                    <div key={provider} className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
                      <div className="mb-2 text-xs font-semibold uppercase text-muted-ledger">{provider}</div>
                      <QuotaBar current={usage.today || 0} limit={profile.dailyLimit || 500} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
