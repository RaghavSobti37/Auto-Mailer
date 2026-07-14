const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema({
  email: { type: String, index: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, index: true, sparse: true, trim: true },
  normalizedPhone: { type: String, index: true, sparse: true },
  name: { type: String, trim: true },
  channel: { type: String, enum: ['email', 'whatsapp', 'both'], default: 'email' },
  tags: [{ type: String, trim: true }],
  source: { type: String, trim: true },
  opened: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 },
  bounced: { type: Boolean, default: false },
  suppressed: { type: Boolean, default: false },
  suppressionReason: { type: String, enum: ['bounced', 'unsubscribed'] },
  needsReview: { type: Boolean, default: false },
  emailStats: { sent: { type: Number, default: 0 }, opened: { type: Number, default: 0 }, clicked: { type: Number, default: 0 }, bounced: { type: Number, default: 0 } },
  whatsappStats: { sent: { type: Number, default: 0 }, delivered: { type: Number, default: 0 }, read: { type: Number, default: 0 }, clicked: { type: Number, default: 0 }, replied: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
  campaignHistory: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId },
    campaignTitle: { type: String },
    channel: { type: String, enum: ['email', 'whatsapp'] },
    outcome: { type: String },
    timestamp: { type: Date },
  }],
}, { timestamps: true });

// ponytail: own collection — never share CoreKnot `people` identity docs
module.exports = mongoose.model('Person', PersonSchema, 'automailer_people');
