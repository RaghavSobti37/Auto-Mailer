/**
 * Read audience from existing PersonHubView (CoreKnot) without new Mongo collections.
 * ponytail: Atlas M0 collection cap — reuse personhubviews until dedicated cluster.
 */

const SORT_FIELDS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  lastActivity: 'lastActivityAt',
  updated: 'updatedAt',
  emailStatus: 'emailStatus',
};

function mapHubRow(hub) {
  const rawEmail = hub.email ? String(hub.email).toLowerCase().trim() : '';
  const email = rawEmail.endsWith('@auto-mailer.local') ? '' : rawEmail;
  const phone = hub.phone ? String(hub.phone).trim() : '';
  const tags = Array.isArray(hub.inletKeys)
    ? hub.inletKeys.map((t) => String(t).trim()).filter(Boolean)
    : [];
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
    tags,
    emailStatus: hub.emailStatus || undefined,
    suppressed,
    suppressionReason,
    lastActivityAt: hub.lastActivityAt || hub.updatedAt || undefined,
    source: 'personhubviews',
  };
}

function buildAudienceFilter({ search = '', tag = '', suppressed = '', emailStatus = '' } = {}) {
  const filter = {};
  const and = [];

  if (search) {
    const esc = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    and.push({
      $or: [
        { email: { $regex: esc, $options: 'i' } },
        { name: { $regex: esc, $options: 'i' } },
        { phone: { $regex: esc, $options: 'i' } },
      ],
    });
  }

  if (tag) {
    and.push({ inletKeys: String(tag).trim() });
  }

  if (emailStatus) {
    and.push({ emailStatus: String(emailStatus).trim() });
  }

  if (suppressed === 'true') {
    and.push({
      $or: [
        { unsubscribed: true },
        { emailStatus: 'Unsubscribed' },
        { emailStatus: 'Bounced' },
      ],
    });
  } else if (suppressed === 'false') {
    and.push({
      unsubscribed: { $ne: true },
      emailStatus: { $nin: ['Unsubscribed', 'Bounced'] },
    });
  }

  if (and.length === 1) Object.assign(filter, and[0]);
  else if (and.length > 1) filter.$and = and;

  return filter;
}

function buildSort(sort = 'lastActivity', order = 'desc') {
  const field = SORT_FIELDS[sort] || SORT_FIELDS.lastActivity;
  const dir = String(order).toLowerCase() === 'asc' ? 1 : -1;
  const mongoSort = { [field]: dir };
  if (field !== 'updatedAt') mongoSort.updatedAt = -1;
  return mongoSort;
}

async function listAudienceFromHub({
  search = '',
  tag = '',
  suppressed = '',
  emailStatus = '',
  sort = 'lastActivity',
  order = 'desc',
  page = 1,
  limit = 50,
} = {}) {
  const mongoose = require('mongoose');
  const col = mongoose.connection.db.collection('personhubviews');
  const filter = buildAudienceFilter({ search, tag, suppressed, emailStatus });
  const mongoSort = buildSort(sort, order);

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [rows, total] = await Promise.all([
    col.find(filter).sort(mongoSort).skip(skip).limit(safeLimit).toArray(),
    col.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    items: rows.map(mapHubRow).filter((r) => r.email || r.phone),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

async function listAudienceTagsFromHub() {
  const mongoose = require('mongoose');
  const col = mongoose.connection.db.collection('personhubviews');
  const raw = await col.distinct('inletKeys', {
    $or: [
      { email: { $exists: true, $ne: '' } },
      { phone: { $exists: true, $ne: '' } },
    ],
  });
  const tags = raw
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .map((t) => String(t).trim())
    .filter(Boolean);
  return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
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

module.exports = {
  listAudienceFromHub,
  listAudienceTagsFromHub,
  getAudiencePersonFromHub,
  mapHubRow,
  buildAudienceFilter,
  buildSort,
  SORT_FIELDS,
};
