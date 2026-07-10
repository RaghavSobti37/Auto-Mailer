const config = require('../config');
const https = require('https');

async function fetchHolysheetRows() {
  return new Promise((resolve, reject) => {
    https.get(config.holysheetUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function appendHolysheetRow(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.holysheetUrl);
    const postData = JSON.stringify(payload);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.getUnsubscribes = async (req, res) => {
  try {
    const data = await fetchHolysheetRows();
    const rows = Array.isArray(data) ? data : (data?.data || []);
    const unsubs = rows
      .filter((row) => row.email)
      .map((row) => ({ email: row.email, reason: row.reason || '', timestamp: row.timestamp || '' }));
    res.json(unsubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addUnsubscribe = async (req, res) => {
  try {
    const { email, campaign, reason, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const result = await appendHolysheetRow({
      email: email.toLowerCase().trim(),
      campaign: campaign || 'manual',
      reason: reason || 'No reason provided',
      name: name || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
