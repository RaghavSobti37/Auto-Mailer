'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { InkStamp, resolveStampTone } from '@/components/InkStamp';
import { ChannelFunnel } from '@/components/ChannelFunnel';
import { ManifestLog } from '@/components/ManifestLog';
import { TagBadges } from '@/components/table/TagBadges';
import type { Person } from '@/lib/types';

type ContactDrawerProps = {
  personId: string | null;
  onClose: () => void;
};

export function ContactDrawer({ personId, onClose }: ContactDrawerProps) {
  const router = useRouter();
  const open = Boolean(personId);

  const { data: person, isLoading, isError } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => live.audience.getById(personId!),
    enabled: open,
    staleTime: 60_000,
  });

  const handleOpenFullPage = () => {
    if (person?._id) {
      router.push(`/audience/${person._id}`);
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Contact detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <header className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
              <div>
                <p className="mono text-[10px] uppercase tracking-widest text-muted-ledger">Dispatch ledger</p>
                <h2 className="font-display text-xl leading-tight mt-0.5">Contact Manifest</h2>
              </div>
              <button type="button" className="btn-secondary text-xs px-2.5 py-1" onClick={onClose} aria-label="Close">
                Close
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {isLoading ? (
                <p className="py-12 text-center text-sm text-muted-ledger">Loading manifest…</p>
              ) : isError || !person ? (
                <p className="py-12 text-center text-sm text-muted-ledger">Person not found</p>
              ) : (
                <ContactBody person={person as Person & { tags?: string[]; emailStatus?: string; suppressionReason?: string }} />
              )}
            </div>

            {person && !isLoading && !isError && (
              <footer className="border-t px-5 py-3" style={{ borderColor: 'var(--line)' }}>
                <button
                  type="button"
                  onClick={handleOpenFullPage}
                  className="text-xs font-medium text-[var(--status-delivered)] hover:underline"
                >
                  Open full page →
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ContactBody({
  person,
}: {
  person: Person & { tags?: string[]; emailStatus?: string; suppressionReason?: string };
}) {
  const tone = resolveStampTone(person.emailStatus, person.suppressed, person.suppressionReason);
  const email = person.emailStats || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
  const wa = person.whatsappStats || {
    sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0,
  };

  return (
    <>
      <div className="flex items-start gap-4">
        <InkStamp status={tone} label={tone === 'active' ? 'Active' : undefined} />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-display text-2xl leading-tight truncate">{person.name || 'Unknown'}</h3>
          {person.email && (
            <p className="text-sm text-muted-ledger truncate mono">{person.email}</p>
          )}
          {(person.phone || person.normalizedPhone) && (
            <p className="mono text-xs text-muted-ledger">
              {person.phone || person.normalizedPhone}
            </p>
          )}
          <p className="text-xs text-muted-ledger">ID {String(person._id).slice(-8)}</p>
          <TagBadges tags={person.tags} max={8} />
        </div>
      </div>

      <ChannelFunnel
        title="Email"
        sent={email.sent || 0}
        steps={[
          { key: 'opened', label: 'Opened', value: email.opened || 0, color: 'var(--status-read)' },
          { key: 'clicked', label: 'Clicked', value: email.clicked || 0, color: 'var(--status-pending)' },
          { key: 'bounced', label: 'Bounced', value: email.bounced || 0, color: 'var(--status-bounced)' },
        ]}
      />

      <ChannelFunnel
        title="WhatsApp"
        sent={wa.sent || 0}
        steps={[
          { key: 'delivered', label: 'Delivered', value: wa.delivered || 0, color: 'var(--status-delivered)' },
          { key: 'read', label: 'Read', value: wa.read || 0, color: 'var(--status-read)' },
          { key: 'clicked', label: 'Clicked', value: wa.clicked || 0, color: 'var(--status-pending)' },
          { key: 'replied', label: 'Replied', value: wa.replied || 0, color: 'var(--status-delivered)' },
          { key: 'failed', label: 'Failed', value: wa.failed || 0, color: 'var(--status-bounced)' },
        ]}
      />

      <ManifestLog entries={person.campaignHistory} />
    </>
  );
}
