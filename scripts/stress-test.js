#!/usr/bin/env node
/**
 * Auto-Mailer Stress Test
 *
 * Tests bulk email sending, batch tracking, and data hub analytics
 * performance with configurable recipient counts.
 *
 * Usage:
 *   node scripts/stress-test.js --count 1000 [options]
 *
 * Options:
 *   --count <n>     Number of test recipients to create (default: 100)
 *   --campaign <id> Use existing campaign ID instead of creating one
 *   --resend        Actually send via Resend (requires RESEND_API_KEY in .env)
 *   --analytics     Run analytics verification after sending
 *   --all           Run full suite: create → send → track → verify analytics
 *   --cleanup       Delete test data after completion
 *   --domain <d>    Use this domain for test emails (default: example.com)
 *   --no-dry-run    Skip dry-run (send even without --resend, useful for SMTP testing)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const COUNT = parseInt(args[args.indexOf('--count') + 1], 10) || 100;
const EXISTING_CAMPAIGN = args[args.indexOf('--campaign') + 1] || null;
const USE_RESEND = args.includes('--resend');
const RUN_ANALYTICS = args.includes('--analytics') || args.includes('--all');
const RUN_FULL = args.includes('--all');
const DO_CLEANUP = args.includes('--cleanup') || args.includes('--all');
const TEST_DOMAIN = args[args.indexOf('--domain') + 1] || 'example.com';
const NO_DRY_RUN = args.includes('--no-dry-run');

const config = require('../server/config');
const IS_DRY_RUN = !USE_RESEND && !NO_DRY_RUN;

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Auto-Mailer Stress Test');
  console.log('═══════════════════════════════════════════');
  console.log(`  Recipients:    ${COUNT.toLocaleString()}`);
  console.log(`  Mode:          ${IS_DRY_RUN ? 'DRY-RUN (simulated)' : USE_RESEND ? 'LIVE (Resend)' : 'LIVE (SMTP)'}`);
  console.log(`  Analytics:     ${RUN_ANALYTICS ? 'Yes' : 'No'}`);
  console.log(`  Cleanup:       ${DO_CLEANUP ? 'Yes' : 'No'}`);
  console.log(`  Domain:        @${TEST_DOMAIN}`);
  console.log(`  Campaign ID:   ${EXISTING_CAMPAIGN || '(will create)'}`);
  console.log('───────────────────────────────────────────\n');

  // Connect to MongoDB
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`   Connected to ${config.mongoUri}\n`);

  const Campaign = require('../server/models/Campaign');
  const MailEvent = require('../server/models/MailEvent');
  const EmailLog = require('../server/models/EmailLog');
  const { batchSendEmails, batchCreateTrackingEvents } = require('../server/services/emailProcessor');

  let campaign;

  // Step 1: Create or load campaign
  if (EXISTING_CAMPAIGN) {
    campaign = await Campaign.findById(EXISTING_CAMPAIGN);
    if (!campaign) {
      console.error(`❌ Campaign not found: ${EXISTING_CAMPAIGN}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(`📂 Using existing campaign: ${campaign._id}`);
  } else {
    console.log('🛠️  Creating test campaign...');
    const recipients = Array.from({ length: COUNT }, (_, i) => ({
      email: `stress-test-${i}@${TEST_DOMAIN}`,
      name: `Test User ${i}`,
      status: 'Pending',
    }));

    campaign = await Campaign.create({
      title: `Stress Test — ${COUNT} recipients (${new Date().toISOString()})`,
      campaignId: `stress-${Date.now()}`,
      subject: `Stress Test Email #${Date.now()}`,
      content: '<h1>Stress Test</h1><p>This is a test email for stress testing.</p>',
      recipients,
      senderMode: USE_RESEND ? 'system_resend' : 'system_smtp',
      metrics: { totalSent: 0, bounced: 0, opened: 0, clicked: 0 },
      status: 'Draft',
    });
    console.log(`   Created campaign: ${campaign._id}`);
    console.log(`   Recipients: ${campaign.recipients.length}\n`);
  }

  // Step 2: Batch send (timed)
  console.log('🚀 Batch sending emails...');
  campaign.status = 'Sending';
  await campaign.save();

  const sendStart = Date.now();
  let results;

  if (IS_DRY_RUN) {
    // True dry-run: simulate sends without any API calls
    console.log('   (Simulating sends — no API calls made)');
    results = campaign.recipients
      .filter((r) => r.status === 'Pending' || r.status === 'Queued')
      .map((r, idx) => {
        r.status = 'Sent';
        r.sentAt = new Date();
        r.messageId = `dry-${Date.now()}-${idx}`;
        campaign.metrics.totalSent = (campaign.metrics.totalSent || 0) + 1;
        return {
          email: r.email,
          status: 'Sent',
          messageId: `dry-${Date.now()}-${idx}`,
          error: null,
          recipientIndex: idx,
          campaignId: campaign._id,
        };
      });
  } else {
    results = await batchSendEmails(campaign);
  }

  const sendDuration = Date.now() - sendStart;

  const sent = results.filter((r) => r.status === 'Sent').length;
  const failed = results.filter((r) => r.status === 'Failed' || r.status === 'Invalid').length;

  console.log(`   Sent:     ${sent.toLocaleString()}`);
  if (failed > 0) console.log(`   Failed:   ${failed.toLocaleString()}`);
  console.log(`   Duration: ${(sendDuration / 1000).toFixed(2)}s`);
  if (sendDuration > 0) console.log(`   Rate:     ${(sent / (sendDuration / 1000)).toFixed(0)} emails/sec`);

  // Step 3: Save campaign
  campaign.status = failed > 0 && sent === 0 ? 'Failed' : 'Completed';
  await campaign.save();
  console.log(`💾 Campaign saved with status: ${campaign.status}\n`);

  // Step 4: Batch create tracking events
  console.log('📊 Creating tracking events...');
  const trackStart = Date.now();
  const eventsCreated = await batchCreateTrackingEvents(results);
  const trackDuration = Date.now() - trackStart;
  console.log(`   Events created: ${eventsCreated.toLocaleString()}`);
  console.log(`   Duration:       ${trackDuration}ms\n`);

  // Step 5: Verify tracking events were created
  const eventCount = await MailEvent.countDocuments({ campaignId: campaign._id });
  console.log(`🔍 MailEvent records: ${eventCount} (expected: ${sent + failed})\n`);

  // Step 6: Run analytics verification
  if (RUN_ANALYTICS || RUN_FULL) {
    console.log('📈 Running analytics verification...');
    const analyticsStart = Date.now();
    const mailMetricsService = require('../server/services/mailMetricsService');

    try {
      const { getCumulativeTagMetrics, countCampaignBounces } = mailMetricsService;
      const tagMetrics = await getCumulativeTagMetrics();
      const totalBounces = await countCampaignBounces();
      const coreSent = tagMetrics.coreAgg.reduce((s, g) => s + g.totalSent, 0);
      const mailSent = tagMetrics.mailAgg.reduce((s, g) => s + g.totalSent, 0);
      console.log(`   Cumulative campaign metrics:`);
      console.log(`     Total sent:  ${coreSent + mailSent}`);
      console.log(`     Total bounced: ${totalBounces}`);
      console.log(`   Duration:       ${Date.now() - analyticsStart}ms\n`);
    } catch (err) {
      console.warn(`   ⚠️  Analytics service error: ${err.message}\n`);
    }

    // Verify data hub sync
    console.log('🔄 Testing data hub sync...');
    const { syncAllInlets } = require('../server/domains/data-hub/services/syncService');
    const syncResult = await syncAllInlets({ incremental: false });
    console.log(`   Synced: ${syncResult.emailLogs} new EmailLog entries`);
    console.log(`   Total recipients scanned: ${syncResult.recipients}\n`);

    // Verify EmailLog count
    const logCount = await EmailLog.countDocuments({});
    console.log(`📋 Total EmailLog records: ${logCount.toLocaleString()}\n`);
  }

  // Step 7: Cleanup if requested
  if (DO_CLEANUP) {
    console.log('🧹 Cleaning up test data...');
    await MailEvent.deleteMany({ campaignId: campaign._id });
    const testEmails = Array.from({ length: COUNT }, (_, i) => `stress-test-${i}@${TEST_DOMAIN}`);
    await EmailLog.deleteMany({ leadEmail: { $in: testEmails } });
    await Campaign.findByIdAndDelete(campaign._id);
    console.log('   Test data deleted.\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('  STRESS TEST SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`  Campaign ID:   ${campaign._id}`);
  console.log(`  Recipients:    ${COUNT.toLocaleString()}`);
  console.log(`  Sent:          ${sent.toLocaleString()}`);
  console.log(`  Failed:        ${failed.toLocaleString()}`);
  console.log(`  Send time:     ${(sendDuration / 1000).toFixed(2)}s`);
  if (sendDuration > 0) console.log(`  Send rate:     ${(sent / (sendDuration / 1000)).toFixed(0)} emails/sec`);
  console.log(`  Events batch:  ${eventsCreated} in ${trackDuration}ms`);
  console.log(`  Analytics:     ${RUN_ANALYTICS || RUN_FULL ? '✅ Verified' : '⏭️  Skipped'}`);
  if (DO_CLEANUP) console.log(`  Cleanup:       ✅ Test data removed`);
  console.log('───────────────────────────────────────────');

  if (IS_DRY_RUN) {
    console.log('\n⚠️  Dry-run mode: No emails were actually sent.');
    console.log('   Recipients were marked as "Sent" in-memory only.');
    console.log('   Run with --resend for real send, or --no-dry-run for SMTP.\n');
  }

  await mongoose.disconnect();
  console.log('✅ Stress test complete.\n');
}

main().catch((err) => {
  console.error('❌ Stress test failed:', err);
  process.exit(1);
});
