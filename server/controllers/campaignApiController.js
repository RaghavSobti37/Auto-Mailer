const crypto = require('crypto');
const Campaign = require('../models/Campaign');
const MailCampaign = require('../models/MailCampaign');
const MailTemplate = require('../models/MailTemplate');
const MailEvent = require('../models/MailEvent');
const EmailLog = require('../models/EmailLog');
const { dispatchCampaignJobs, stopCampaign } = require('../services/campaignEmailQueue');

exports.list = async (req, res) => {
  try {
    const listPipeline = [
      { $addFields: { recipientCount: { $size: { $ifNull: ['$recipients', []] } } } },
      { $project: { content: 0, recipients: 0 } },
      { $sort: { createdAt: -1 } },
    ];
    const [coreCampaigns, mailCampaigns] = await Promise.all([
      Campaign.aggregate(listPipeline),
      MailCampaign.aggregate(listPipeline),
    ]);
    const allCampaigns = [...coreCampaigns, ...mailCampaigns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(allCampaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id).select('-recipients').lean();
    if (!campaign) {
      campaign = await MailCampaign.findById(req.params.id).select('-recipients').lean();
    }
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      title, subject, content, senderProfileId, senderMode, senderProfileIds,
      systemProvider, resendFromEmail, emailStreamSlug, includeSignature, signature, removeUnsubscribe, attachments,
      mailTemplateId, variableMapping, customRecipients, action,
    } = req.body;
    const dispatchNow = action === 'dispatch';
    const campaignId = crypto.randomBytes(12).toString('hex');

    let templateContent = content || '';
    if (mailTemplateId) {
      const template = await MailTemplate.findById(mailTemplateId);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      if (template.status !== 'approved') {
        return res.status(400).json({ error: 'Only approved templates can be used for campaigns' });
      }
      templateContent = template.approvedContent || template.content;
    }

    const mode = senderMode || 'single';
    if (mode === 'single' && !senderProfileId) {
      return res.status(400).json({ error: 'senderProfileId required for single sender mode' });
    }
    if (mode === 'pool' && (!senderProfileIds || senderProfileIds.length === 0)) {
      return res.status(400).json({ error: 'At least one profile required for pool mode' });
    }

    const custom = (Array.isArray(customRecipients) ? customRecipients : [])
      .map((r) => {
        const email = r?.email?.trim().toLowerCase();
        if (!email || !/[^\s@]+@[^\s@]+/.test(email)) return null;
        const name = (r?.name || '').trim();
        return {
          email,
          name,
          rowData: {
            ...(r?.rowData || {}),
            email,
            name: r?.rowData?.name || name,
          },
          status: 'Pending',
        };
      })
      .filter(Boolean);

    const uniqueEmails = new Set();
    const allRecipients = custom.filter((r) => {
      if (uniqueEmails.has(r.email)) return false;
      uniqueEmails.add(r.email);
      return true;
    });

    const campaignPayload = {
      campaignId,
      title,
      subject: subject || title,
      content: templateContent,
      mailTemplateId: mailTemplateId || undefined,
      variableMapping: variableMapping && typeof variableMapping === 'object' ? variableMapping : {},
      senderProfileId: senderProfileId || undefined,
      senderMode: mode,
      senderProfileIds: senderProfileIds || [],
      includeSignature: includeSignature !== false,
      signature: typeof signature === 'string' ? signature : '',
      removeUnsubscribe: removeUnsubscribe === true,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename, contentType: a.contentType, storageKey: a.storageKey, storageUrl: a.storageUrl,
      })),
      recipients: allRecipients,
      recipientCount: allRecipients.length,
      status: dispatchNow ? 'Queued' : 'Draft',
      metrics: { totalSent: 0, opened: 0, clicked: 0, bounced: 0 },
    };
    if (systemProvider === 'resend' || systemProvider === 'env_smtp') {
      campaignPayload.systemProvider = systemProvider;
    }
    if (mode === 'system_resend' && resendFromEmail) {
      campaignPayload.resendFromEmail = resendFromEmail.trim().toLowerCase();
    }
    if (emailStreamSlug) {
      campaignPayload.emailStreamSlug = emailStreamSlug.trim().toLowerCase();
    }

    const campaign = await Campaign.create(campaignPayload);

    let dispatchResult = null;
    const sendableCount = allRecipients.filter((r) => r.status === 'Pending').length;
    if (dispatchNow && sendableCount > 0) {
      dispatchResult = await dispatchCampaignJobs(campaign._id);
    }

    res.status(201).json({ ...campaign.toObject(), dispatch: dispatchResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.dispatch = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id);
    if (!campaign) campaign = await MailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.status === 'Draft') {
      campaign.status = 'Queued';
      await campaign.save();
    }
    const result = await dispatchCampaignJobs(campaign._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stop = async (req, res) => {
  try {
    const result = await stopCampaign(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.message?.includes('Cannot stop') ? 400 : 500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id);
    if (!campaign) campaign = await MailCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const campId = campaign._id;
    const campaignTag = campaign.campaignId || String(campId);

    const Model = campaign.constructor;
    await Model.findByIdAndDelete(campId);
    await EmailLog.deleteMany({ campaignId: { $in: [campaignTag, String(campId)] } });
    await MailEvent.deleteMany({ campaignId: campId });

    res.json({ success: true, message: 'Campaign and tracking data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const events = await MailEvent.find({ campaignId: req.params.id }).sort({ timestamp: -1 }).limit(1000).lean();
    const timeSeries = [];
    for (const event of events) {
      const hour = event.timestamp ? `${new Date(event.timestamp).toISOString().slice(0, 13)}:00` : 'unknown';
      if (!timeSeries.find((t) => t.time === hour)) {
        timeSeries.push({ time: hour, opens: 0, clicks: 0 });
      }
      const ts = timeSeries.find((t) => t.time === hour);
      if (event.eventType === 'Open') ts.opens++;
      if (event.eventType === 'Click') ts.clicks++;
    }

    res.json({
      timeSeries: timeSeries.sort((a, b) => a.time.localeCompare(b.time)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
