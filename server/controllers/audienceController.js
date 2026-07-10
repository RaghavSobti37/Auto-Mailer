const { listCampaignAudienceContacts, listAudienceFolders } = require('../services/campaignAudienceService');
const { resolveCampaignEngagementByEmails } = require('../services/campaignEngagementService');

/**
 * Audience controller - manages recipient lists and audience data.
 */

exports.listAudience = async (req, res) => {
  try {
    const { search = '', limit, engagement = 'all', folder = 'all' } = req.query;
    const result = await listCampaignAudienceContacts({ search, limit, engagement, folder });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAudienceStats = async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const MailCampaign = require('../models/MailCampaign');
    const [campaigns, mailCampaigns] = await Promise.all([
      Campaign.find({}).select('recipients').lean(),
      MailCampaign.find({}).select('recipients').lean(),
    ]);
    let total = 0, sent = 0, opened = 0, clicked = 0, bounced = 0;
    for (const camp of [...campaigns, ...mailCampaigns]) {
      for (const r of camp.recipients || []) {
        total++;
        if (['Sent', 'Opened', 'Clicked'].includes(r.status)) sent++;
        if (['Opened', 'Clicked'].includes(r.status)) opened++;
        if (r.status === 'Clicked') clicked++;
        if (['Bounced', 'Failed'].includes(r.status)) bounced++;
      }
    }
    res.json({ total, sent, opened, clicked, bounced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resolveEngagement = async (req, res) => {
  try {
    const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const engagement = await resolveCampaignEngagementByEmails(emails);
    res.json({ engagement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listFolders = async (req, res) => {
  try {
    const result = await listAudienceFolders();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
