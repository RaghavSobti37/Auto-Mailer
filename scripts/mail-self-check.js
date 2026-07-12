const assert = require('assert');
const { buildCampaignHtml, getPersonSuppression, normalizeEmail, rewriteTrackedLinks } = require('../server/services/mailService');
const { personalizeEmailContent } = require('../server/utils/emailPersonalization');

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

  assert.strictEqual(normalizeEmail(' PERSON@Example.COM '), 'person@example.com');
  assert.deepStrictEqual(
    getPersonSuppression({ suppressed: true, suppressionReason: 'unsubscribed' }),
    { status: 'Unsubscribed', error: 'Local data hub marks recipient unsubscribed' },
  );
  assert.deepStrictEqual(
    getPersonSuppression({ bounced: true, emailStats: { bounced: 1 } }),
    { status: 'Bounced', error: 'Local data hub marks recipient bounced' },
  );
  assert.strictEqual(getPersonSuppression({ suppressed: false, bounced: false }), null);

  const personalized = personalizeEmailContent({
    html: '<p>Hi {{name}}, your city is {city}</p>',
    subject: 'Hello {{name}}',
    recipient: { name: 'Raghav', rowData: { city: 'Delhi' } },
    variableMapping: { name: 'name', city: 'city' },
  });
  assert.strictEqual(personalized.html, '<p>Hi Raghav, your city is Delhi</p>');
  assert.strictEqual(personalized.subject, 'Hello Raghav');
}

run();
console.log('mail-self-check ok');
