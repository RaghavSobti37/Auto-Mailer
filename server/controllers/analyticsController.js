const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailEvent = require('../models/MailEvent');

exports.getStats = async (req, res) => {
  try {
    const [mailCampaigns, coreCampaigns] = await Promise.all([
      MailCampaign.find({}).select('-recipients -content').lean(),
      Campaign.find({}).select('-recipients -content').lean(),
    ]);
    const allCampaigns = [...mailCampaigns, ...coreCampaigns];

    let totalCampaigns = allCampaigns.length;
    let totalSent = 0; let totalOpened = 0; let totalClicked = 0; let totalBounced = 0;

    allCampaigns.forEach((camp) => {
      const stats = camp.stats || {};
      const metrics = camp.metrics || {};
      totalSent += metrics.totalSent ?? stats.sent ?? 0;
      totalOpened += metrics.opened ?? stats.opened ?? 0;
      totalClicked += metrics.clicked ?? stats.clicked ?? 0;
      totalBounced += metrics.bounced ?? stats.bounced ?? 0;
    });

    res.json({ totalCampaigns, totalSent, totalBounced, totalOpened, totalClicked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
