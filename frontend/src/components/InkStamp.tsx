'use client';

type StampTone = 'pending' | 'active' | 'delivered' | 'bounced' | 'read';

type InkStampProps = {
  status?: string;
  label?: string;
  className?: string;
};

export function resolveStampTone(status?: string, suppressed?: boolean, suppressionReason?: string): StampTone {
  if (suppressed || suppressionReason === 'bounced' || /bounce/i.test(String(status || ''))) {
    return 'bounced';
  }
  const s = String(status || '').toLowerCase();
  if (s.includes('read') || s.includes('open')) return 'read';
  if (s.includes('unsub') || s.includes('pending') || s.includes('draft') || s.includes('queue')) {
    return 'pending';
  }
  if (s.includes('subscrib') || s.includes('active') || s.includes('deliver') || s.includes('complet')) {
    return 'active';
  }
  return suppressed ? 'bounced' : 'active';
}

const TONE_LABEL: Record<StampTone, string> = {
  pending: 'Pending',
  active: 'Active',
  delivered: 'Delivered',
  bounced: 'Bounced',
  read: 'Read',
};

export function InkStamp({ status, label, className = '' }: InkStampProps) {
  const tone = resolveStampTone(status);
  const text = label || TONE_LABEL[tone] || 'Active';
  return (
    <div className={`ink-stamp ink-stamp-${tone} ${className}`} aria-label={`Status: ${text}`}>
      <div className="ink-stamp-inner">
        <div>AM</div>
        <div className="mt-0.5">{text}</div>
      </div>
    </div>
  );
}
