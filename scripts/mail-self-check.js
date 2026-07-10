const assert = require('assert');
const { buildCampaignHtml, rewriteTrackedLinks } = require('../server/services/mailService');

function run() {
  const linked = rewriteTrackedLinks(
    '<a href="https://example.com/page?x=1">Read</a><a href="mailto:hi@example.com">Mail</a>',
    'https://mailer.example.com/track/click/camp/recip',
    'person@example.com',
  );
  assert(linked.includes('/track/click/camp/recip?url='));
  assert(linked.includes('email=person%40example.com'));
  assert(linked.includes('href="mailto:hi@example.com"'));

  const withUnsub = buildCampaignHtml({
    html: '<p>Hello</p>',
    campaignId: 'camp',
    recipientId: 'recip',
    email: 'person@example.com',
    trackingBaseUrl: 'https://mailer.example.com',
    removeUnsubscribe: false,
  });
  assert(withUnsub.includes('/track/open/camp/recip.gif'));
  assert(withUnsub.includes('/track/unsubscribe/camp/recip'));

  const withoutUnsub = buildCampaignHtml({
    html: '<p>Hello</p>',
    campaignId: 'camp',
    recipientId: 'recip',
    email: 'person@example.com',
    trackingBaseUrl: 'https://mailer.example.com',
    removeUnsubscribe: true,
  });
  assert(!withoutUnsub.includes('/track/unsubscribe/camp/recip'));
}

run();
console.log('mail-self-check ok');
