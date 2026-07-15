'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WhatsAppPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [columnMapping] = useState<Record<string, string>>({});
  const [linkedCampaignId, setLinkedCampaignId] = useState('');

  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: () => live.campaigns.list() });
  const { data: outcomes } = useQuery({ queryKey: ['whatsapp-outcomes'], queryFn: () => live.whatsapp.outcomes() });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!files.length) return;
      const fd = new FormData();
      files.forEach((file) => fd.append('files', file));
      fd.append('syncAfter', 'true');
      if (linkedCampaignId) fd.append('linkedCampaignId', linkedCampaignId);
      if (Object.keys(columnMapping).length) fd.append('columnMapping', JSON.stringify(columnMapping));
      return live.whatsapp.import(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['audience'] });
    },
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">WhatsApp / AiSensy</h1><p className="text-sm text-muted-ledger mt-1">Import and manage WhatsApp campaign data</p></div>
          <button type="button" onClick={() => router.push('/whatsapp/review')} className="btn-secondary">Review queue</button>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Bulk import AiSensy CSVs</h3>
          <div className="space-y-4">
            <div>
              <label className="label">CSV files</label>
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="input"
              />
              <p className="mt-1 text-xs text-muted-ledger">
                {files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected. Imports sync with audience data after upload.` : 'Upload sent, delivered, read, failed, clicked, or replied exports together.'}
              </p>
            </div>
            <div>
              <label className="label">Link to Campaign (optional)</label>
              <select value={linkedCampaignId} onChange={(e) => setLinkedCampaignId(e.target.value)} className="input">
                <option value="">None</option>
                {campaigns?.map((c: any) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <button onClick={() => importMut.mutate()} disabled={!files.length || importMut.isPending} className="btn-primary">
              {importMut.isPending ? 'Importing and syncing...' : 'Import CSVs + sync data'}
            </button>
            {importMut.data && (
              <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(66, 211, 146, 0.38)', background: 'rgba(66, 211, 146, 0.08)' }}>
                <p className="font-medium" style={{ color: 'var(--ledger-green)' }}>Import complete</p>
                <p className="text-muted-ledger mt-1">
                  {importMut.data.totalRows} rows: {importMut.data.matched} matched, {importMut.data.unmatched} unmatched, {importMut.data.needsReview} needs review, {importMut.data.inserted || 0} inserted, {importMut.data.updated || 0} updated
                </p>
                {importMut.data.sync && (
                  <p className="text-muted-ledger mt-1">
                    Sync: {importMut.data.sync.matchedPeople} people, {importMut.data.sync.matchedEvents} events matched, {importMut.data.sync.needsReview} still needs review
                  </p>
                )}
                {!!importMut.data.files?.length && (
                  <div className="mt-3 space-y-1">
                    {importMut.data.files.map((item) => (
                      <div key={item.fileName} className="flex flex-wrap justify-between gap-2 text-xs text-muted-ledger">
                        <span>{item.fileName}</span>
                        <span>{item.totalRows} rows · {item.inserted} inserted · {item.updated} updated</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {outcomes && outcomes.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Outcomes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'].map((status) => {
                const count = outcomes.filter((o: any) => o.status === status).length;
                return (
                  <div key={status} className="metric-tile text-center">
                    <div className="text-lg font-bold" style={{ color: status === 'failed' ? 'var(--void)' : 'var(--ink)' }}>{count}</div>
                    <div className="text-xs text-muted-ledger capitalize mt-1">{status}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
