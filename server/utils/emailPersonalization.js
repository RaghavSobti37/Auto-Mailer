function toPlainObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRecipientValue(recipient, column, fallback = '') {
  const rowData = toPlainObject(recipient?.rowData);
  const key = String(column || '');
  return rowData?.[key] ?? recipient?.[key] ?? fallback ?? '';
}

function replaceToken(text, token, value) {
  const escaped = escapeRegExp(token);
  return String(text || '')
    .replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), value)
    .replace(new RegExp(`\\{${escaped}\\}`, 'g'), value);
}

function personalizeEmailContent({ html = '', subject = '', recipient, variableMapping, variableFallbacks } = {}) {
  const mapping = toPlainObject(variableMapping);
  const fallbacks = toPlainObject(variableFallbacks);
  let nextHtml = String(html || '');
  let nextSubject = String(subject || '');

  for (const [token, column] of Object.entries(mapping || {})) {
    const value = String(resolveRecipientValue(recipient, column, fallbacks[token]));
    nextHtml = replaceToken(nextHtml, token, value);
    nextSubject = replaceToken(nextSubject, token, value);
  }

  return { html: nextHtml, subject: nextSubject };
}

module.exports = {
  personalizeEmailContent,
  replaceToken,
  resolveRecipientValue,
};
