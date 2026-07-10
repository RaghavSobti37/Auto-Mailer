const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('../config');

function createApp() {
  const app = express();

  // Security
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: config.corsOrigin, credentials: true }));

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
