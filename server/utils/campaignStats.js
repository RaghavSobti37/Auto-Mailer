const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');

async function computeRecipientStats(campaignId) {
  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) return { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0 };

  const recipients = campaign.recipients || [];
  const stats = { total: recipients.length, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, invalid: 0 };

  for (const r of recipients) {
    switch (r.status) {
      case 'Sent': stats.sent++; break;
      case 'Opened': stats.sent++; stats.opened++; break;
      case 'Clicked': stats.sent++; stats.opened++; stats.clicked++; break;
      case 'Bounced': case 'Failed': stats.bounced++; break;
      case 'Invalid': stats.bounced++; stats.invalid++; break;
      case 'Unsubscribed': stats.unsubscribed++; break;
    }
  }
  return stats;
}

async function aggregateRecipientStats(Model, campaignId) {
  const pipeline = [
    { $match: { _id: campaignId } },
    { $unwind: { path: '$recipients', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$recipients.status', ['Sent', 'Opened', 'Clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $in: ['$recipients.status', ['Opened', 'Clicked']] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$recipients.status', 'Clicked'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $in: ['$recipients.status', ['Bounced', 'Failed', 'Invalid']] }, 1, 0] } },
      },
    },
  ];

  const results = await Model.aggregate(pipeline);
  return results[0] || { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0 };
}

module.exports = {
  computeRecipientStats,
  aggregateRecipientStats,
};
