const multer = require('multer');
const mailRoutes = require('../routes/index');
const trackRoutes = require('../routes/track');
const webhookRoutes = require('../routes/webhookRoutes');
const dataHubRoutes = require('../domains/data-hub/routes');
const previewController = require('../controllers/previewController');
const recipientsController = require('../controllers/recipientsController');
const exlyAudienceController = require('../controllers/exlyAudienceController');
const analyticsController = require('../controllers/analyticsController');
const campaignApiController = require('../controllers/campaignApiController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function registerRoutes(app) {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auto-mailer', timestamp: new Date().toISOString() });
  });

  // Mail domain routes
  app.use('/api/mail', mailRoutes);

  // ============ CoreKnot-compatible campaign API ============
  // CoreKnot frontend calls /api/campaigns for campaign CRUD
  
  // GET /api/campaigns - list campaigns
  app.get('/api/campaigns', (req, res) => campaignApiController.list(req, res));
  
  // POST /api/campaigns - create campaign
  app.post('/api/campaigns', (req, res) => campaignApiController.create(req, res));
  
  // GET /api/campaigns/:id - get campaign by ID
  app.get('/api/campaigns/:id', (req, res) => campaignApiController.getById(req, res));
  
  // DELETE /api/campaigns/:id - delete campaign
  app.delete('/api/campaigns/:id', (req, res) => campaignApiController.remove(req, res));
  
  // GET /api/campaigns/:id/analytics - campaign analytics
  app.get('/api/campaigns/:id/analytics', (req, res) => recipientsController.analytics(req, res));
  
  // GET /api/campaigns/:id/recipients - campaign recipients with pagination
  app.get('/api/campaigns/:id/recipients', (req, res) => recipientsController.listRecipients(req, res));
  
  // POST /api/campaigns/:id/dispatch - dispatch campaign
  app.post('/api/campaigns/:id/dispatch', (req, res) => campaignApiController.dispatch(req, res));
  
  // POST /api/campaigns/:id/stop - stop campaign
  app.post('/api/campaigns/:id/stop', (req, res) => campaignApiController.stop(req, res));
  
  // POST /api/campaigns/:id/resend - resend campaign
  app.post('/api/campaigns/:id/resend', (req, res) => recipientsController.resend(req, res));
  
  // POST /api/campaigns/:id/resend-filtered - resend filtered recipients
  app.post('/api/campaigns/:id/resend-filtered', (req, res) => recipientsController.resendFiltered(req, res));
  
  // POST /api/campaigns/upload-attachment - upload attachment
  app.post('/api/campaigns/upload-attachment', upload.single('file'), (req, res) => previewController.uploadAttachment(req, res));

  // ============ CoreKnot-compatible mail API ============
  
  // POST /api/mail/preview - render email preview
  app.post('/api/mail/preview', (req, res) => previewController.preview(req, res));
  
  // POST /api/mail/test-campaign - send test email
  app.post('/api/mail/test-campaign', (req, res) => previewController.testCampaign(req, res));
  
  // POST /api/mail/scan-bounces - scan for bounces
  app.post('/api/mail/scan-bounces', (req, res) => previewController.scanBounces(req, res));
  
  // GET /api/mail/stats - mail stats (CoreKnot compatible alias)
  app.get('/api/mail/stats', (req, res) => analyticsController.getStats(req, res));

  // ============ Audience endpoints (Exly / Data Hub) ============
  
  // GET /api/mail/audience/exly/offerings
  app.get('/api/mail/audience/exly/offerings', (req, res) => exlyAudienceController.listOfferings(req, res));
  
  // GET /api/mail/audience/exly
  app.get('/api/mail/audience/exly', (req, res) => exlyAudienceController.listAudience(req, res));
  
  // GET /api/mail/audience/data-hub/folders
  app.get('/api/mail/audience/data-hub/folders', (req, res) => exlyAudienceController.listDataHubFolders(req, res));
  
  // GET /api/mail/audience/data-hub
  app.get('/api/mail/audience/data-hub', (req, res) => exlyAudienceController.listDataHubAudience(req, res));

  // ============ Public tracking endpoints ============
  
  // GET /api/track/email-streams (CoreKnot frontend uses this)
  app.get('/api/track/email-streams', async (req, res) => {
    try {
      const Campaign = require('../models/Campaign');
      const streams = await Campaign.distinct('emailStreamSlug', { emailStreamSlug: { $ne: null } });
      res.json(streams.filter(Boolean).map((s) => ({ slug: s, name: s })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crm/sync-unsubscribed (CoreKnot frontend - placeholder)
  app.post('/api/crm/sync-unsubscribed', (req, res) => {
    res.json({ success: true, message: 'Unsubscribe sync placeholder' });
  });

  // POST /api/crm/unsubscribe (CoreKnot compatible)
  app.post('/api/crm/unsubscribe', async (req, res) => {
    try {
      const { email, reason } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });
      
      const Campaign = require('../models/Campaign');
      const cleanEmail = email.toLowerCase().trim();
      
      await Campaign.updateMany(
        { 'recipients.email': cleanEmail },
        {
          $set: {
            'recipients.$.status': 'Unsubscribed',
          },
        },
      );
      
      res.json({ success: true, message: 'Unsubscribed successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Local Data Hub routes
  app.use('/api/data-hub', dataHubRoutes);

  // Tracking routes (open/click pixels, unsubscribe)
  app.use('/track', trackRoutes);

  // Webhooks (Resend)
  app.use('/webhooks', webhookRoutes);

  // Config endpoint
  app.get('/api/config', (req, res) => {
    res.json({
      apiUrl: `${req.protocol}://${req.get('host')}`,
      service: 'auto-mailer',
      version: '1.0',
    });
  });
}

module.exports = registerRoutes;
