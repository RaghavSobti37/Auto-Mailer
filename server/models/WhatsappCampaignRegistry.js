const mongoose = require('mongoose');

const whatsappCampaignRegistrySchema = new mongoose.Schema({
  campaignName: { type: String, required: true, unique: true, index: true },
  channel: { type: String, enum: ['whatsapp'], default: 'whatsapp' },
  tags: [{ type: String }],
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('WhatsappCampaignRegistry', whatsappCampaignRegistrySchema);
