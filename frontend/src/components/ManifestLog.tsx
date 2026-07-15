'use client';

import { motion } from 'framer-motion';

export type ManifestEntry = {
  campaignId?: string;
  campaignTitle?: string;
  channel?: 'email' | 'whatsapp' | string;
  outcome?: string;
  timestamp?: string;
};

type ManifestLogProps = {
  entries?: ManifestEntry[];
};

const OUTCOME_COLORS: Record<string, string> = {
  delivered: 'var(--status-delivered)',
  read: 'var(--status-read)',
  clicked: 'var(--status-pending)',
  replied: 'var(--status-delivered)',
  failed: 'var(--status-bounced)',
  added: 'var(--ink-muted)',
};

const OUTCOME_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  read: 'Read',
  clicked: 'Clicked',
  replied: 'Replied',
  failed: 'Failed',
  added: 'Added',
};

function simplifyOutcome(outcome?: string): string {
  const o = String(outcome || '').toLowerCase();
  if (o.includes('bounce') || o.includes('fail') || o.includes('invalid') || o.includes('error')) return 'failed';
  if (o.includes('read') || o.includes('open')) return 'read';
  if (o.includes('click')) return 'clicked';
  if (o.includes('repli')) return 'replied';
  if (o.includes('deliver') || o.includes('sent')) return 'delivered';
  if (o.includes('add') || o.includes('import') || o.includes('csv') || o.includes('batch')) return 'added';
  return outcome || 'unknown';
}

export function ManifestLog({ entries = [] }: ManifestLogProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
  );

  if (!sorted.length) {
    return (
      <section className="space-y-2">
        <h3 className="mono text-[10px] font-semibold uppercase tracking-widest text-muted-ledger">Manifest Log</h3>
        <p className="text-xs text-muted-ledger border border-[var(--line)] px-3 py-3">
          No activity recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="mono text-[10px] font-semibold uppercase tracking-widest text-muted-ledger">Manifest Log</h3>
      <ol className="space-y-3">
        {sorted.map((entry, i) => {
          const outcome = simplifyOutcome(entry.outcome);
          const color = OUTCOME_COLORS[outcome] || 'var(--ink-muted)';
          const label = OUTCOME_LABELS[outcome] || outcome;
          return (
            <motion.li
              key={`${entry.campaignId || 'x'}-${entry.timestamp || i}-${i}`}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="manifest-rail relative text-sm"
              style={{ color }}
            >
              <span className="manifest-dot" />
              <div className="pl-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display capitalize text-[var(--ink-text)] font-medium">
                    {label}
                  </span>
                  <time className="mono shrink-0 text-[10px] text-muted-ledger">
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </time>
                </div>
                <div className="mt-0.5 mono text-[11px] text-muted-ledger">
                  <span className="uppercase">{entry.channel || 'email'}</span>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
