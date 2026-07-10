const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = {
  port: parseInt(process.env.PORT || process.env.API_SERVER_PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/auto-mailer',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  appBaseUrl: process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || '',
  trackingBaseUrl: process.env.TRACKING_BASE_URL || process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '',
  systemFromEmail: process.env.SYSTEM_VERIFIED_FROM_EMAIL || process.env.SMTP_USER || 'onboarding@resend.dev',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  onlineBackupMongoUri: process.env.ONLINE_BACKUP_MONGODB_URI || '',
  backupScheduleHour: parseInt(process.env.BACKUP_SCHEDULE_HOUR || '2', 10),
  holysheetApiKey: process.env.HOLYSHEET_API_KEY || 'Z2BhkUlsA5F-wq2GQ-g5fSYu-JgfHryt',
  holysheetUrl: `https://holysheet.soneshjain.com/api/v1/${process.env.HOLYSHEET_API_KEY || 'Z2BhkUlsA5F-wq2GQ-g5fSYu-JgfHryt'}/rows`,
  isSupabaseEnabled: () => !!(module.exports.supabaseUrl && module.exports.supabaseKey),
};
