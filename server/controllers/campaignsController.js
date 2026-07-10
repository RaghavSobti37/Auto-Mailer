const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');
const { dispatchCampaignJobs } = require('../services/campaignEmailQueue');

exports.list = async (req, res) => {
  try {
    const campaigns = await MailCampaign.find({}).sort('-createdAt').lean();
    for (const camp of campaigns) {
      const total = camp.recipients?.length || 0;
      let sent = 0; let opened = 0; let clicked = 0; let bounced = 0; let unsubscribed = 0; let invalid = 0;
      camp.recipients?.forEach((r) => {
        if (r.status === 'Sent') sent++;
        if (r.status === 'Opened') { sent++; opened++; }
        if (r.status === 'Clicked') { sent++; opened++; clicked++; }
        if (r.status === 'Bounced' || r.status === 'Failed') bounced++;
        if (r.status === 'Invalid') { bounced++; invalid++; }
        if (r.status === 'Unsubscribed') unsubscribed++;
      });
      camp.stats = { total, sent, opened, clicked, bounced, unsubscribed, invalid };
    }
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { customRecipients, ...rest } = req.body;
    const custom = (Array.isArray(customRecipients) ? customRecipients : []).flatMap((r) => {
      const emails = r && r.email ? String(r.email).toLowerCase().split(/[,;]/).map((e) => e.trim()).filter(Boolean) : [];
      return emails.map((email) => ({ email, status: 'Pending' }));
    });

    const uniqueEmails = new Set();
    const allRecipients = custom.filter((r) => {
      if (uniqueEmails.has(r.email)) return false;
      uniqueEmails.add(r.email);
      return true;
    });

    const campaign = await MailCampaign.create({
      ...rest,
      attachments: rest.attachments || [],
      recipients: allRecipients,
      stats: { total: allRecipients.length, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, invalid: 0 },
    });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const campaign = await MailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const result = await dispatchCampaignJobs(req.params.id);
    res.json({ message: 'Campaign dispatch started', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const campaign = await MailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    await MailCampaign.findByIdAndDelete(req.params.id);
    await MailEvent.deleteMany({ campaignId: req.params.id });
    res.json({ message: 'Campaign and related tracking data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
