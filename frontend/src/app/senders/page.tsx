'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import { QuotaGauge } from '@/components/QuotaGauge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SendersPage() {
  const { data: senders, isLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: () => live.senders.list(),
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Senders</h1>
            <p className="text-sm text-gray-500 mt-1">{senders?.length || 0} email profiles</p>
          </div>
          <a href="/senders/new" className="btn-primary">Add sender</a>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading senders...</div>
        ) : !senders?.length ? (
          <div className="text-center py-12 text-gray-400">No sender profiles configured</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {senders.map((profile: any, i: number) => {
              const dailyUsage = profile.sendStats?.today || 0;
              const dailyLimit = profile.dailyLimit || 500;
              return (
                <motion.a key={profile._id} href={`/senders/${profile._id}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card hover:shadow-md transition-shadow cursor-pointer block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{profile.email}</p>
                    </div>
                    <QuotaGauge current={dailyUsage} limit={dailyLimit} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Total: {profile.sendStats?.total || 0}</span>
                    <span className={`px-1.5 py-0.5 rounded-full ${profile.rotationEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{profile.rotationEnabled ? 'Rotation' : 'Static'}</span>
                    {(dailyUsage / dailyLimit) > 0.8 && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{dailyLimit - dailyUsage} remaining</span>}
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
