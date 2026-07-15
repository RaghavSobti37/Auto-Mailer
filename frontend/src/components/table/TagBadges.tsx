'use client';

type TagBadgesProps = {
  tags?: string[];
  max?: number;
  className?: string;
};

export function TagBadges({ tags = [], max = 3, className = '' }: TagBadgesProps) {
  if (!tags.length) return <span className="text-muted-ledger text-xs">—</span>;

  const visible = tags.slice(0, max);
  const rest = tags.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
        </span>
      ))}
      {rest > 0 && (
        <span className="mono text-[10px] text-muted-ledger">+{rest}</span>
      )}
    </div>
  );
}
