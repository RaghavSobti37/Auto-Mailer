// ============ Campaign ============

export type CampaignStatus = 'Draft' | 'Queued' | 'Sending' | 'Stopped' | 'Completed' | 'Failed';
export type RecipientStatus = 'Pending' | 'Queued' | 'Sent' | 'Failed' | 'Opened' | 'Clicked' | 'Bounced' | 'Unsubscribed' | 'Invalid' | 'Cancelled';

export interface CampaignRecipient {
  leadId?: string;
  email: string;
  name?: string;
  rowData?: Record<string, string>;
  status: RecipientStatus;
  sentAt?: string;
  error?: string;
  messageId?: string;
}

export interface Campaign {
  _id: string;
  campaignId: string;
  title: string;
  subject?: string;
  content?: string;
  senderProfileId?: string;
  senderMode?: 'single' | 'pool' | 'system_resend' | 'system_smtp';
  senderProfileIds?: string[];
  status: CampaignStatus;
  recipientCount: number;
  sentAt?: string;
  stoppedAt?: string;
  eventTag?: string;
  mailTemplateId?: string;
  variableMapping?: Record<string, string>;
  variableFallbacks?: Record<string, string>;
  includeSignature?: boolean;
  signature?: string;
  removeUnsubscribe?: boolean;
  emailStreamSlug?: string;
  metrics: { totalSent: number; opened: number; clicked: number; bounced: number; };
  timeSeries?: Array<{ time: string; opens: number; clicks: number }>;
  recipients?: CampaignRecipient[];
  attachments?: Array<{ filename: string; contentType: string; storageKey?: string; storageUrl?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface MailCampaign extends Campaign {
  stats?: { total: number; sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number; invalid: number; };
  isLegacy?: boolean;
}

// ============ Template ============

export type TemplateStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type TemplateFormat = 'rawHtml' | 'visual';

export interface MailTemplate {
  _id: string;
  name: string;
  content: string;
  format: TemplateFormat;
  subject?: string;
  status: TemplateStatus;
  approvedContent?: string;
  approvedBy?: string;
  dummyValues?: Record<string, string>;
  assets?: Array<{ url: string; name: string; uploadedAt: string }>;
  submittedAt?: string;
  approvedAt?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Email Profile (Sender) ============

export interface EmailProfile {
  _id: string;
  name: string;
  email: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  signature?: string;
  providerType?: string;
  rotationEnabled: boolean;
  rotationProviders: string[];
  dailyLimit: number;
  sendStats: { today: number; lastResetDate?: string; total: number; };
  providerUsage?: Record<string, { today: number; total: number; lastResetDate?: string }>;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Audience / Person ============

export interface Person {
  _id: string;
  email?: string;
  phone?: string;
  normalizedPhone?: string;
  name?: string;
  tags?: string[];
  emailStatus?: string;
  channel?: 'email' | 'whatsapp' | 'both';
  opened?: number;
  clicked?: number;
  bounced?: boolean;
  suppressed?: boolean;
  suppressionReason?: 'bounced' | 'unsubscribed' | string;
  campaignId?: string;
  emailStats?: { sent: number; opened: number; clicked: number; bounced: number; };
  whatsappStats?: { sent: number; delivered: number; read: number; clicked: number; replied: number; failed: number; };
  campaignHistory?: Array<{ campaignId: string; campaignTitle: string; channel: 'email' | 'whatsapp'; outcome: string; timestamp: string; }>;
  needsReview?: boolean;
  createdAt?: string;
}

// ============ WhatsApp ============

export type WhatsAppStatus = 'sent' | 'delivered' | 'read' | 'clicked' | 'replied' | 'failed';

export interface WhatsAppEvent {
  _id: string;
  phone: string;
  normalizedPhone?: string;
  name?: string;
  status: WhatsAppStatus;
  timestamp: string;
  linkedEmailCampaignId?: string;
  matchedToPersonId?: string;
  needsReview?: boolean;
  importBatchId?: string;
  rawRow?: Record<string, string>;
  createdAt: string;
}

export interface WhatsAppImportResult {
  totalRows: number;
  matched: number;
  unmatched: number;
  needsReview: number;
  importBatchId: string;
}

// ============ Analytics ============

export interface AnalyticsData {
  timeSeries: Array<{ time: string; opens: number; clicks: number }>;
  campaignSummary?: Array<{ campaignId: string; title: string; channel: 'email' | 'whatsapp'; sent: number; opened: number; clicked: number; bounced: number; }>;
}

// ============ System Health ============

export interface SystemHealth {
  syncStatus: { lastSyncAt: string | null; rowsSynced: number; method: 'change_streams' | 'scheduled'; isHealthy: boolean; stalenessMinutes: number; };
  redis: { reachable: boolean; pendingJobs: number; workerConcurrency: number; };
  webhook: { lastReceivedAt: string | null; signatureFailures: number; isHealthy: boolean; };
  legacyMigration: { mailCampaignCount: number; campaignCount: number; migrationProgress: number; };
}
