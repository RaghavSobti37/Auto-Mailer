'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';

export default function NewSenderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [dailyLimit, setDailyLimit] = useState(500);
  const [rotationEnabled, setRotationEnabled] = useState(true);

  const createMut = useMutation({
    mutationFn: () => live.senders.create({
      name,
      email,
      smtpUser,
      smtpPass,
      dailyLimit,
      rotationEnabled,
    }),
    onSuccess: () => router.push('/senders'),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <Link href="/senders" className="text-sm font-semibold text-postmark">← Back to senders</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">New sender</h1>
          <p className="mt-1 text-sm text-muted-ledger">Add an email profile for sending campaigns.</p>
        </div>

        <div className="card max-w-lg space-y-4">
          <div>
            <label className="label">Profile name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My SMTP profile" />
          </div>
          <div>
            <label className="label">From email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sender@example.com" />
          </div>
          <div>
            <label className="label">SMTP username</label>
            <input className="input" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="SMTP login" />
          </div>
          <div>
            <label className="label">SMTP password</label>
            <input className="input" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="SMTP password" />
          </div>
          <div>
            <label className="label">Daily send limit</label>
            <input className="input" type="number" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} min={1} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} />
            Enable rotation
          </label>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !name || !email || !smtpUser || !smtpPass}
            className="btn-primary"
          >
            {createMut.isPending ? 'Creating...' : 'Create sender'}
          </button>
          {createMut.error && <p className="text-xs text-red-600">{(createMut.error as Error).message}</p>}
        </div>
      </div>
    </ErrorBoundary>
  );
}
