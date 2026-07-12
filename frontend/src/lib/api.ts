const PRODUCTION_API_URL = 'https://auto-mailer-5e54.onrender.com';

function defaultApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5001';
  }
  return PRODUCTION_API_URL;
}

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || defaultApiUrl();
const MIRROR_API_URL = process.env.NEXT_PUBLIC_MIRROR_API_URL || LIVE_API_URL;

export type DataSource = 'live' | 'mirror';

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auto_mailer_api_key') || '';
  }
  return process.env.AUTO_MAILER_API_KEY || '';
}

interface ApiOptions extends RequestInit {
  source?: DataSource;
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(base: string, path: string, params?: Record<string, any>): string {
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { source = 'live', params, ...fetchOptions } = options;
  const baseUrl = source === 'live' ? LIVE_API_URL : MIRROR_API_URL;
  const url = buildUrl(baseUrl, path, params);
  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(fetchOptions.headers as Record<string, string>) };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(url, { ...fetchOptions, headers });
  if (res.status === 401 && typeof window !== 'undefined') { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const live = {
  campaigns: {
    list: () => request<any[]>('/api/campaigns', { source: 'live' }),
    getById: (id: string) => request<any>(`/api/campaigns/${id}`, { source: 'live' }),
    create: (data: any) => request<any>('/api/campaigns', { source: 'live', method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/campaigns/${id}`, { source: 'live', method: 'DELETE' }),
    dispatch: (id: string) => request<any>(`/api/campaigns/${id}/dispatch`, { source: 'live', method: 'POST' }),
    stop: (id: string) => request<any>(`/api/campaigns/${id}/stop`, { source: 'live', method: 'POST' }),
    analytics: (id: string) => request<any>(`/api/campaigns/${id}/analytics`, { source: 'live' }),
    recipients: (id: string, p?: Record<string, any>) => request<any>(`/api/campaigns/${id}/recipients`, { source: 'live', params: p }),
  },
  templates: {
    list: (p?: Record<string, any>) => request<any[]>('/api/mail/templates', { source: 'live', params: p }),
    getById: (id: string) => request<any>(`/api/mail/templates/${id}`, { source: 'live' }),
    create: (data: any) => request<any>('/api/mail/templates', { source: 'live', method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/mail/templates/${id}`, { source: 'live', method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/mail/templates/${id}`, { source: 'live', method: 'DELETE' }),
    approve: (id: string) => request<any>(`/api/mail/templates/${id}/approve`, { source: 'live', method: 'POST' }),
    reject: (id: string, note?: string) => request<any>(`/api/mail/templates/${id}/reject`, { source: 'live', method: 'POST', body: JSON.stringify({ note }) }),
  },
  senders: {
    list: () => request<any[]>('/api/mail/profiles', { source: 'live' }),
    getById: (id: string) => request<any>(`/api/mail/profiles/${id}`, { source: 'live' }),
    create: (data: any) => request<any>('/api/mail/profiles', { source: 'live', method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/mail/profiles/${id}`, { source: 'live', method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/mail/profiles/${id}`, { source: 'live', method: 'DELETE' }),
  },
  stats: {
    get: () => request<{ totalCampaigns: number; totalSent: number; totalOpened: number; totalClicked: number; totalBounced: number }>('/api/mail/analytics/stats', { source: 'live' }),
  },
  mail: {
    preview: (data: any) => request<{ html: string; subject: string }>('/api/mail/preview', { source: 'live', method: 'POST', body: JSON.stringify(data) }),
    testCampaign: (data: any) => request<any>('/api/mail/test-campaign', { source: 'live', method: 'POST', body: JSON.stringify(data) }),
  },
  system: {
    health: () => request<{ status: string; service: string; timestamp: string }>('/api/system/health', { source: 'live' }),
  },
  dataHub: {
    backup: () => request<{ skipped: boolean; collections?: number; documentCount?: number; chunkCount?: number; compressedBytes?: number; reason?: string }>('/api/data-hub/backup/run', { source: 'live', method: 'POST' }),
  },
  whatsapp: {
    import: async (fd: FormData) => {
      const res = await fetch(`${LIVE_API_URL}/api/whatsapp/import`, {
        method: 'POST',
        body: fd,
        headers: getApiKey() ? { 'x-api-key': getApiKey() } : {},
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `API error: ${res.status}`);
      }
      return res.json() as Promise<{ totalRows: number; matched: number; unmatched: number; needsReview: number; importBatchId: string | null }>;
    },
    review: (p?: Record<string, any>) => request<any[]>('/api/whatsapp/review', { source: 'live', params: p }),
    resolveReview: (id: string, action: string, data?: any) => request<any>(`/api/whatsapp/review/${id}`, { source: 'live', method: 'POST', body: JSON.stringify({ action, ...data }) }),
    outcomes: (p?: Record<string, any>) => request<any[]>('/api/whatsapp/outcomes', { source: 'live', params: p }),
  },
  auth: {
    verify: (apiKey: string) => request<{ success: boolean }>('/api/auth/verify', { source: 'live', method: 'POST', body: JSON.stringify({ apiKey }) }),
  },
};

export const mirror = {
  audience: {
    list: (p?: Record<string, any>) => request<any>('/api/audience', { source: 'mirror', params: p }),
    getById: (id: string) => request<any>(`/api/audience/${id}`, { source: 'mirror' }),
  },
  analytics: { get: () => request<any>('/api/analytics/cross-campaign', { source: 'mirror' }) },
  sync: {
    status: () => request<{ lastSyncAt: string | null; rowsSynced: number; method: string; isHealthy: boolean; stalenessMinutes: number }>('/api/mirror/sync-status', { source: 'mirror' }),
    trigger: () => request<{ message: string }>('/api/mirror/sync-now', { source: 'live', method: 'POST' }),
  },
};
