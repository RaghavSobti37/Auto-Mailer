'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { live } from '@/lib/api';
import { QuotaGauge } from '@/components/QuotaGauge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SenderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: profile, isLoading } = useQuery({ queryKey: ['sender', id], queryFn: () => live.senders.getById(id) });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <a href="/senders" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">&larr; Back to senders</a>
        {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> : !profile ? <div className="text-center py-12 text-gray-400">Sender not found</div> : (
          <>
            <div className="flex items-start justify-between">
              <div><h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1><p className="text-sm text-gray-500 mt-1">{profile.email}</p></div>
              <QuotaGauge current={profile.sendStats?.today || 0} limit={profile.dailyLimit || 500} size="lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Today</span><span className="font-medium">{profile.sendStats?.today || 0} / {profile.dailyLimit || 500}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(((profile.sendStats?.today || 0) / (profile.dailyLimit || 500)) * 100, 100)}%` }} 
                      className={`h-2 rounded-full ${((profile.sendStats?.today || 0) / (profile.dailyLimit || 500)) > 0.9 ? 'bg-red-500' : ((profile.sendStats?.today || 0) / (profile.dailyLimit || 500)) > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Total all-time</span><span className="font-medium">{profile.sendStats?.total || 0}</span></div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Rotation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Enabled</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${profile.rotationEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{profile.rotationEnabled ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
            {profile.providerUsage && Object.keys(profile.providerUsage).length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Provider Usage</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(profile.providerUsage).map(([provider, usage]: [string, any]) => (
                    <div key={provider} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-500">{provider}</div>
                      <QuotaGauge current={usage.today || 0} limit={profile.dailyLimit || 500} size="sm" />
                    </div>
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
