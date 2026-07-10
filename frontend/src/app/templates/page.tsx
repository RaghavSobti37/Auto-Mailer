'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import type { MailTemplate, TemplateStatus } from '@/lib/types';

const STATUS_COLORS: Record<TemplateStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function TemplatesPage() {
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [diffView, setDiffView] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
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
    : (templates || []).filter((t: any) => t.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/templates/new" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          New template
        </a>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'pending_approval', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s === 'pending_approval' && templates && (
              <span className="ml-1.5 px-1 py-0.5 text-[10px] bg-blue-200 text-blue-800 rounded-full">
                {(templates as any[]).filter(t => t.status === 'pending_approval').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Template list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No templates found</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((template: MailTemplate, i: number) => (
            <motion.div
              key={template._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <a href={`/templates/${template._id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {template.name}
                    </a>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[template.status]}`}>
                      {template.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                      {template.format}
                    </span>
                  </div>
                  {template.subject && (
                    <div className="text-xs text-gray-500 mt-1">{template.subject}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Approval actions */}
                {template.status === 'pending_approval' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => approveMutation.mutate(template._id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const note = prompt('Rejection reason (optional):');
                        rejectMutation.mutate({ id: template._id, note: note || undefined });
                      }}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Content diff for approval */}
              {diffView === template._id && template.approvedContent && template.content !== template.approvedContent && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs font-mono">
                  <div className="font-semibold text-gray-500 mb-1">Changes from approved version:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-red-600 font-medium mb-1">Previous</div>
                      <pre className="text-red-800 bg-red-50 p-2 rounded overflow-auto max-h-32">{template.approvedContent.slice(0, 500)}</pre>
                    </div>
                    <div>
                      <div className="text-green-600 font-medium mb-1">New</div>
                      <pre className="text-green-800 bg-green-50 p-2 rounded overflow-auto max-h-32">{template.content.slice(0, 500)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
