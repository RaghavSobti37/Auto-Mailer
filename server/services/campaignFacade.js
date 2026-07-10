const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');

const isObjectIdHex = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

async function resolveCampaignByParam(id, options = {}) {
  if (!id || id === 'undefined' || id === 'null') return null;

  const key = String(id).trim();
  const { populate = false, lean = false, excludeRecipients = false } = options;

  const applyQuery = (query, isLegacy = false) => {
    if (excludeRecipients) query = query.select('-recipients');
    if (populate && !isLegacy) {
      query = query.populate('recipients.leadId', 'name email location city phone status')
        .populate('senderProfileId')
        .populate('senderProfileIds');
    } else if (populate && isLegacy) {
      query = query.populate('recipients.leadId', 'name email location city phone status')
        .populate('senderProfileId');
    }
    if (lean) query = query.lean();
    return query;
  };

  let campaign = await applyQuery(Campaign.findOne({ campaignId: key }));
  let isLegacy = false;

  if (!campaign && isObjectIdHex(key)) {
    campaign = await applyQuery(Campaign.findById(key));
  }

  if (!campaign && isObjectIdHex(key)) {
    campaign = await applyQuery(MailCampaign.findById(key), true);
    isLegacy = !!campaign;
  }

  if (!campaign) return null;

  return {
    campaign,
    isLegacy,
    Model: isLegacy ? MailCampaign : Campaign,
  };
}

module.exports = {
  Campaign,
  MailCampaign,
  resolveCampaignByParam,
  isObjectIdHex,
};
