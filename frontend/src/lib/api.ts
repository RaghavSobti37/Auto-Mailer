const PRODUCTION_API_URL = 'https://auto-mailer-5e54.onrender.com';

function defaultApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5001';
  }
  return PRODUCTION_API_URL;
}

const API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || defaultApiUrl();

interface ApiOptions extends RequestInit {
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
  const { params, ...fetchOptions } = options;
  const url = buildUrl(API_URL, path, params);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(fetchOptions.headers as Record<string, string>) };

  const res = await fetch(url, { ...fetchOptions, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

export type BackupJobStatus = {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  progress?: {
    phase?: string;
    percent?: number;
    current?: number;
    total?: number;
    collectionName?: string | null;
  };
  result?: {
    documentCount?: number;
    chunkCount?: number;
    compressedBytes?: number;
    collections?: number;
    backupDatabase?: string;
    backupMetaCollection?: string;
    sourceDatabase?: string;
  };
  error?: string;
  lastCompleted?: {
    startedAt?: string;
    finishedAt?: string;
    result?: BackupJobStatus['result'];
  } | null;
  mongo?: {
    local?: {
      configured?: boolean;
      kind?: string;
      host?: string | null;
      database?: string | null;
      collection?: string | null;
      openUrl?: string | null;
      redactedUri?: string | null;
    };
    onlineBackup?: {
      configured?: boolean;
      kind?: string;
      host?: string | null;
      database?: string | null;
      collection?: string | null;
      openUrl?: string | null;
      redactedUri?: string | null;
    };
    onlineBackupFallbackCollection?: string;
  };
};

export type SyncLocalStatus = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  lastSyncAt?: string | null;
  rowsSynced?: number | null;
  collections?: string[] | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  localConfigured?: boolean;
};

export const live = {
  campaigns: {
    list: () => request<any[]>('/api/campaigns'),
    getById: (id: string) => request<any>(`/api/campaigns/${id}`),
    create: (data: any) => request<any>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/campaigns/${id}`, { method: 'DELETE' }),
    dispatch: (id: string) => request<any>(`/api/campaigns/${id}/dispatch`, { method: 'POST' }),
    stop: (id: string) => request<any>(`/api/campaigns/${id}/stop`, { method: 'POST' }),
    analytics: (id: string) => request<any>(`/api/campaigns/${id}/analytics`),
    recipients: (id: string, p?: Record<string, any>) => request<any>(`/api/campaigns/${id}/recipients`, { params: p }),
  },
  audience: {
    list: (p?: Record<string, any>) => request<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>('/api/audience', { params: p }),
    tags: () => request<{ tags: string[] }>('/api/audience/tags'),
    getById: (id: string) => request<any>(`/api/audience/${id}`),
  },
  templates: {
    list: (p?: Record<string, any>) => request<any[]>('/api/mail/templates', { params: p }),
    getById: (id: string) => request<any>(`/api/mail/templates/${id}`),
    create: (data: any) => request<any>('/api/mail/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/mail/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/mail/templates/${id}`, { method: 'DELETE' }),
    approve: (id: string) => request<any>(`/api/mail/templates/${id}/approve`, { method: 'POST' }),
    reject: (id: string, note?: string) => request<any>(`/api/mail/templates/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  },
  senders: {
    list: () => request<any[]>('/api/mail/profiles'),
    getById: (id: string) => request<any>(`/api/mail/profiles/${id}`),
    create: (data: any) => request<any>('/api/mail/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/mail/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/mail/profiles/${id}`, { method: 'DELETE' }),
  },
  stats: {
    get: () => request<{ totalCampaigns: number; totalSent: number; totalOpened: number; totalClicked: number; totalBounced: number }>('/api/mail/analytics/stats'),
  },
  mail: {
    preview: (data: any) => request<{ html: string; subject: string }>('/api/mail/preview', { method: 'POST', body: JSON.stringify(data) }),
    testCampaign: (data: any) => request<any>('/api/mail/test-campaign', { method: 'POST', body: JSON.stringify(data) }),
  },
  system: {
    health: () => request<{ status: string; service: string; timestamp: string }>('/api/system/health'),
  },
  backup: {
    start: () => request<{ message: string; status: BackupJobStatus }>('/api/backup/run', { method: 'POST' }),
    status: () => request<BackupJobStatus>('/api/backup/status'),
  },
  sync: {
    localStart: () => request<{ message: string; status: SyncLocalStatus }>('/api/sync/local/run', { method: 'POST' }),
    localStatus: () => request<SyncLocalStatus>('/api/sync/local/status'),
  },
  whatsapp: {
    import: async (fd: FormData) => {
      const res = await fetch(`${API_URL}/api/whatsapp/import`, { method: 'POST', body: fd });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `API error: ${res.status}`);
      }
      return res.json() as Promise<{
        totalRows: number;
        matched: number;
        unmatched: number;
        needsReview: number;
        importBatchId: string | null;
        inserted: number;
        updated: number;
        files?: Array<{ fileName: string; totalRows: number; inserted: number; updated: number; needsReview: number }>;
        sync?: { matchedPeople: number; matchedEvents: number; needsReview: number; syncedAt: string } | null;
      }>;
    },
    review: (p?: Record<string, any>) => request<any[]>('/api/whatsapp/review', { params: p }),
    resolveReview: (id: string, action: string, data?: any) => request<any>(`/api/whatsapp/review/${id}`, { method: 'POST', body: JSON.stringify({ action, ...data }) }),
    outcomes: (p?: Record<string, any>) => request<{
      counts: Record<string, number>;
      totalEvents: number;
      uniqueContacts: number;
    }>('/api/whatsapp/outcomes', { params: p }),
  },
};

/** @deprecated use live — mirror/CoreKnot sync removed */
export const mirror = live;
