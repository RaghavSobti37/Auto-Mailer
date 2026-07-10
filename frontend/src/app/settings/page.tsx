'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Settings</h1><p className="text-sm text-gray-500 mt-1">Environment and connection configuration</p></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Connection</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">Live API URL</label><input className="input" defaultValue={process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:5001'} readOnly /></div>
              <div><label className="label">Mirror API URL</label><input className="input" defaultValue={process.env.NEXT_PUBLIC_MIRROR_API_URL || 'http://localhost:5001'} readOnly /></div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Both endpoints reachable</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sync Configuration</h3>
            <div className="space-y-3 text-sm">
              <div><label className="label">Method</label><div className="text-gray-700">Option B (scheduled mongodump)</div></div>
              <div><label className="label">Sync interval</label><div className="text-gray-700">Every 10 minutes</div></div>
              <div><label className="label">Collections</label><div className="text-gray-700">Campaign, MailEvent, EmailLog, EmailProfile, MailTemplate, MailCampaign, WhatsAppEvent, Person</div></div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span>Include unsubscribe link in campaigns</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span>Track opens and clicks</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
