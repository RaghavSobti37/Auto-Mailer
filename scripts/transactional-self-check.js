const assert = require('assert');
const {
  isAuthorizedCoreKnotRequest,
  limits,
  normalizeTransactionalPayload,
  sendTransactionalEmail,
  validateTransactionalPayload,
} = require('../server/routes/transactionalRouter');

async function run() {
  const secret = 'shared-secret';

  assert.strictEqual(
    isAuthorizedCoreKnotRequest({ get: () => undefined }, secret),
    false,
  );
  assert.strictEqual(
    isAuthorizedCoreKnotRequest({ get: (name) => (name === 'authorization' ? 'Bearer shared-secret' : '') }, secret),
    true,
  );
  assert.strictEqual(
    isAuthorizedCoreKnotRequest({ get: (name) => (name === 'x-coreknot-mail-secret' ? 'shared-secret' : '') }, secret),
    true,
  );

  const payload = normalizeTransactionalPayload({
    to: ['Person@Example.com', 'person@example.com', 'other@example.com'],
    cc: 'Copy@Example.com;bad',
    subject: '  Hello  ',
    html: '<p>Hello</p>',
    from: 'team@example.com',
    source: 'coreknot',
  });
  assert.deepStrictEqual(payload.to, ['person@example.com', 'other@example.com']);
  assert.deepStrictEqual(payload.cc, ['copy@example.com']);
  assert.strictEqual(payload.subject, 'Hello');
  assert.strictEqual(validateTransactionalPayload(payload), '');
  assert.match(
    validateTransactionalPayload({ ...payload, to: Array.from({ length: limits.MAX_TRANSACTIONAL_RECIPIENTS + 1 }, (_, i) => `p${i}@example.com`) }),
    /limited/,
  );
  assert.match(validateTransactionalPayload({ ...payload, source: 'unknown-app' }), /Unsupported/);
  assert.match(validateTransactionalPayload({ ...payload, subject: 'x'.repeat(limits.MAX_TRANSACTIONAL_SUBJECT_LENGTH + 1) }), /Subject is limited/);
  assert.match(validateTransactionalPayload({ ...payload, html: 'x'.repeat(limits.MAX_TRANSACTIONAL_HTML_BYTES + 1) }), /too large/);

  let calledWith = null;
  const result = await sendTransactionalEmail({
    body: payload,
    dispatch: async (message) => {
      calledWith = message;
      return { provider: 'resend', id: 'email_123' };
    },
  });

  assert.deepStrictEqual(calledWith.to, ['person@example.com', 'other@example.com']);
  assert.deepStrictEqual(calledWith.cc, ['copy@example.com']);
  assert.deepStrictEqual(result, {
    status: 202,
    body: { queued: true, provider: 'resend', id: 'email_123' },
  });

  let dispatchedOversized = false;
  const rejected = await sendTransactionalEmail({
    body: {
      ...payload,
      to: Array.from({ length: limits.MAX_TRANSACTIONAL_RECIPIENTS + 1 }, (_, i) => `p${i}@example.com`),
    },
    dispatch: async () => {
      dispatchedOversized = true;
      return { provider: 'resend' };
    },
  });
  assert.strictEqual(rejected.status, 400);
  assert.strictEqual(dispatchedOversized, false);
}

run()
  .then(() => console.log('transactional-self-check ok'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
