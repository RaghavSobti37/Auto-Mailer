type QuotaBarProps = {
  current: number;
  limit: number;
};

export function QuotaBar({ current, limit }: QuotaBarProps) {
  const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
  const pct = Math.round(ratio * 100);
  const tone = ratio >= 0.95 ? 'quota-fill-void' : ratio >= 0.8 ? 'quota-fill-manila' : 'quota-fill-slate';

  return (
    <div className="quota-bar-wrap">
      <div className="quota-bar">
        <div className={`quota-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="quota-label">{current}/{limit}</div>
    </div>
  );
}
