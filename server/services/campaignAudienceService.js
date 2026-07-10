const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const EmailLog = require('../models/EmailLog');
const { normalizeEmail, isValidEmail } = require('../utils/emailValidation');
const { filterContactsByEngagement } = require('./campaignEngagementService');

function sanitizeInletKeys(keys = []) {
  const arr = Array.isArray(keys) ? keys : [keys];
  return [...new Set(arr.map((k) => String(k || '').trim()).filter(Boolean))];
}

function contactToRowData(contact) {
  return {
    name: contact.name || '',
    email: contact.email || '',
    source: contact.source || 'Campaign',
  };
}

async function listCampaignAudienceContacts({
  search = '', limit = 100000, engagement = 'all', folder = 'all',
} = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100000, 1), 100000);

  // Gather recipients from both Campaign and MailCampaign models
  const campaigns = await Campaign.find({}).select('recipients').lean();
  const mailCampaigns = await MailCampaign.find({}).select('recipients').lean();

  const allRecipients = [];
  for (const camp of campaigns) {
    for (const r of (camp.recipients || [])) {
      allRecipients.push({ ...r, source: 'Campaign' });
    }
  }
  for (const camp of mailCampaigns) {
    for (const r of (camp.recipients || [])) {
      allRecipients.push({ ...r, source: 'MailCampaign' });
    }
  }

  // Deduplicate by email
  const byEmail = new Map();
  for (const r of allRecipients) {
    const email = normalizeEmail(r.email);
    if (!email || !isValidEmail(email)) continue;
    if (search && !email.includes(search.toLowerCase())) continue;

    if (!byEmail.has(email)) {
      byEmail.set(email, {
        _id: `camp:${email}`,
        name: (r.name || '').trim(),
        email,
        status: r.status || 'Pending',
        source: r.source || 'Campaign',
        rowData: {},
      });
    }
  }

  let contacts = Array.from(byEmail.values()).slice(0, safeLimit);
  contacts = contacts.map((c) => ({ ...c, rowData: contactToRowData(c) }));
  contacts = await filterContactsByEngagement(contacts, engagement);

  return { contacts, total: contacts.length };
}

async function listAudienceFolders() {
  const totalRecipients = await Campaign.aggregate([
    { $unwind: '$recipients' },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);
  const totalMailRecipients = await MailCampaign.aggregate([
    { $unwind: '$recipients' },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  const total = (totalRecipients[0]?.count || 0) + (totalMailRecipients[0]?.count || 0);

  return {
    folders: [
      { key: 'all', label: 'All Contacts', count: total },
      { key: 'campaign', label: 'Campaign Recipients', count: totalRecipients[0]?.count || 0 },
    ],
  };
}

module.exports = {
  listCampaignAudienceContacts,
  listAudienceFolders,
  contactToRowData,
  sanitizeInletKeys,
};
