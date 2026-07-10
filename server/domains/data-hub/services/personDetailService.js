const mongoose = require('mongoose');
const Campaign = require('../../../models/Campaign');
const MailCampaign = require('../../../models/MailCampaign');
const MailEvent = require('../../../models/MailEvent');
const EmailLog = require('../../../models/EmailLog');

const { normalizeEmail, isValidEmail } = require('../../../utils/emailValidation');

/**
 * Find a contact across all campaign models by ID or email.
 */
async function findHubContact(contactId) {
  if (!contactId) return null;

  // Try to find by ID in each model
  if (mongoose.Types.ObjectId.isValid(contactId)) {
    const oid = new mongoose.Types.ObjectId(contactId);
    const [camp, mailCamp] = await Promise.all([
      Campaign.findOne({ 'recipients._id': oid }).select('recipients title subject').lean(),
      MailCampaign.findOne({ 'recipients._id': oid }).select('recipients title subject').lean(),
    ]);
    const all = [...(camp?.recipients || []), ...(mailCamp?.recipients || [])];
    const match = all.find((r) => String(r._id) === contactId);
    if (match) {
      return {
        _id: match._id,
        personId: match._id,
        email: normalizeEmail(match.email),
        name: match.name || '',
        status: match.status || 'unknown',
        createdAt: camp?.createdAt || mailCamp?.createdAt,
        updatedAt: camp?.updatedAt || mailCamp?.updatedAt,
        campaigns: [{ id: camp?._id || mailCamp?._id, title: camp?.title || camp?.subject || mailCamp?.title || mailCamp?.subject || '' }],
      };
    }
  }

  // Try by email (case-insensitive)
  const email = normalizeEmail(contactId);
  if (isValidEmail(email)) {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const log = await EmailLog.findOne({ leadEmail: { $regex: `^${escaped}$`, $options: 'i' } }).lean();
    if (log) {
      return {
        _id: log._id,
        personId: log._id,
        email: log.leadEmail,
        name: log.leadEmail ? log.leadEmail.split('@')[0] : '',
        opened: log.opened,
        clicked: log.clicked,
        bounced: log.bounced,
        campaignId: log.campaignId,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        campaigns: [],
      };
    }

    // Check campaign recipients — return ALL matching campaigns
    const campMatches = await Campaign.find(
      { 'recipients.email': { $regex: `^${escaped}$`, $options: 'i' } }
    ).select('title subject createdAt updatedAt recipients.$').lean();
    if (campMatches?.length) {
      const allCampRecipients = [];
      const campaignEntries = [];
      for (const camp of campMatches) {
        if (camp.recipients?.[0]) {
          allCampRecipients.push(camp.recipients[0]);
          campaignEntries.push({ id: camp._id, title: camp.title || camp.subject || '' });
        }
      }
      const r = allCampRecipients[0];
      const timestamps = campMatches.filter((c) => c.createdAt || c.updatedAt);
      return {
        _id: r._id,
        personId: r._id,
        email: normalizeEmail(r.email),
        name: r.name || '',
        status: r.status || 'unknown',
        createdAt: timestamps[0]?.createdAt,
        updatedAt: timestamps[0]?.updatedAt,
        campaigns: campaignEntries,
      };
    }
  }

  return null;
}

/**
 * Get base person details.
 */
async function getPersonBase(contactId) {
  const contact = await findHubContact(contactId);
  if (!contact) return null;

  return {
    contact,
    overview: {
      name: contact.name || contact.email || 'Unknown',
      email: contact.email,
      status: contact.status || 'unknown',
      inlets: [{ key: 'mail', label: 'Campaign Email' }],
      emailStatus: contact.status === 'Bounced' ? 'Bounced' : contact.opened ? 'Active' : 'Pending',
      firstSeen: contact.createdAt,
      lastSeen: contact.updatedAt,
    },
  };
}

/**
 * Get person details for a specific section.
 */
async function getPersonSection(contactId, section) {
  const contact = await findHubContact(contactId);
  if (!contact) return null;

  if (section === 'overview') {
    return {
      section,
      overview: {
        name: contact.name || contact.email,
        email: contact.email,
        campaignCount: contact.campaigns?.length || 0,
      },
    };
  }

  if (section === 'mail') {
    const events = await MailEvent.find({ email: normalizeEmail(contact.email) })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    return { section, events };
  }

  if (section === 'timeline') {
    const events = await MailEvent.find({ email: normalizeEmail(contact.email) })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();
    const timeline = events.map((e) => ({
      type: 'email_event',
      eventType: e.eventType,
      date: e.timestamp,
      details: e.metadata?.location || e.linkClicked || '',
    }));
    return { section, timeline };
  }

  return { section, data: null };
}

/**
 * Get full 360° view of a person.
 */
async function getPerson360(contactId) {
  const contact = await findHubContact(contactId);
  if (!contact) return null;

  const email = normalizeEmail(contact.email);
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const emailRegex = { $regex: `^${escaped}$`, $options: 'i' };
  const [events, campaigns, mailCampaigns] = await Promise.all([
    MailEvent.find({ email: emailRegex }).sort({ timestamp: -1 }).limit(200).lean(),
    Campaign.find({ 'recipients.email': emailRegex }).select('title subject createdAt metrics').lean(),
    MailCampaign.find({ 'recipients.email': emailRegex }).select('title subject createdAt stats').lean(),
  ]);

  const timeline = events.map((e) => ({
    type: 'email_event',
    eventType: e.eventType,
    date: e.timestamp,
    details: e.metadata?.location || e.linkClicked || '',
  }));

  const campaignHistory = [...campaigns, ...mailCampaigns].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((c) => ({
    title: c.title || c.subject || '(no title)',
    sentAt: c.createdAt,
    stats: c.metrics || c.stats || {},
  }));

  return {
    contact,
    overview: {
      name: contact.name || contact.email,
      email: contact.email,
      status: contact.status,
      campaignCount: campaignHistory.length,
      eventCount: events.length,
    },
    mail: { events },
    campaignHistory,
    timeline,
  };
}

module.exports = { findHubContact, getPersonBase, getPersonSection, getPerson360 };
