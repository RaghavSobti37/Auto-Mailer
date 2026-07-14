'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataTable, type DataTableColumn } from '@/components/table/DataTable';

type ReviewRow = {
  _id: string;
  name?: string;
  phone?: string;
  normalizedPhone?: string;
};

export default function WhatsAppReviewPage() {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['whatsapp-review'],
    queryFn: () => live.whatsapp.review(),
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => live.whatsapp.resolveReview(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-review'] }),
  });

  const columns = useMemo<DataTableColumn<ReviewRow>[]>(() => [
    {
      header: 'Contact',
      sortKey: 'name',
      sortFn: (item) => item.name || item.phone || '',
      render: (item) => (
        <div>
          <div className="font-medium">{item.name || item.phone || 'Unknown'}</div>
          <div className="text-xs text-muted-ledger mt-0.5">
            Phone: {item.phone}
            {item.normalizedPhone ? ` (normalized: ${item.normalizedPhone})` : ' (could not normalize)'}
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      sortKey: 'phone',
      render: (item) => <span className="mono">{item.phone || '-'}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (item) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => resolveMut.mutate({ id: item._id, action: 'create' })}
            disabled={resolveMut.isPending}
            className="btn-primary px-2 py-1 text-xs"
          >
            Create contact
          </button>
          <button
            type="button"
            onClick={() => resolveMut.mutate({ id: item._id, action: 'discard' })}
            disabled={resolveMut.isPending}
            className="btn-secondary px-2 py-1 text-xs"
          >
            Discard
          </button>
        </div>
      ),
    },
  ], [resolveMut.isPending]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <a href="/whatsapp" className="text-sm text-postmark hover:underline">&larr; Back to WhatsApp</a>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Needs Review</h1>
          <p className="text-sm text-muted-ledger mt-1">Unmatched phone numbers requiring manual resolution</p>
        </div>

        <DataTable
          columns={columns}
          data={(reviews || []) as ReviewRow[]}
          getRowId={(r) => r._id}
          isLoading={isLoading}
          defaultPageSize={10}
          emptyTitle="No items need review"
          emptyDescription="Imports with unmatched phones will appear here."
        />
      </div>
    </ErrorBoundary>
  );
}
