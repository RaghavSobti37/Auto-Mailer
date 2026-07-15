const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-mailer',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5001',
  trackingBaseUrl: process.env.TRACKING_BASE_URL || process.env.API_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5001',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  systemFromEmail: process.env.SYSTEM_VERIFIED_FROM_EMAIL || 'onboarding@resend.dev',
  sendConcurrency: Math.min(Math.max(parseInt(process.env.SEND_CONCURRENCY || '12', 10) || 12, 1), 50),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  onlineBackupMongoUri: process.env.ONLINE_BACKUP_MONGODB_URI || '',
  backupScheduleHour: parseInt(process.env.BACKUP_SCHEDULE_HOUR || '2', 10),
  /** Enables Atlas Data Explorer deep links: cloud.mongodb.com/v2/<id>/explorer/... */
  atlasProjectId: process.env.ATLAS_PROJECT_ID || '',
  /** Full override URLs for "Open in Mongo" buttons (optional) */
  mongoLocalOpenUrl: process.env.MONGO_LOCAL_OPEN_URL || '',
  mongoBackupOpenUrl: process.env.MONGO_BACKUP_OPEN_URL || '',
  holysheetApiKey: process.env.HOLYSHEET_API_KEY || '',
  get holysheetUrl() {
    if (!this.holysheetApiKey) return '';
    return `https://holysheet.soneshjain.com/api/v1/${this.holysheetApiKey}/rows`;
  },
};
