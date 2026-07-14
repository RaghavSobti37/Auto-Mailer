const mongoose = require('mongoose');

const WhatsAppEventSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  normalizedPhone: { type: String, index: true },
  name: { type: String },
  status: { type: String, enum: ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'], required: true },
  timestamp: { type: Date, required: true },
  linkedEmailCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  matchedToPersonId: { type: mongoose.Schema.Types.ObjectId, index: true },
  needsReview: { type: Boolean, default: false },
  importBatchId: { type: String, index: true },
  rawRow: { type: Map, of: String },
  messageId: { type: String },
  eventKey: { type: String, unique: true, sparse: true, index: true },
}, { timestamps: true });

WhatsAppEventSchema.index({ importBatchId: 1, status: 1 });
WhatsAppEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WhatsAppEvent', WhatsAppEventSchema);
