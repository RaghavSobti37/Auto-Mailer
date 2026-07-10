function renderTokens(value, context) {
  if (!value) return '';
  return value.replace(/\{\{\s*([^{}]+)\s*\}\}/g, (match, token) => {
    return context[token.trim()] !== undefined ? String(context[token.trim()]) : match;
  });
}

function richHtmlToPlainText(html) {
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function wrapEmailHtml(fragment, unsubscribeUrl, bannerTag) {
  return `<html><body style="margin:0; padding:24px; background:#f6f6f4;">
    <div style="max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #000000; border-radius:8px; overflow:hidden; font-family:Arial, Helvetica, sans-serif; color:#241c15; line-height:1.7;">
      ${bannerTag || ''}
      <div style="padding:32px;">
        ${fragment}
        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #eee; text-align:center; color:#999; font-size:12px;">
          You are receiving this because you signed up for our updates.<br>
          <a href="${unsubscribeUrl}" style="color:#999; text-decoration:underline;">Unsubscribe from this list</a>
        </div>
      </div>
    </div></body></html>`;
}

function buildEmailHtml(fragment, emailType, unsubscribeUrl, bannerTag) {
  if (emailType === 'plain') {
    return wrapEmailHtml(fragment, unsubscribeUrl, false);
  }
  return wrapEmailHtml(fragment, unsubscribeUrl, bannerTag);
}

module.exports = {
  renderTokens,
  richHtmlToPlainText,
  wrapEmailHtml,
  buildEmailHtml,
};
