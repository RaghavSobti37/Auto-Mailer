const mongoose = require('mongoose');

const mailCampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  senderProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailProfile' },
  attachments: [{
    filename: String,
    content: String,
    contentType: String
  }],
  status: { type: String, enum: ['Draft', 'Sending', 'Stopped', 'Completed', 'Failed'], default: 'Draft' },
  stoppedAt: { type: Date },
  recipients: [{
    leadId: { type: mongoose.Schema.Types.ObjectId },
    email: String,
    status: { type: String, enum: ['Pending', 'Queued', 'Sent', 'Failed', 'Opened', 'Clicked', 'Bounced', 'Unsubscribed', 'Invalid', 'Cancelled'], default: 'Pending' },
    sentAt: Date,
    error: String,
    messageId: String
  }],
  stats: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    invalid: { type: Number, default: 0 }
  },
  removeUnsubscribe: { type: Boolean, default: false },
}, { timestamps: true });

mailCampaignSchema.index({ 'recipients.messageId': 1 });
mailCampaignSchema.index({ 'recipients.email': 1 });
mailCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MailCampaign', mailCampaignSchema);
