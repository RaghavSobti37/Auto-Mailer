'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import type { MailTemplate, TemplateStatus } from '@/lib/types';
import { PostmarkBadge } from '@/components/PostmarkBadge';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';

const FILTERS = ['all', 'draft', 'pending_approval', 'approved', 'rejected'] as const;

export default function TemplatesPage() {
  const router = useRouter();
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

  const filtered = useMemo(() => {
    const list = (templates || []) as MailTemplate[];
    return statusFilter === 'all' ? list : list.filter((t) => t.status === statusFilter);
  }, [templates, statusFilter]);

  const columns = useMemo<DataTableColumn<MailTemplate>[]>(() => [
    {
      header: 'Template',
      sortKey: 'name',
      render: (template) => (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/templates/${template._id}`); }} className="font-semibold hover:text-postmark text-left">{template.name}</button>
          {template.subject && <div className="text-xs text-muted-ledger">{template.subject}</div>}
        </>
      ),
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (template) => <PostmarkBadge status={template.status} label={template.status.replace('_', ' ')} size="sm" />,
    },
    {
      header: 'Format',
      sortKey: 'format',
      render: (template) => <span className="mono">{template.format}</span>,
    },
    {
      header: 'Created',
      align: 'right',
      sortKey: 'createdAt',
      sortFn: (t) => new Date(t.createdAt).getTime(),
      render: (template) => <span className="mono">{new Date(template.createdAt).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (template) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/templates/${template._id}`); }} className="btn-secondary px-2 py-1 text-xs">Open</button>
          {template.status === 'pending_approval' && (
            <>
              <button type="button" onClick={() => approveMutation.mutate(template._id)} disabled={approveMutation.isPending} className="btn-primary px-2 py-1 text-xs">Approve</button>
              <button
                type="button"
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
      ),
    },
  ], [approveMutation.isPending, rejectMutation.isPending]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-ledger">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={() => router.push('/templates/new')} className="btn-primary">New template</button>
      </div>

      <div className="flex flex-wrap gap-5 border-b" style={{ borderColor: 'var(--line)' }}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`pb-2 text-sm font-semibold transition-colors ${statusFilter === filter ? 'text-postmark border-b-2' : 'text-muted-ledger hover:text-postmark'}`}
            style={{ borderColor: statusFilter === filter ? 'var(--postmark)' : 'transparent' }}
          >
            {filter === 'all' ? 'All' : filter.replace('_', ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(t) => t._id}
        onRowClick={(t) => { router.push(`/templates/${t._id}`); }}
        isLoading={isLoading}
        defaultPageSize={25}
        emptyTitle="No templates found"
        emptyDescription="Create a template or change the status filter."
      />
    </div>
  );
}
