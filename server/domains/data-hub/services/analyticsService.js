const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const MailEvent = require('../../../models/MailEvent');
const EmailLog = require('../../../models/EmailLog');
const CampaignChannelOutcome = require('../../../models/CampaignChannelOutcome');

async function getOverlapMatrix() {
  return [];
}

async function getAnalytics(folder = 'all') {
  const totalCampaigns = await Campaign.countDocuments({});
  const totalMailCampaigns = await MailCampaign.countDocuments({});
  const totalEvents = await MailEvent.countDocuments({});
  const totalPeople = await EmailLog.countDocuments({});
  const whatsappRows = await CampaignChannelOutcome.countDocuments({});
  const whatsappActive = await CampaignChannelOutcome.countDocuments({ activityScore: { $gte: 3 } });

  const emailHealth = await MailEvent.aggregate([
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
  ]);

  return {
    folder,
    label: folder === 'all' ? 'All Data' : folder,
    totalPeople,
    totalCampaigns: totalCampaigns + totalMailCampaigns,
    kpis: [
      { key: 'totalPeople', label: 'People', value: totalPeople },
      { key: 'totalEvents', label: 'Total Events', value: totalEvents },
      { key: 'totalCampaigns', label: 'Campaigns', value: totalCampaigns + totalMailCampaigns },
      { key: 'whatsappRows', label: 'WhatsApp rows', value: whatsappRows },
      { key: 'whatsappActive', label: 'WA active', value: whatsappActive },
    ],
    emailHealth: emailHealth.map((r) => ({ status: r._id || 'Unknown', count: r.count })),
    growth: [],
    overlap: [],
  };
}

module.exports = { getAnalytics, getOverlapMatrix };
