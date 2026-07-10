const { applySignature } = require('./emailSignature');

/**
 * Build final email HTML with signature, tracking, etc.
 */
async function buildFinalEmailHtml({ html, format, includeSignature, signature, mode }) {
  let finalHtml = html;

  if (format === 'rawHtml') {
    // Keep as-is for raw HTML
  } else {
    // Wrap in email-friendly HTML
    finalHtml = wrapInEmailBody(finalHtml);
  }

  // Apply signature
  if (includeSignature && signature) {
    finalHtml = applySignature(finalHtml, signature);
  }

  return finalHtml;
}

function wrapInEmailBody(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; color:#333; line-height:1.6;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    ${content}
  </div>
</body>
</html>`;
}

function wrapPreviewDocument(bodyHtml, { theme } = {}) {
  const bg = theme === 'dark' ? '#1a1a2e' : '#f5f5f5';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#333';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:20px; background:${bg}; color:${textColor}; font-family:Arial, sans-serif; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function applyFullDocumentEmailExtras(html, { includeSignature, signature }) {
  if (includeSignature && signature) {
    return applySignature(html, signature);
  }
  return html;
}

module.exports = {
  buildFinalEmailHtml,
  wrapPreviewDocument,
  applyFullDocumentEmailExtras,
};
