function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function filterRecipientsByStatus(recipients, statusFilter) {
  if (!statusFilter || statusFilter === 'all') return recipients;
  return recipients.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s === statusFilter;
  });
}

function annotateRecipient(recipient) {
  return {
    ...recipient,
    invalidEmail: !isValidEmail(recipient.email),
  };
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  filterRecipientsByStatus,
  annotateRecipient,
};
