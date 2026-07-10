'use client';

import { useQuery } from '@tanstack/react-query';
import { live } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FlatMetricTile } from '@/components/FlatMetricTile';
import { PostmarkBadge } from '@/components/PostmarkBadge';

export default function AnalyticsPage() {
  const { data: stats } = useQuery({ queryKey: ['mail-stats-mirror'], queryFn: () => live.stats.get(), refetchInterval: 60_000 });
  const { data: campaigns } = useQuery({ queryKey: ['campaigns-mirror'], queryFn: () => live.campaigns.list() });

  const totalSent = stats?.totalSent || 0;
  const totalOpened = stats?.totalOpened || 0;
  const totalClicked = stats?.totalClicked || 0;
  const totalBounced = stats?.totalBounced || 0;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-ledger">Plain campaign tracking; no geo breakdown.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <FlatMetricTile label="Sent" value={totalSent} />
          <FlatMetricTile label="Opened" value={totalOpened} hint={`${totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0}%`} />
          <FlatMetricTile label="Clicked" value={totalClicked} hint={`${totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0}%`} />
          <FlatMetricTile label="Bounced" value={totalBounced} />
        </div>

        <div className="ledger-shell">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Opened</th>
                  <th className="text-right">Clicked</th>
                  <th className="text-right">Open rate</th>
                  <th className="text-right">Click rate</th>
                </tr>
              </thead>
              <tbody>
                {(campaigns || []).map((campaign: any) => {
                  const sent = campaign.metrics?.totalSent || campaign.stats?.sent || 0;
                  const opened = campaign.metrics?.opened || campaign.stats?.opened || 0;
                  const clicked = campaign.metrics?.clicked || campaign.stats?.clicked || 0;
                  return (
                    <tr key={campaign._id}>
                      <td>
                        <a href={`/campaigns/${campaign._id}`} className="font-semibold hover:text-postmark">{campaign.title}</a>
                        {campaign.subject && <div className="text-xs text-muted-ledger">{campaign.subject}</div>}
                      </td>
                      <td><PostmarkBadge status={campaign.status} size="sm" /></td>
                      <td className="mono text-right">{sent}</td>
                      <td className="mono text-right">{opened}</td>
                      <td className="mono text-right">{clicked}</td>
                      <td className="mono text-right">{sent > 0 ? Math.round((opened / sent) * 100) : 0}%</td>
                      <td className="mono text-right">{sent > 0 ? Math.round((clicked / sent) * 100) : 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
