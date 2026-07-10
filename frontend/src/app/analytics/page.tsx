'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { live, mirror } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AnalyticsPage() {
  const { data: stats } = useQuery({ queryKey: ['mail-stats-mirror'], queryFn: () => live.stats.get(), refetchInterval: 60_000 });
  const { data: campaigns } = useQuery({ queryKey: ['campaigns-mirror'], queryFn: () => live.campaigns.list() });

  const totalSent = stats?.totalSent || 0;
  const totalOpened = stats?.totalOpened || 0;
  const totalClicked = stats?.totalClicked || 0;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Analytics</h1><p className="text-sm text-gray-500 mt-1">Cross-campaign performance - mirror data</p></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="card text-center">
            <div className="text-2xl font-bold tabular-nums text-blue-600">{stats?.totalCampaigns || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Campaigns</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card text-center">
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{totalSent}</div>
            <div className="text-xs text-gray-500 mt-1">Sent</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card text-center">
            <div className="text-2xl font-bold tabular-nums text-violet-600">{totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0}%</div>
            <div className="text-xs text-gray-500 mt-1">Open Rate</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card text-center">
            <div className="text-2xl font-bold tabular-nums text-amber-600">{totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0}%</div>
            <div className="text-xs text-gray-500 mt-1">Click Rate</div>
          </motion.div>
        </div>

        {campaigns && campaigns.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Campaign</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Sent</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Opened</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Clicked</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Bounced</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Open%</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => {
                    const sent = c.metrics?.totalSent || c.stats?.sent || 0;
                    const opened = c.metrics?.opened || c.stats?.opened || 0;
                    const clicked = c.metrics?.clicked || c.stats?.clicked || 0;
                    const bounced = c.metrics?.bounced || c.stats?.bounced || 0;
                    return (
                      <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium">{c.title}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{sent}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{opened}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{clicked}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{bounced}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{sent > 0 ? Math.round((opened / sent) * 100) : 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
