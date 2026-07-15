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

function outcomeColor(outcome?: string) {
  const o = String(outcome || '').toLowerCase();
  if (o.includes('bounce') || o.includes('fail')) return 'var(--status-bounced)';
  if (o.includes('read') || o.includes('open')) return 'var(--status-read)';
  if (o.includes('click') || o.includes('repli')) return 'var(--status-pending)';
  if (o.includes('deliver') || o.includes('sent')) return 'var(--status-delivered)';
  return 'var(--ink-muted)';
}

export function ManifestLog({ entries = [] }: ManifestLogProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
  );

  if (!sorted.length) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-ledger">Manifest Log</h3>
        <p className="text-xs text-muted-ledger border border-[var(--line)] px-3 py-3">
          No activity recorded. A contact with 0 sent looks the same as silence until events land here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-ledger">Manifest Log</h3>
      <ol className="space-y-3">
        {sorted.map((entry, i) => {
          const color = outcomeColor(entry.outcome);
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
                  <span className="font-display text-[var(--ink-text)]">
                    {entry.campaignTitle || 'Campaign'}
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
                  {' · '}
                  <span style={{ color }}>{entry.outcome || 'unknown'}</span>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
