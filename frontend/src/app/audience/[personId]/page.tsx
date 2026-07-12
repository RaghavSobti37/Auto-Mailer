'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ContactTimelinePage() {
  const params = useParams();
  const personId = params.personId as string;

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => live.audience.getById(personId),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <a href="/audience" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to audience</a>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : !person ? (
          <div className="text-center py-12 text-gray-400">Person not found</div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{person.name || 'Unknown'}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  {person.email && <span>{person.email}</span>}
                  {person.phone && <span>{person.phone}</span>}
                  {person.normalizedPhone && <span className="text-xs text-gray-400">({person.normalizedPhone})</span>}
                </div>
              </div>
              {person.needsReview && (
                <a href="/whatsapp/review" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                  Needs review
                </a>
              )}
            </div>

            {/* Stats side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">@</span> Email
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-blue-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-700">{person.emailStats?.sent || 0}</div>
                    <div className="text-xs text-blue-500">Sent</div>
                  </div>
                  <div className="p-2 bg-violet-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-violet-700">{person.emailStats?.opened || 0}</div>
                    <div className="text-xs text-violet-500">Opened</div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-amber-700">{person.emailStats?.clicked || 0}</div>
                    <div className="text-xs text-amber-500">Clicked</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-700">{person.emailStats?.bounced || 0}</div>
                    <div className="text-xs text-red-500">Bounced</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-emerald-500">&#x1F4AC;</span> WhatsApp
                </h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-emerald-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-emerald-700">{person.whatsappStats?.sent || 0}</div>
                    <div className="text-xs text-emerald-500">Sent</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-700">{person.whatsappStats?.delivered || 0}</div>
                    <div className="text-xs text-blue-500">Delivered</div>
                  </div>
                  <div className="p-2 bg-violet-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-violet-700">{person.whatsappStats?.read || 0}</div>
                    <div className="text-xs text-violet-500">Read</div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-amber-700">{person.whatsappStats?.clicked || 0}</div>
                    <div className="text-xs text-amber-500">Clicked</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-purple-700">{person.whatsappStats?.replied || 0}</div>
                    <div className="text-xs text-purple-500">Replied</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-700">{person.whatsappStats?.failed || 0}</div>
                    <div className="text-xs text-red-500">Failed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign History Timeline */}
            {person.campaignHistory && person.campaignHistory.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Campaign History</h3>
                <div className="space-y-2">
                  {(person.campaignHistory || []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 text-sm"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${entry.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {entry.channel === 'whatsapp' ? 'W' : 'E'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{entry.campaignTitle || 'Campaign'}</div>
                        <div className="text-xs text-gray-500">{entry.channel} &middot; {entry.outcome}</div>
                      </div>
                      <div className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleDateString()}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
