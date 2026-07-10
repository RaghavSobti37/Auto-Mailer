#!/usr/bin/env node
/**
 * Seed Person collection from existing Campaign/EmailLog/MailEvent data.
 * Run after adding the Person model to populate it with historical data.
 * Usage: node scripts/seed-person-collection.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-mailer';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const Person = require('../server/models/Person');
  const Campaign = require('../server/models/Campaign');
  const MailCampaign = require('../server/models/MailCampaign');
  const EmailLog = require('../server/models/EmailLog');

  // Check if Person collection already has data
  const existingCount = await Person.countDocuments();
  if (existingCount > 0) {
    console.log('Person collection already has', existingCount, 'records — skipping seed');
    await mongoose.disconnect();
    return;
  }

  const bulkOps = [];
  let totalProcessed = 0;

  async function addBulkOp(email, name, stats, historyEntry) {
    bulkOps.push({
      updateOne: {
        filter: { email },
        update: {
          $setOnInsert: { email, name: name || email.split('@')[0] },
          $inc: {
            'emailStats.sent': stats.sent || 1,
            'emailStats.opened': stats.opened || 0,
            'emailStats.clicked': stats.clicked || 0,
            'emailStats.bounced': stats.bounced || 0,
          },
          $push: { campaignHistory: historyEntry },
        },
        upsert: true,
      }
    });
    totalProcessed++;

    // Flush in batches of 500 to avoid oversized bulkWrite
    if (bulkOps.length >= 500) {
      await Person.bulkWrite(bulkOps, { ordered: false });
      console.log(`  ... ${totalProcessed} records processed`);
      bulkOps.length = 0;
    }
  }

  // 1. Extract from Campaign recipients
  console.log('Processing Campaign recipients...');
  const campaigns = await Campaign.find({}).lean();
  for (const c of campaigns) {
    for (const r of (c.recipients || [])) {
      const email = (r.email || '').toLowerCase().trim();
      if (!email) continue;
      addBulkOp(
        email,
        r.name || '',
        {
          sent: c.metrics?.totalSent || 1,
          opened: c.status === 'Opened' || r.status === 'Opened' ? 1 : 0,
          clicked: r.status === 'Clicked' ? 1 : 0,
          bounced: r.status === 'Bounced' || r.status === 'Failed' ? 1 : 0,
        },
        { campaignId: c._id, campaignTitle: c.title, channel: 'email', outcome: r.status || 'Pending', timestamp: c.createdAt }
      );
    }
  }

  // 2. Extract from MailCampaign recipients
  console.log('Processing MailCampaign recipients...');
  const mailCampaigns = await MailCampaign.find({}).lean();
  for (const c of mailCampaigns) {
    for (const r of (c.recipients || [])) {
      const email = (r.email || '').toLowerCase().trim();
      if (!email) continue;
      addBulkOp(
        email,
        r.name || '',
        { sent: c.stats?.sent || 1, opened: c.stats?.opened || 0, clicked: c.stats?.clicked || 0, bounced: c.stats?.bounced || 0 },
        { campaignId: c._id, campaignTitle: c.title, channel: 'email', outcome: r.status || 'Pending', timestamp: c.createdAt }
      );
    }
  }

  // 3. Extract from EmailLog
  console.log('Processing EmailLog entries...');
  const logs = await EmailLog.find({}).lean();
  for (const log of logs) {
    const email = (log.leadEmail || '').toLowerCase().trim();
    if (!email) continue;
    addBulkOp(
      email,
      '',
      { sent: 1, opened: log.opened ? 1 : 0, clicked: log.clicked ? 1 : 0, bounced: log.bounced ? 1 : 0 },
      { campaignId: log.campaignId, channel: 'email', outcome: log.opened ? 'Opened' : log.clicked ? 'Clicked' : log.bounced ? 'Bounced' : 'Sent', timestamp: log.createdAt }
    );
  }

  // Final flush
  if (bulkOps.length > 0) {
    await Person.bulkWrite(bulkOps, { ordered: false });
  }

  console.log('Seeded', totalProcessed, 'person records from existing data');

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
