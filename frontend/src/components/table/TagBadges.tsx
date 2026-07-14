'use client';

type TagBadgesProps = {
  tags?: string[];
  max?: number;
  className?: string;
};

export function TagBadges({ tags = [], max = 3, className = '' }: TagBadgesProps) {
  if (!tags.length) return <span className="text-gray-300">-</span>;

  const visible = tags.slice(0, max);
  const rest = tags.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: 'rgba(179, 58, 46, 0.08)', color: 'var(--postmark)' }}
        >
          {tag}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[10px] text-muted-ledger">+{rest}</span>
      )}
    </div>
  );
}
