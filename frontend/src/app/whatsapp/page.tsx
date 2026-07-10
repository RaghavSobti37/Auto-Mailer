'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WhatsAppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columnMapping] = useState<Record<string, string>>({});
  const [linkedCampaignId, setLinkedCampaignId] = useState('');

  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: () => live.campaigns.list() });
  const { data: outcomes } = useQuery({ queryKey: ['whatsapp-outcomes'], queryFn: () => live.whatsapp.outcomes() });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      if (linkedCampaignId) fd.append('linkedCampaignId', linkedCampaignId);
      if (Object.keys(columnMapping).length) fd.append('columnMapping', JSON.stringify(columnMapping));
      return live.whatsapp.import(fd);
    },
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">WhatsApp / AiSensy</h1><p className="text-sm text-gray-500 mt-1">Import and manage WhatsApp campaign data</p></div>
          <a href="/whatsapp/review" className="btn-secondary">Review queue</a>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Import AiSensy CSV</h3>
          <div className="space-y-4">
            <div>
              <label className="label">CSV File</label>
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
            </div>
            <div>
              <label className="label">Link to Campaign (optional)</label>
              <select value={linkedCampaignId} onChange={(e) => setLinkedCampaignId(e.target.value)} className="input">
                <option value="">None</option>
                {campaigns?.map((c: any) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <button onClick={() => importMut.mutate()} disabled={!file || importMut.isPending} className="btn-primary">
              {importMut.isPending ? 'Importing...' : 'Import'}
            </button>
            {importMut.data && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <p className="font-medium text-emerald-800">Import complete</p>
                <p className="text-emerald-600 mt-1">
                  {importMut.data.totalRows} rows: {importMut.data.matched} matched, {importMut.data.unmatched} unmatched, {importMut.data.needsReview} needs review
                </p>
              </div>
            )}
          </div>
        </div>

        {outcomes && outcomes.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Outcomes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'].map((status) => {
                const count = outcomes.filter((o: any) => o.status === status).length;
                return (
                  <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-lg font-bold ${status === 'failed' ? 'text-red-600' : 'text-gray-800'}`}>{count}</div>
                    <div className="text-xs text-gray-500 capitalize mt-1">{status}</div>
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
