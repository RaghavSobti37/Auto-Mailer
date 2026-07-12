const multer = require('multer');
const mailRoutes = require('../routes/index');
const trackRoutes = require('../routes/track');
const webhookRoutes = require('../routes/webhookRoutes');
const previewController = require('../controllers/previewController');
const recipientsController = require('../controllers/recipientsController');
const exlyAudienceController = require('../controllers/exlyAudienceController');
const analyticsController = require('../controllers/analyticsController');
const campaignApiController = require('../controllers/campaignApiController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function registerRoutes(app) {
  // Auth
  app.post('/api/auth/verify', (req, res) => {
    const { apiKey } = req.body || {};
    // ponytail: Render still has legacy API_KEY env var
    const configuredKey = process.env.AUTO_MAILER_API_KEY || process.env.API_KEY || 'dev-key-123';
    if (apiKey === configuredKey) return res.json({ success: true });
    res.status(401).json({ error: 'Invalid API key' });
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auto-mailer', timestamp: new Date().toISOString() }));

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

  // Audience API (Person collection)
  app.get('/api/audience', async (req, res) => {
    try {
      const Person = require('../models/Person');
      const q = req.query;
      const page = Math.max(parseInt(q.page) || 0, 0);
      const limit = Math.min(parseInt(q.limit) || 50, 200);
      const filter = {};

      if (q.search) {
        const searchStr = String(q.search).slice(0, 100);
        const esc = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { email: { $regex: esc, $options: 'i' } },
          { name: { $regex: esc, $options: 'i' } },
          { phone: { $regex: esc, $options: 'i' } },
          { normalizedPhone: { $regex: esc, $options: 'i' } },
        ];
      }

      const [items, total] = await Promise.all([
        Person.find(filter).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean(),
        Person.countDocuments(filter),
      ]);

      res.json({ items, total, page, limit });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/audience/:id', async (req, res) => {
    try {
      const Person = require('../models/Person');
      const person = await Person.findById(req.params.id).lean();
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
  app.post('/api/whatsapp/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: 'CSV file required' });
      const text = req.file.buffer.toString('utf8').trim();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return res.json({ totalRows: 0, matched: 0, unmatched: 0, needsReview: 0, importBatchId: null });

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });

      const { importAiSensyRows } = require('../domains/whatsapp/importService');
      res.json(await importAiSensyRows(rows, {
        linkedCampaignId: req.body.linkedCampaignId || undefined,
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
      const items = await WhatsAppEvent.find().sort({ timestamp: -1 }).limit(500).lean();
      res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Mirror Sync
  app.get('/api/mirror/sync-status', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const stateFile = path.join(__dirname, '..', '..', '.sync-state.json');
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const stalenessMinutes = state.lastSyncAt ? Math.floor((Date.now() - new Date(state.lastSyncAt).getTime()) / 60000) : 0;
        res.json({ lastSyncAt: state.lastSyncAt, rowsSynced: state.rowsSynced || 0, method: 'scheduled', isHealthy: !state.lastErrorAt || stalenessMinutes < 60, stalenessMinutes });
      } else {
        res.json({ lastSyncAt: null, rowsSynced: 0, method: 'scheduled', isHealthy: false, stalenessMinutes: 0 });
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/mirror/sync-now', async (req, res) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      const script = path.join(__dirname, '..', '..', 'scripts', 'sync-worker.js');
      spawn(process.execPath, [script], {
        cwd: path.join(__dirname, '..', '..'),
        detached: true,
        stdio: 'ignore',
      }).unref();
      res.json({ message: 'Sync started' });
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
