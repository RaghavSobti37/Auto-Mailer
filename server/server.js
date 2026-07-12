require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const createApp = require('./app/createApp');
const registerRoutes = require('./app/registerRoutes');

async function startServer() {
  console.log('[Auto-Mailer] Starting...');

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('[Auto-Mailer] MongoDB connected');
  } catch (err) {
    console.error('[Auto-Mailer] MongoDB connection error:', err.message);
    process.exit(1);
  }

  const app = createApp();
  registerRoutes(app);

  // Error handling middleware
  app.use((err, req, res, _next) => {
    console.error('[Auto-Mailer] Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  app.listen(config.port, async () => {
    console.log(`[Auto-Mailer] Server running on port ${config.port}`);

    // Resume any campaigns stuck in 'Sending' state (works without Redis)
    try {
      const { resumeStuckCampaigns } = require('./services/campaignEmailQueue');
      await resumeStuckCampaigns();
    } catch (err) {
      console.warn('[Auto-Mailer] Failed to resume stuck campaigns:', err.message);
    }

    // Initialize campaign worker if Redis is available
    try {
      const { initCampaignWorker } = require('./workers/campaignEmailWorker');
      initCampaignWorker().catch(err => {
        console.warn('[Auto-Mailer] Campaign worker init failed (Redis may be unavailable):', err.message);
      });
    } catch (err) {
      console.warn('[Auto-Mailer] Campaign worker not available:', err.message);
    }

    console.log('[Auto-Mailer] Online Mongo backup is manual-only. Use Settings -> Back up now.');
  });
}

startServer().catch(err => {
  console.error('[Auto-Mailer] Fatal startup error:', err);
  process.exit(1);
});
