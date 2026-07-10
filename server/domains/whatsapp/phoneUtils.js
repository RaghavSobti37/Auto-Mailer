function normalizePhone(raw, defaultCountryCode = '91') {
  if (!raw) return null;
  const cleaned = String(raw).replace(/^\+/, '').replace(/[^\d]/g, '');
  if (cleaned.length < 10) return null;
  if (cleaned.length === 10) return '+' + defaultCountryCode + cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return '+' + defaultCountryCode + cleaned.slice(1);
  if (cleaned.length === 12 && (cleaned.startsWith('91') || cleaned.startsWith('1'))) return '+' + cleaned;
  if (cleaned.length > 12) return '+' + cleaned;
  return '+' + cleaned;
}
module.exports = { normalizePhone };
