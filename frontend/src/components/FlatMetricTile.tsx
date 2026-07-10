type FlatMetricTileProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function FlatMetricTile({ label, value, hint }: FlatMetricTileProps) {
  return (
    <div className="metric-tile">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
}
