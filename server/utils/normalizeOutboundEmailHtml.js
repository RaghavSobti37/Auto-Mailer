/**
 * Normalize outbound email HTML - wrap content in proper HTML document structure
 * if it isn't already a full document.
 */
function normalizeOutboundEmailHtml(content) {
  if (!content) return '';
  const trimmed = content.trim();

  // If already a full HTML document, return as-is
  if (isFullHtmlDocument(trimmed)) {
    return trimmed;
  }

  // Wrap in basic HTML structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; color:#333; line-height:1.6;">
  ${trimmed}
</body>
</html>`;
}

function isFullHtmlDocument(content) {
  if (!content) return false;
  return /<!DOCTYPE|<html[\s>]/i.test(content.trim());
}

module.exports = {
  normalizeOutboundEmailHtml,
  isFullHtmlDocument,
};
