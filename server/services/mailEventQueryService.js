const MailEvent = require('../models/MailEvent');

const emailRegex = (email) => new RegExp(`^${String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

async function countByEmail(email) {
  if (!email) return 0;
  return MailEvent.countDocuments({ email: emailRegex(email) });
}

async function findByEmail(email, { limit = 100, sort = { timestamp: -1 } } = {}) {
  if (!email) return [];
  return MailEvent.find({ email: emailRegex(email) }).sort(sort).limit(limit).lean();
}

async function aggregateEventTypeCounts() {
  return MailEvent.aggregate([
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
  ]);
}

async function distinctEmails({ since } = {}) {
  const filter = since ? { timestamp: { $gte: since } } : {};
  return MailEvent.distinct('email', filter);
}

module.exports = {
  countByEmail,
  findByEmail,
  aggregateEventTypeCounts,
  distinctEmails,
};
