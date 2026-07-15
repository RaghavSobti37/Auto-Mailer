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
  const isPending = ['sending', 'queued', 'pending', 'pending_approval', 'draft', 'stopped'].includes(normalized);
  const isDelivered = ['completed', 'approved', 'healthy', 'synced', 'delivered', 'sent', 'subscribed', 'active'].includes(normalized);
  const isBounced = ['failed', 'rejected', 'bounced', 'offline', 'degraded', 'unsubscribed'].includes(normalized);
  const isRead = ['read', 'opened', 'open'].includes(normalized);

  const className = [
    'postmark-badge',
    size === 'sm' ? 'postmark-badge-sm' : '',
    isPending && !isDelivered && !isBounced && !isRead ? 'postmark-badge-pending' : '',
    isDelivered ? 'postmark-badge-delivered' : '',
    isBounced ? 'postmark-badge-bounced' : '',
    isRead ? 'postmark-badge-read' : '',
    pressed ? 'postmark-badge-press' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={className} aria-label={label || status || 'status'}>
      <span className="postmark-badge-ring" />
      <span className="postmark-badge-text">{label || status || 'Draft'}</span>
    </span>
  );
}
