/**
 * Exly Audience Controller
 * Handles Exly offering/audience data for campaign audience selection.
 * In standalone mode, returns limited data; extends to full CRM integration when available.
 */
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');

/**
 * GET /api/mail/audience/exly/offerings
 * List Exly offerings (placeholder - extend with real Exly API when available).
 */
exports.listOfferings = async (req, res) => {
  try {
    // In standalone mode, extract offerings from campaign data
    const campaignData = await Campaign.find({}).select('recipients emailStreamSlug').lean();
    const offerings = [];

    // Extract unique stream slugs as offering-like data
    const slugs = new Set();
    campaignData.forEach((c) => {
      if (c.emailStreamSlug) slugs.add(c.emailStreamSlug);
    });

    slugs.forEach((slug) => {
      offerings.push({
        offeringId: slug,
        title: slug.charAt(0).toUpperCase() + slug.slice(1),
      });
    });

    res.json({ offerings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/mail/audience/exly
 * List Exly audience/contacts.
 */
exports.listAudience = async (req, res) => {
  try {
    const { search = '', offeringId, status, engagement } = req.query;

    // Gather contacts from existing campaign data
    const campaigns = await Campaign.find({}).select('recipients emailStreamSlug').lean();
    const contacts = new Map();

    campaigns.forEach((camp) => {
      (camp.recipients || []).forEach((r) => {
        if (!r.email) return;
        const email = r.email.toLowerCase().trim();
        if (search && !email.includes(search.toLowerCase())) return;

        // Filter by offering (stream slug)
        if (offeringId && offeringId !== 'all' && camp.emailStreamSlug !== offeringId) return;

        if (!contacts.has(email)) {
          contacts.set(email, {
            _id: `exly:${email}`,
            name: r.name || '',
            email,
            leadStatus: status || 'Fresh',
            emailStatus: 'Active',
            exlyOfferingTitle: camp.emailStreamSlug || '',
            exlyOfferings: camp.emailStreamSlug ? [{ title: camp.emailStreamSlug }] : [],
            rowData: { name: r.name || '', email },
          });
        }
      });
    });

    const results = Array.from(contacts.values());
    res.json({ contacts: results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/mail/audience/data-hub/folders
 * List Data Hub folders for campaign audience filtering.
 */
exports.listDataHubFolders = async (req, res) => {
  try {
    const [campAgg, mailAgg] = await Promise.all([
      Campaign.aggregate([
        { $unwind: '$recipients' },
        { $group: { _id: null, count: { $sum: 1 }, distinct: { $addToSet: '$emailStreamSlug' } } },
      ]),
      MailCampaign.aggregate([
        { $unwind: '$recipients' },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    const totalCount = (campAgg[0]?.count || 0) + (mailAgg[0]?.count || 0);
    const slugs = campAgg[0]?.distinct?.filter(Boolean) || [];

    const folders = [
      { key: 'all', label: 'All Contacts', count: totalCount },
      ...slugs.map((slug) => ({
        key: slug,
        label: slug.charAt(0).toUpperCase() + slug.slice(1),
        count: totalCount,
      })),
    ];

    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/mail/audience/data-hub
 * List Data Hub audience/contacts for campaign.
 */
exports.listDataHubAudience = async (req, res) => {
  try {
    const { search = '', folder = 'all', engagement } = req.query;

    const campaigns = await Campaign.find({}).select('recipients emailStreamSlug').lean();
    const contacts = new Map();

    campaigns.forEach((camp) => {
      (camp.recipients || []).forEach((r) => {
        if (!r.email) return;
        const email = r.email.toLowerCase().trim();
        if (search && !email.includes(search.toLowerCase())) return;
        if (folder !== 'all' && camp.emailStreamSlug !== folder) return;

        if (!contacts.has(email)) {
          contacts.set(email, {
            _id: `dh:${email}`,
            name: r.name || '',
            email,
            leadStatus: 'Fresh',
            emailStatus: 'Active',
            inletLabels: camp.emailStreamSlug ? [camp.emailStreamSlug] : [],
            rowData: { name: r.name || '', email },
          });
        }
      });
    });

    const results = Array.from(contacts.values());
    res.json({ contacts: results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
