/**
 * Read audience from existing PersonHubView (CoreKnot) without new Mongo collections.
 * ponytail: Atlas M0 collection cap — reuse personhubviews until dedicated cluster.
 */

function mapHubRow(hub) {
  const email = hub.email ? String(hub.email).toLowerCase().trim() : '';
  const phone = hub.phone ? String(hub.phone).trim() : '';
  const suppressed = Boolean(hub.unsubscribed)
    || hub.emailStatus === 'Unsubscribed'
    || hub.emailStatus === 'Bounced';
  let suppressionReason;
  if (hub.emailStatus === 'Bounced') suppressionReason = 'bounced';
  else if (hub.unsubscribed || hub.emailStatus === 'Unsubscribed') suppressionReason = 'unsubscribed';

  return {
    _id: hub._id,
    name: hub.name || email.split('@')[0] || phone || 'Unknown',
    email: email || undefined,
    phone: phone || undefined,
    normalizedPhone: phone ? phone.replace(/\D/g, '') : undefined,
    suppressed,
    suppressionReason,
    source: 'personhubviews',
  };
}

async function listAudienceFromHub({ search = '', page = 0, limit = 50 } = {}) {
  const mongoose = require('mongoose');
  const col = mongoose.connection.db.collection('personhubviews');
  const filter = {};

  if (search) {
    const esc = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: esc, $options: 'i' } },
      { name: { $regex: esc, $options: 'i' } },
      { phone: { $regex: esc, $options: 'i' } },
    ];
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 0, 0);

  const [rows, total] = await Promise.all([
    col.find(filter).sort({ lastActivityAt: -1, updatedAt: -1 }).skip(safePage * safeLimit).limit(safeLimit).toArray(),
    col.countDocuments(filter),
  ]);

  return {
    items: rows.map(mapHubRow).filter((r) => r.email || r.phone),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function getAudiencePersonFromHub(id) {
  const mongoose = require('mongoose');
  const { ObjectId } = require('mongodb');
  const col = mongoose.connection.db.collection('personhubviews');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  const hub = await col.findOne(query);
  if (!hub) return null;
  return mapHubRow(hub);
}

module.exports = { listAudienceFromHub, getAudiencePersonFromHub, mapHubRow };
