'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InkStamp, resolveStampTone } from '@/components/InkStamp';
import { ChannelFunnel } from '@/components/ChannelFunnel';
import { ManifestLog } from '@/components/ManifestLog';
import { TagBadges } from '@/components/table/TagBadges';
import type { Person } from '@/lib/types';

export default function ContactTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.personId as string;

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => live.audience.getById(personId),
  });

  const p = person as (Person & { tags?: string[]; emailStatus?: string; suppressionReason?: string }) | undefined;
  const tone = resolveStampTone(p?.emailStatus, p?.suppressed, p?.suppressionReason);
  const email = p?.emailStats || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
  const wa = p?.whatsappStats || {
    sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0,
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-3xl">
        <button type="button" onClick={() => router.push('/audience')} className="text-sm text-[var(--status-delivered)] hover:underline">
          ← Back to audience
        </button>

        {isLoading ? (
          <div className="text-center py-12 text-muted-ledger">Loading…</div>
        ) : !p ? (
          <div className="text-center py-12 text-muted-ledger">Person not found</div>
        ) : (
          <>
            <div className="flex items-start gap-5">
              <InkStamp status={tone} />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl tracking-tight">{p.name || 'Unknown'}</h1>
                <div className="mt-2 space-y-1 text-sm text-muted-ledger">
                  {p.email && <div>{p.email}</div>}
                  {(p.phone || p.normalizedPhone) && (
                    <div className="mono text-xs">{p.phone || p.normalizedPhone}</div>
                  )}
                  <div className="mono text-[10px]">ID {String(p._id)}</div>
                </div>
                <div className="mt-3">
                  <TagBadges tags={p.tags} max={12} />
                </div>
                {p.needsReview && (
                  <button
                    type="button"
                    onClick={() => router.push('/whatsapp/review')}
                    className="inline-block mt-3 mono text-[10px] uppercase tracking-wide px-2 py-1 border"
                    style={{ borderColor: 'var(--status-pending)', color: 'var(--status-pending)' }}
                  >
                    Needs review
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <ChannelFunnel
                  title="Email"
                  sent={email.sent || 0}
                  steps={[
                    { key: 'opened', label: 'Opened', value: email.opened || 0, color: 'var(--status-read)' },
                    { key: 'clicked', label: 'Clicked', value: email.clicked || 0, color: 'var(--status-pending)' },
                    { key: 'bounced', label: 'Bounced', value: email.bounced || 0, color: 'var(--status-bounced)' },
                  ]}
                />
              </div>
              <div className="card">
                <ChannelFunnel
                  title="WhatsApp"
                  sent={wa.sent || 0}
                  steps={[
                    { key: 'delivered', label: 'Delivered', value: wa.delivered || 0, color: 'var(--status-delivered)' },
                    { key: 'read', label: 'Read', value: wa.read || 0, color: 'var(--status-read)' },
                    { key: 'clicked', label: 'Clicked', value: wa.clicked || 0, color: 'var(--status-pending)' },
                    { key: 'replied', label: 'Replied', value: wa.replied || 0, color: 'var(--status-read)' },
                    { key: 'failed', label: 'Failed', value: wa.failed || 0, color: 'var(--status-bounced)' },
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <ManifestLog entries={p.campaignHistory} />
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
