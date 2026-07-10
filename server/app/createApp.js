const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('../config');

function buildCorsOptions(originConfig) {
  if (!originConfig || originConfig === '*') {
    return { origin: true, credentials: true };
  }

  const allowed = String(originConfig)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS origin blocked: ${origin}`));
    },
  };
}

function createApp() {
  const app = express();

  // Security
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors(buildCorsOptions(config.corsOrigin)));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Logging
  app.use(morgan('dev'));

  // Trust proxy for correct IP detection
  app.set('trust proxy', true);

  app.use(express.static(path.resolve(__dirname, '..', '..', 'public')));

  return app;
}

module.exports = createApp;
