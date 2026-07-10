const mongoose = require('mongoose');

const MailEventSchema = new mongoose.Schema({
  messageId: { type: String, index: true },
  eventType: { type: String, required: true },
  email: { type: String, index: true },
  timestamp: { type: Date, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MailCampaign', index: true },
  senderProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailProfile', index: true },
  rotationProvider: { type: String, index: true },
  linkClicked: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

MailEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
MailEventSchema.index({ campaignId: 1, timestamp: -1 });
MailEventSchema.index({ campaignId: 1, eventType: 1, timestamp: -1 });
MailEventSchema.index(
  { eventType: 1, timestamp: 1, senderProfileId: 1 },
  { name: 'perf_event_timestamp_profile' },
);

module.exports = mongoose.model('MailEvent', MailEventSchema);
