const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('../config');

function resolveCorsOrigin(value) {
  if (!value || value === '*') return true;
  const origins = value.split(',').map((item) => item.trim()).filter(Boolean);
  return (origin, callback) => {
    const allowedVercel =
      origin
      && /^https:\/\/auto-mailer(?:-[a-z0-9-]+)?(?:-raghavsobti37s-projects)?\.vercel\.app$/i.test(origin);
    if (!origin || origins.includes(origin) || allowedVercel) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for ${origin}`));
  };
}

function createApp() {
  const app = express();

  // Security
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  const corsOptions = {
    origin: resolveCorsOrigin(config.corsOrigin),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Logging
  app.use(morgan('dev'));

  // Trust proxy for correct IP detection
  app.set('trust proxy', true);

  return app;
}

module.exports = createApp;
