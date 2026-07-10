'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { live } from '@/lib/api';
import type { MailTemplate, TemplateStatus } from '@/lib/types';
import { PostmarkBadge } from '@/components/PostmarkBadge';

const FILTERS = ['all', 'draft', 'pending_approval', 'approved', 'rejected'] as const;

export default function TemplatesPage() {
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', statusFilter],
    queryFn: () => live.templates.list({ status: statusFilter !== 'all' ? statusFilter : undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => live.templates.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => live.templates.reject(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const filtered = statusFilter === 'all'
    ? (templates || [])
    : (templates || []).filter((template: any) => template.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-ledger">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/templates/new" className="btn-primary">New template</a>
      </div>

      <div className="flex flex-wrap gap-5 border-b" style={{ borderColor: 'var(--line)' }}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`pb-2 text-sm font-semibold transition-colors ${statusFilter === filter ? 'text-postmark border-b-2' : 'text-muted-ledger hover:text-postmark'}`}
            style={{ borderColor: statusFilter === filter ? 'var(--postmark)' : 'transparent' }}
          >
            {filter === 'all' ? 'All' : filter.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-ledger">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-ledger">No templates found</div>
      ) : (
        <div className="ledger-shell">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Postmark</th>
                  <th>Format</th>
                  <th className="text-right">Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((template: MailTemplate) => (
                  <tr key={template._id}>
                    <td>
                      <a href={`/templates/${template._id}`} className="font-semibold hover:text-postmark">{template.name}</a>
                      {template.subject && <div className="text-xs text-muted-ledger">{template.subject}</div>}
                    </td>
                    <td><PostmarkBadge status={template.status} label={template.status.replace('_', ' ')} size="sm" /></td>
                    <td className="mono">{template.format}</td>
                    <td className="mono text-right">{new Date(template.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <a href={`/templates/${template._id}`} className="btn-secondary px-2 py-1 text-xs">Open</a>
                        {template.status === 'pending_approval' && (
                          <>
                            <button onClick={() => approveMutation.mutate(template._id)} disabled={approveMutation.isPending} className="btn-primary px-2 py-1 text-xs">Approve</button>
                            <button
                              onClick={() => {
                                const note = prompt('Rejection reason (optional):');
                                rejectMutation.mutate({ id: template._id, note: note || undefined });
                              }}
                              disabled={rejectMutation.isPending}
                              className="btn-secondary px-2 py-1 text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
