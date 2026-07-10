const mailRoutes = require('../routes/index');
const trackRoutes = require('../routes/track');
const webhookRoutes = require('../routes/webhookRoutes');
const dataHubRoutes = require('../domains/data-hub/routes');
const systemRoutes = require('../routes/systemRouter');

function registerRoutes(app) {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auto-mailer', timestamp: new Date().toISOString() });
  });

  // Mail domain routes
  app.use('/api/mail', mailRoutes);

  // Local Data Hub routes
  app.use('/api/data-hub', dataHubRoutes);

  // Local system controls (Docker/Data Hub boot)
  app.use('/api/system', systemRoutes);

  // Tracking routes (open/click pixels, unsubscribe)
  app.use('/track', trackRoutes);

  // Webhooks (Resend)
  app.use('/webhooks', webhookRoutes);

  // Config endpoint
  app.get('/api/config', (req, res) => {
    const config = require('../config');
    res.json({
      apiUrl: `${req.protocol}://${req.get('host')}`,
      service: 'auto-mailer',
      version: '1.0',
    });
  });
}

module.exports = registerRoutes;
