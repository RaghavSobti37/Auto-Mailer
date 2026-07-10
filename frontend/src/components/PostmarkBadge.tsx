'use client';

type PostmarkBadgeProps = {
  status?: string;
  label?: string;
  pressed?: boolean;
  size?: 'sm' | 'md';
};

function normalizeStatus(status?: string) {
  return String(status || 'Draft').toLowerCase().replace(/\s+/g, '_');
}

export function PostmarkBadge({ status, label, pressed = false, size = 'md' }: PostmarkBadgeProps) {
  const normalized = normalizeStatus(status);
  const isSending = normalized === 'sending' || normalized === 'queued' || normalized === 'pending_approval';
  const isSuccess = normalized === 'completed' || normalized === 'approved' || normalized === 'healthy' || normalized === 'synced';
  const isFailed = normalized === 'failed' || normalized === 'rejected' || normalized === 'bounced' || normalized === 'offline' || normalized === 'degraded';
  const isDraft = normalized === 'draft' || normalized === 'stopped';

  const className = [
    'postmark-badge',
    size === 'sm' ? 'postmark-badge-sm' : '',
    isSending ? 'postmark-badge-pending' : '',
    isSuccess ? 'postmark-badge-success' : '',
    isFailed ? 'postmark-badge-failed' : '',
    isDraft ? 'postmark-badge-draft' : '',
    pressed ? 'postmark-badge-press' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={className} aria-label={label || status || 'status'}>
      <span className="postmark-badge-ring" />
      <span className="postmark-badge-text">{label || status || 'Draft'}</span>
    </span>
  );
}
