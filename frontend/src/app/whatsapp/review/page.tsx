'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WhatsAppReviewPage() {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useQuery({ queryKey: ['whatsapp-review'], queryFn: () => live.whatsapp.review() });

  const resolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => live.whatsapp.resolveReview(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-review'] }),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <a href="/whatsapp" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to WhatsApp</a>
        <div><h1 className="text-2xl font-bold tracking-tight">Needs Review</h1><p className="text-sm text-gray-500 mt-1">Unmatched phone numbers requiring manual resolution</p></div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : !reviews?.length ? (
          <div className="text-center py-12 text-gray-400">No items need review</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((item: any, i: number) => (
              <motion.div key={item._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{item.name || item.phone || 'Unknown'}</div>
                    <div className="text-xs text-gray-500 mt-1">Phone: {item.phone}{item.normalizedPhone ? ` (normalized: ${item.normalizedPhone})` : ' (could not normalize)'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resolveMut.mutate({ id: item._id, action: 'create' })} className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">Create contact</button>
                    <button onClick={() => resolveMut.mutate({ id: item._id, action: 'discard' })} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">Discard</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
