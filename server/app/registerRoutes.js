const mongoose = require('mongoose');
const multer = require('multer');
const mailRoutes = require('../routes/index');
const trackRoutes = require('../routes/track');
const webhookRoutes = require('../routes/webhookRoutes');
const transactionalRoutes = require('../routes/transactionalRouter');
const previewController = require('../controllers/previewController');
const recipientsController = require('../controllers/recipientsController');
const exlyAudienceController = require('../controllers/exlyAudienceController');
const analyticsController = require('../controllers/analyticsController');
const campaignApiController = require('../controllers/campaignApiController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 75 * 1024 * 1024, files: 50 },
});

function registerRoutes(app) {
  // Health check (standalone — no DB required)
  app.get('/health', (req, res) => {
    const mongooseStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      service: 'auto-mailer',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      db: mongooseStatus,
      uptime: process.uptime(),
    });
  });

  // Root redirect for easy verification
  app.get('/', (req, res) => {
    res.json({
      name: 'Auto-Mailer',
      description: 'Standalone email campaign and automation service. Referenced by CoreKnot for transactional email dispatch.',
      version: '1.0.0',
      docs: '/health',
      timestamp: new Date().toISOString(),
    });
  });

  // Mail domain routes
  app.use('/api/mail', mailRoutes);

  // Campaigns
  app.get('/api/campaigns', (req, res) => campaignApiController.list(req, res));
  app.post('/api/campaigns', (req, res) => campaignApiController.create(req, res));
  app.get('/api/campaigns/:id', (req, res) => campaignApiController.getById(req, res));
  app.delete('/api/campaigns/:id', (req, res) => campaignApiController.remove(req, res));
  app.get('/api/campaigns/:id/analytics', (req, res) => recipientsController.analytics(req, res));
  app.get('/api/campaigns/:id/recipients', (req, res) => recipientsController.listRecipients(req, res));
  app.post('/api/campaigns/:id/dispatch', (req, res) => campaignApiController.dispatch(req, res));
  app.post('/api/campaigns/:id/stop', (req, res) => campaignApiController.stop(req, res));
  app.post('/api/campaigns/:id/resend', (req, res) => recipientsController.resend(req, res));
  app.post('/api/campaigns/:id/resend-filtered', (req, res) => recipientsController.resendFiltered(req, res));
  app.post('/api/campaigns/upload-attachment', upload.single('file'), (req, res) => previewController.uploadAttachment(req, res));

  // Mail API
  app.post('/api/mail/preview', (req, res) => previewController.preview(req, res));
  app.post('/api/mail/test-campaign', (req, res) => previewController.testCampaign(req, res));
  app.post('/api/mail/scan-bounces', (req, res) => previewController.scanBounces(req, res));
  app.get('/api/mail/stats', (req, res) => analyticsController.getStats(req, res));
  app.get('/api/mail/templates', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const filter = req.query.status ? { status: req.query.status } : {};
      const templates = await MailTemplate.find(filter).sort({ createdAt: -1 }).lean();
      res.json(templates);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.get('/api/mail/templates/:id', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const template = await MailTemplate.findById(req.params.id).lean();
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/mail/templates', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const template = await MailTemplate.create(req.body);
      res.status(201).json(template);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.patch('/api/mail/templates/:id', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const template = await MailTemplate.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/mail/templates/:id/approve', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const t = await MailTemplate.findById(req.params.id);
      if (!t) return res.status(404).json({ error: 'Not found' });
      t.status = 'approved'; t.approvedContent = t.content; t.approvedAt = new Date(); t.approvedBy = req.body.approvedBy || 'system';
      await t.save();
      res.json(t);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/mail/templates/:id/reject', async (req, res) => {
    try {
      const MailTemplate = require('../models/MailTemplate');
      const t = await MailTemplate.findById(req.params.id);
      if (!t) return res.status(404).json({ error: 'Not found' });
      t.status = 'rejected'; t.rejectionNote = req.body.note || ''; await t.save();
      res.json(t);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Audience
  app.get('/api/mail/audience/exly/offerings', (req, res) => exlyAudienceController.listOfferings(req, res));
  app.get('/api/mail/audience/exly', (req, res) => exlyAudienceController.listAudience(req, res));
  app.get('/api/mail/audience/data-hub/folders', (req, res) => exlyAudienceController.listDataHubFolders(req, res));
  app.get('/api/mail/audience/data-hub', (req, res) => exlyAudienceController.listDataHubAudience(req, res));

  // Tracking
  app.get('/api/track/email-streams', async (req, res) => {
    try {
      const Campaign = require('../models/Campaign');
      const streams = await Campaign.distinct('emailStreamSlug', { emailStreamSlug: { $ne: null } });
      res.json(streams.filter(Boolean).map((s) => ({ slug: s, name: s })));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/crm/sync-unsubscribed', (req, res) => res.json({ success: true, message: 'Placeholder' }));
  app.post('/api/crm/unsubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });
      const Campaign = require('../models/Campaign');
      const { updateEmailTags } = require('../services/mailService');
      await Campaign.updateMany({ 'recipients.email': email.toLowerCase().trim() }, { $set: { 'recipients.$.status': 'Unsubscribed' } });
      await updateEmailTags(email, 'unsubscribed', 'Unsubscribed');
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Handle data-hub routes if directory exists
  try {
    const dataHubRoutes = require('../domains/data-hub/routes');
    app.use('/api/data-hub', dataHubRoutes);
  } catch { /* data-hub routes not available */ }

  app.use('/track', trackRoutes);
  app.use('/webhooks', webhookRoutes);
  app.use('/api/transactional', transactionalRoutes);

  // Audience API (PersonHubView read model — no CoreKnot sync worker)
  app.get('/api/audience/tags', async (req, res) => {
    try {
      const { listAudienceTagsFromHub } = require('../services/audienceReadService');
      res.json({ tags: await listAudienceTagsFromHub() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/audience', async (req, res) => {
    try {
      const { listAudienceFromHub } = require('../services/audienceReadService');
      const q = req.query;
      const result = await listAudienceFromHub({
        page: q.page,
        limit: q.limit,
        search: q.search,
        tag: q.tag,
        suppressed: q.suppressed,
        emailStatus: q.emailStatus,
        sort: q.sort,
        order: q.order,
      });
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/audience/:id', async (req, res) => {
    try {
      const { getAudiencePersonFromHub } = require('../services/audienceReadService');
      const person = await getAudiencePersonFromHub(req.params.id);
      if (!person) return res.status(404).json({ error: 'Person not found' });
      res.json(person);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // System Health
  app.get('/api/system/health', async (req, res) => {
    try {
      const { getSystemHealth } = require('../domains/system/healthService');
      res.json(await getSystemHealth());
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // WhatsApp / AiSensy
  app.post('/api/whatsapp/import', upload.any(), async (req, res) => {
    try {
      const files = (req.files || []).filter((file) => file?.buffer);
      if (!files.length) return res.status(400).json({ error: 'At least one CSV file is required' });
      const { importAiSensyFiles } = require('../domains/whatsapp/importService');
      res.json(await importAiSensyFiles(files, {
        linkedCampaignId: req.body.linkedCampaignId || undefined,
        syncAfter: req.body.syncAfter !== 'false',
      }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/whatsapp/review', async (req, res) => {
    try {
      const WhatsAppEvent = require('../models/WhatsAppEvent');
      const items = await WhatsAppEvent.find({ needsReview: true }).sort({ createdAt: -1 }).limit(200).lean();
      res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/whatsapp/review/:id', async (req, res) => {
    try {
      const WhatsAppEvent = require('../models/WhatsAppEvent');
      const Person = require('../models/Person');
      const event = await WhatsAppEvent.findById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Not found' });

      if (req.body.action === 'create') {
        const person = await Person.create({
          phone: event.phone,
          normalizedPhone: event.normalizedPhone,
          name: event.name,
          channel: 'whatsapp',
        });
        event.matchedToPersonId = person._id;
        event.needsReview = false;
        await event.save();
        return res.json({ success: true, personId: person._id });
      }

      if (req.body.action === 'discard') {
        event.needsReview = false;
        await event.save();
        return res.json({ success: true, discarded: true });
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/whatsapp/outcomes', async (req, res) => {
    try {
      const WhatsAppEvent = require('../models/WhatsAppEvent');
      const [counts, uniqueContacts] = await Promise.all([
        WhatsAppEvent.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        WhatsAppEvent.distinct('normalizedPhone'),
      ]);
      const byStatus = Object.fromEntries(counts.map((item) => [item._id, item.count]));
      res.json({
        counts: byStatus,
        totalEvents: counts.reduce((sum, item) => sum + item.count, 0),
        uniqueContacts: uniqueContacts.filter(Boolean).length,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Online backup (background worker)
  app.post('/api/backup/run', (req, res) => {
    try {
      const { startBackupRun, getBackupStatus } = require('../services/backupWorker');
      const started = startBackupRun();
      if (!started.started) return res.status(409).json({ error: started.reason, status: started.status });
      res.status(202).json({ message: 'Backup started', status: getBackupStatus() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.get('/api/backup/status', (req, res) => {
    try {
      const { getBackupStatus } = require('../services/backupWorker');
      res.json(getBackupStatus());
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Sync Atlas → local Mongo (background worker; requires LOCAL_MONGODB_URI + mongodump)
  app.post('/api/sync/local/run', (req, res) => {
    try {
      const { startSyncLocalRun, getSyncLocalStatus } = require('../services/syncLocalWorker');
      const started = startSyncLocalRun();
      if (!started.started) return res.status(started.reason?.includes('not configured') ? 400 : 409).json({ error: started.reason, status: started.status });
      res.status(202).json({ message: 'Local sync started', status: getSyncLocalStatus() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.get('/api/sync/local/status', (req, res) => {
    try {
      const { getSyncLocalStatus } = require('../services/syncLocalWorker');
      res.json(getSyncLocalStatus());
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

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
