'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QuotaBar } from '@/components/QuotaBar';
import { PostmarkBadge } from '@/components/PostmarkBadge';

export default function SenderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['sender', id],
    queryFn: () => live.senders.getById(id),
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dailyLimit, setDailyLimit] = useState(500);
  const [rotationEnabled, setRotationEnabled] = useState(true);

  const updateMut = useMutation({
    mutationFn: () => live.senders.update(id, {
      name,
      email,
      dailyLimit,
      rotationEnabled,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender', id] });
      queryClient.invalidateQueries({ queryKey: ['senders'] });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => live.senders.delete(id),
    onSuccess: () => router.push('/senders'),
  });

  const handleDelete = () => {
    if (window.confirm('Delete this sender profile? This cannot be undone.')) {
      deleteMut.mutate();
    }
  };

  const startEditing = () => {
    setName(profile?.name || '');
    setEmail(profile?.email || '');
    setDailyLimit(profile?.dailyLimit || 500);
    setRotationEnabled(profile?.rotationEnabled !== false);
    setEditing(true);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Link href="/senders" className="text-sm font-semibold text-postmark">Back to senders</Link>
        {isLoading ? <div className="py-12 text-center text-muted-ledger">Loading...</div> : !profile ? <div className="py-12 text-center text-muted-ledger">Sender not found</div> : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                <p className="mt-1 text-sm text-muted-ledger">{profile.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <PostmarkBadge status={profile.rotationEnabled ? 'synced' : 'draft'} label={profile.rotationEnabled ? 'rotation' : 'static'} />
              </div>
            </div>

            {editing ? (
              <div className="card max-w-lg space-y-4">
                <h3 className="text-sm font-semibold">Edit sender</h3>
                <div>
                  <label className="label">Profile name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">From email</label>
                  <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Daily send limit</label>
                  <input className="input" type="number" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} min={1} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} />
                  Enable rotation
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateMut.mutate()}
                    disabled={updateMut.isPending || !name || !email}
                    className="btn-primary"
                  >
                    {updateMut.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                </div>
                {updateMut.error && <p className="text-xs text-[var(--status-bounced)]">{(updateMut.error as Error).message}</p>}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button type="button" onClick={startEditing} className="btn-secondary">Edit</button>
                  <button type="button" onClick={handleDelete} disabled={deleteMut.isPending} className="btn-secondary" style={{ color: 'var(--status-bounced)', borderColor: 'var(--status-bounced)' }}>
                    {deleteMut.isPending ? 'Deleting...' : 'Delete'}
                  </button>
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
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
