#!/usr/bin/env node
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import '../server/config.js';
import Campaign from '../server/models/Campaign.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-mailer';
const primaryEmail = 'raghavsobti37@gmail.com';
const dummyRecipients = Array.from({ length: 100 }, (_, index) => {
  const n = String(index + 1).padStart(3, '0');
  return {
    email: `dummy-recipient-${n}@example.invalid`,
    name: `Dummy Recipient ${n}`,
    rowData: { email: `dummy-recipient-${n}@example.invalid`, name: `Dummy Recipient ${n}`, source: 'dummy-safe' },
    status: 'Pending',
  };
});

const recipients = [
  {
    email: primaryEmail,
    name: 'Raghav Sobti',
    rowData: { email: primaryEmail, name: 'Raghav Sobti', source: 'requested-test-recipient' },
    status: 'Pending',
  },
  ...dummyRecipients,
];

await mongoose.connect(mongoUri);

const campaign = await Campaign.create({
  campaignId: `dummy-${crypto.randomBytes(8).toString('hex')}`,
  title: 'Dummy Speed Test Campaign',
  subject: 'Dummy Auto-Mailer campaign',
  content: '<p>Dummy campaign for Auto-Mailer verification. Not sourced from campaign audience data.</p>',
  senderMode: 'system_resend',
  systemProvider: 'resend',
  resendFromEmail: process.env.SYSTEM_VERIFIED_FROM_EMAIL || 'onboarding@resend.dev',
  removeUnsubscribe: true,
  status: 'Draft',
  recipientCount: recipients.length,
  recipients,
  metrics: { totalSent: 0, opened: 0, clicked: 0, bounced: 0 },
});

console.log(JSON.stringify({
  campaignId: String(campaign._id),
  title: campaign.title,
  status: campaign.status,
  recipients: campaign.recipientCount,
  primaryEmail,
  dummyDomain: 'example.invalid',
}, null, 2));

await mongoose.disconnect();
