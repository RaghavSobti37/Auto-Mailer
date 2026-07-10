'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const STEPS = ['Template', 'Audience', 'Sender', 'Variables', 'Review'];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [customRecipients, setCustomRecipients] = useState('');
  const [senderId, setSenderId] = useState('');
  const [senderMode, setSenderMode] = useState<'single' | 'pool'>('single');
  const [action, setAction] = useState<'draft' | 'dispatch'>('draft');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: () => live.templates.list() });
  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => live.senders.list() });
  const approvedTemplates = (templates || []).filter((t: any) => t.status === 'approved');

  const createMut = useMutation({
    mutationFn: () => live.campaigns.create({
      title, subject, mailTemplateId: templateId || undefined,
      senderProfileId: senderId || undefined, senderMode,
      customRecipients: customRecipients.split('\n').filter(Boolean).map(e => ({ email: e.trim() })),
      action: action === 'dispatch' ? 'dispatch' : 'draft',
      variableMapping: Object.keys(variables).length ? variables : undefined,
    }),
    onSuccess: (data) => router.push('/campaigns/' + data._id),
  });

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto space-y-8">
        <a href="/campaigns" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to campaigns</a>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>

        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${step === i ? 'bg-indigo-600 text-white' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}. {s}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Choose Template</h2>
                <div><label className="label">Campaign Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Campaign" /></div>
                <div><label className="label">Subject</label><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" /></div>
                <div><label className="label">Approved Template</label>
                  <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="input">
                    <option value="">None (use custom content)</option>
                    {approvedTemplates.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <button onClick={() => setStep(1)} className="btn-primary">Next: Audience</button>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Audience</h2>
                <div><label className="label">Recipient Emails (one per line)</label>
                  <textarea className="input h-32" value={customRecipients} onChange={e => setCustomRecipients(e.target.value)} placeholder="user1@example.com\nuser2@example.com" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(0)} className="btn-secondary">Back</button>
                  <button onClick={() => setStep(2)} className="btn-primary">Next: Sender</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Sender Strategy</h2>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => setSenderMode('single')} className={`px-4 py-2 text-sm rounded-lg border ${senderMode === 'single' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200'}`}>Single Profile</button>
                  <button onClick={() => setSenderMode('pool')} className={`px-4 py-2 text-sm rounded-lg border ${senderMode === 'pool' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200'}`}>Pool / Rotation</button>
                </div>
                <div><label className="label">Sender Profile</label>
                  <select value={senderId} onChange={e => setSenderId(e.target.value)} className="input">
                    <option value="">Select sender...</option>
                    {senders?.map((s: any) => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                  <button onClick={() => setStep(3)} className="btn-primary">Next: Variables</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Variables</h2>
                <p className="text-sm text-gray-500">Map template variables to values (optional)</p>
                {['name', 'company', 'date'].map(v => (
                  <div key={v}>
                    <label className="label">{`{${v}}`}</label>
                    <input className="input" value={variables[v] || ''} onChange={e => setVariables({...variables, [v]: e.target.value})} placeholder={`Value for ${v}`} />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
                  <button onClick={() => setStep(4)} className="btn-primary">Next: Review</button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Review & Send</h2>
                <div className="card space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Title</span><span>{title}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Subject</span><span>{subject}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Recipients</span><span>{customRecipients.split('\n').filter(Boolean).length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sender</span><span>{senders?.find((s: any) => s._id === senderId)?.name || 'None'}</span></div>
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={action === 'dispatch'} onChange={e => setAction(e.target.checked ? 'dispatch' : 'draft')} className="rounded border-gray-300" />
                    <span>Send immediately after creating</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
                  <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !title || !subject} className="btn-primary">
                    {createMut.isPending ? 'Creating...' : action === 'dispatch' ? 'Create & Send' : 'Create Draft'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
