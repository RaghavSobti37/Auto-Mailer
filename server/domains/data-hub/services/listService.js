const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const EmailLog = require('../../../models/EmailLog');

async function listPeople({ folder, search, page, limit, campaign, originSource, emailStatus, sort, order }) {
  const skip = (page - 1) * limit;
  const query = {};
  const sortField = { updatedAt: -1 };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { name: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Use EmailLog as the primary data source for campaign contacts
  let data = [];
  let total = 0;

  if (folder === 'all' || folder === 'mail') {
    const emailLogs = await EmailLog.find(query)
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .lean();
    total = await EmailLog.countDocuments(query);
    data = emailLogs.map((log) => ({
      _id: log._id,
      email: log.leadEmail,
      name: log.leadEmail ? log.leadEmail.split('@')[0] : '',
      opened: log.opened,
      clicked: log.clicked,
      bounced: log.bounced,
      campaignId: log.campaignId,
      updatedAt: log.updatedAt,
      createdAt: log.createdAt,
    }));
  } else {
    // For campaign-specific folders, get from Campaign models
    const campaigns = await Campaign.find({ status: 'Completed' }).select('recipients').lean();
    const allRecipients = campaigns.flatMap((c) => (c.recipients || []).map((r) => ({ ...r, campaignId: c._id })));

    const emailSet = new Set();
    const unique = allRecipients.filter((r) => {
      if (!r.email || emailSet.has(r.email)) return false;
      emailSet.add(r.email);
      return true;
    });

    total = unique.length;
    data = unique.slice(skip, skip + limit).map((r) => ({
      _id: r._id || r.email,
      email: r.email,
      name: r.name || '',
      status: r.status,
      campaignId: r.campaignId,
    }));
  }

  return { data, total, page, pages: Math.ceil(total / limit) || 0 };
}

async function getFolderCounts() {
  const totalPeople = await EmailLog.distinct('leadEmail').then((emails) => emails.length);
  const bounced = await EmailLog.countDocuments({ bounced: true });
  const opened = await EmailLog.countDocuments({ opened: true });
  const campaigns = await Campaign.countDocuments({});
  return {
    folders: [
      { key: 'all', label: 'All Contacts', count: totalPeople },
      { key: 'active', label: 'Active', count: opened },
      { key: 'bounced', label: 'Bounced', count: bounced },
      { key: 'campaigns', label: 'Campaigns', count: campaigns },
    ],
    counts: { all: totalPeople, active: opened, bounced },
    groups: [],
  };
}

module.exports = { listPeople, getFolderCounts };
