const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const MailEvent = require('../../../models/MailEvent');

async function getOverlapMatrix() {
  return [];
}

async function getAnalytics(folder = 'all') {
  const totalCampaigns = await Campaign.countDocuments({});
  const totalMailCampaigns = await MailCampaign.countDocuments({});
  const totalEvents = await MailEvent.countDocuments({});

  const emailHealth = await MailEvent.aggregate([
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
  ]);

  return {
    folder,
    label: folder === 'all' ? 'All Data' : folder,
    totalPeople: totalEvents,
    totalCampaigns: totalCampaigns + totalMailCampaigns,
    kpis: [
      { key: 'totalEvents', label: 'Total Events', value: totalEvents },
      { key: 'totalCampaigns', label: 'Campaigns', value: totalCampaigns + totalMailCampaigns },
    ],
    emailHealth: emailHealth.map((r) => ({ status: r._id || 'Unknown', count: r.count })),
    growth: [],
    overlap: [],
  };
}

module.exports = { getAnalytics, getOverlapMatrix };
