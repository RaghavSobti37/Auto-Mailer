'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TemplateEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'rawHtml' | 'visual'>('rawHtml');
  const [showSentPreview, setShowSentPreview] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => live.templates.getById(id),
    enabled: id !== 'new',
  });

  if (template && !content && !name) {
    setName(template.name);
    setContent(template.content);
    setFormat(template.format || 'rawHtml');
  }

  const saveMut = useMutation({
    mutationFn: () => id === 'new'
      ? live.templates.create({ name, content, format, status: 'draft' })
      : live.templates.update(id, { name, content, format }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); router.push('/templates'); },
  });

  const submitMut = useMutation({
    mutationFn: () => live.templates.update(id, { status: 'pending_approval', submittedAt: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); router.push('/templates'); },
  });

  const withSignature = '<div style="margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:12px;color:#999"><p>Sent via Auto-Mailer</p></div>';
  const withUnsubscribe = '<div style="margin-top:20px;padding-top:10px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999"><a href="{{unsubscribe_url}}" style="color:#999">Unsubscribe</a></div>';

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto space-y-6">
        <button type="button" onClick={() => router.push('/templates')} className="text-sm font-semibold text-postmark">Back to templates</button>
        <h1 className="text-2xl font-bold tracking-tight">{id === 'new' ? 'New Template' : 'Edit Template'}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><label className="label">Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Template name" /></div>
            <div className="flex gap-2">
              <button onClick={() => setFormat('visual')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${format === 'visual' ? 'text-white' : 'bg-white/70 text-muted-ledger'}`} style={{ background: format === 'visual' ? 'var(--ink)' : undefined, borderColor: 'var(--line)' }}>Rich editor</button>
              <button onClick={() => setFormat('rawHtml')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${format === 'rawHtml' ? 'text-white' : 'bg-white/70 text-muted-ledger'}`} style={{ background: format === 'rawHtml' ? 'var(--ink)' : undefined, borderColor: 'var(--line)' }}>Raw HTML</button>
            </div>
            <div><label className="label">Content</label>
              {format === 'rawHtml' ? (
                <textarea className="input h-80 font-mono text-xs" value={content} onChange={e => setContent(e.target.value)} placeholder="<html><body>Your email content here...</body></html>" />
              ) : (
                <div className="input h-80 overflow-auto" contentEditable onInput={e => setContent((e.target as HTMLElement).innerHTML)} dangerouslySetInnerHTML={{ __html: content || '<p>Start writing your email...</p>' }} />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Preview</h3>
              <label className="flex items-center gap-2 text-xs text-muted-ledger">
                <input type="checkbox" checked={showSentPreview} onChange={e => setShowSentPreview(e.target.checked)} className="rounded border-gray-300" />
                <span>Show as sent</span>
              </label>
            </div>
            <div className="min-h-[400px] rounded-lg border bg-white p-4" style={{ borderColor: 'var(--line)' }}>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: showSentPreview ? content + withSignature + withUnsubscribe : content }} />
            </div>
            <p className="text-xs text-muted-ledger">
              {showSentPreview ? 'Showing with signature + unsubscribe merged at send time' : 'Showing saved content (as saved, not as sent)'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name} className="btn-primary">{saveMut.isPending ? 'Saving...' : 'Save'}</button>
          {id !== 'new' && <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="btn-secondary">{submitMut.isPending ? 'Submitting...' : 'Submit for Approval'}</button>}
          <button type="button" onClick={() => router.push('/templates')} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
