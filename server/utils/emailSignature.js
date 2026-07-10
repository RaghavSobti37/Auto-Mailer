function buildEmailSignature(signatureText) {
  if (!signatureText) return '';
  return `<div style="margin-top:20px; padding-top:15px; border-top:1px solid #e0e0e0;">
    ${signatureText.replace(/\n/g, '<br>')}
  </div>`;
}

function applySignature(html, signatureText) {
  if (!signatureText) return html;
  const sigHtml = buildEmailSignature(signatureText);
  // Insert signature before the closing </body> tag if present, otherwise append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${sigHtml}\n</body>`);
  }
  return html + sigHtml;
}

module.exports = {
  buildEmailSignature,
  applySignature,
};
