const express = require('express');
const { dockerComposeUp, dockerStatus, getDatabaseStatus } = require('../services/systemService');
const { syncAllInlets } = require('../domains/data-hub/services/syncService');

const router = express.Router();

router.get('/status', async (_req, res) => {
  const [docker, database] = await Promise.all([
    dockerStatus(),
    getDatabaseStatus(),
  ]);
  res.json({ docker, database });
});

router.post('/docker/up', async (_req, res) => {
  const result = await dockerComposeUp();
  res.status(result.ok ? 200 : 500).json(result);
});

router.post('/local-data/start-and-sync', async (req, res) => {
  const docker = await dockerComposeUp();
  if (!docker.ok) return res.status(500).json({ docker, error: 'Docker startup failed' });
  const full = req.query.full === 'true' || req.body?.full === true;
  const sync = await syncAllInlets({ full, incremental: !full });
  res.json({ docker, sync });
});

module.exports = router;
