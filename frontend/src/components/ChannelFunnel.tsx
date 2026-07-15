'use client';

type FunnelStep = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type ChannelFunnelProps = {
  title: string;
  sent: number;
  steps: FunnelStep[];
};

function pct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export function ChannelFunnel({ title, sent, steps }: ChannelFunnelProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-ledger">{title}</h3>
        <span className="mono text-xs text-muted-ledger">
          <span className="font-display text-lg text-[var(--ink-text)]">{sent}</span> sent
        </span>
      </div>

      {sent === 0 ? (
        <p className="text-xs text-muted-ledger border border-[var(--line)] px-3 py-2">
          No dispatches yet — funnel empty until first send.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {steps.map((step) => {
            const rate = pct(step.value, sent);
            return (
              <li key={step.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-ledger">{step.label}</span>
                  <span className="mono">
                    {step.value}
                    <span className="text-muted-ledger"> · {rate}%</span>
                  </span>
                </div>
                <div className="funnel-track" role="presentation">
                  <div
                    className="funnel-fill"
                    style={{ width: `${rate}%`, background: step.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
