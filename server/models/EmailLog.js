const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  campaignId: { type: String, required: true, index: true },
  leadEmail: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  phone: { type: String, index: true, sparse: true },
  channel: { type: String, enum: ['email', 'whatsapp'], default: 'email', index: true },
  pixelId: { type: String, unique: true, index: true, sparse: true },
  clickId: { type: String, unique: true, index: true, sparse: true },
  opened: { type: Boolean, default: false },
  clicked: { type: Boolean, default: false },
  bounced: { type: Boolean, default: false },
  whatsapp: {
    campaignName: { type: String, index: true },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'] },
    activityScore: { type: Number, default: 0 },
    failureReason: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    clickedAt: { type: Date },
    tags: [{ type: String }],
    sourceFilename: { type: String },
  }
}, { timestamps: true });

emailLogSchema.index({ phone: 1, 'whatsapp.campaignName': 1 });
emailLogSchema.index({ channel: 1, 'whatsapp.status': 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
