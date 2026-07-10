const express = require('express');
const router = express.Router();
const { getEmailStream } = require('../services/emailStreamService');

router.get('/', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const streams = await Campaign.distinct('emailStreamSlug', { emailStreamSlug: { $ne: null } });
    res.json(streams.filter(Boolean).map((s) => ({ slug: s, name: s })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const stream = await getEmailStream(req.params.slug);
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
