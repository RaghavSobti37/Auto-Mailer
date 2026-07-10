const MailTemplate = require('../models/MailTemplate');

exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const templates = await MailTemplate.find(filter).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const template = await MailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const mergeTemplateAssets = (existing = [], incoming) => {
  if (!Array.isArray(incoming)) return existing;
  const byUrl = new Map();
  (existing || []).forEach((asset) => {
    if (asset?.url) byUrl.set(asset.url, asset);
  });
  incoming.forEach((asset) => {
    if (asset?.url) byUrl.set(asset.url, asset);
  });
  return [...byUrl.values()];
};

exports.saveDraft = async (req, res) => {
  try {
    const { id, name, content, format, subject, dummyValues, assets } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: 'name and content are required' });
    }
    const payload = {
      name: String(name).trim(),
      content,
      format: format === 'rawHtml' ? 'rawHtml' : 'visual',
      subject: subject || '',
      status: 'draft',
      dummyValues: dummyValues && typeof dummyValues === 'object' ? dummyValues : {},
    };
    if (Array.isArray(assets)) payload.assets = assets;

    let template;
    if (id) {
      template = await MailTemplate.findById(id);
      if (!template) return res.status(404).json({ error: 'Template not found' });

      if (!['draft', 'rejected'].includes(template.status)) {
        return res.status(400).json({ error: 'Only draft or rejected templates can be saved as draft' });
      }
      Object.assign(template, payload);
      if (template.status === 'rejected') template.status = 'draft';
      await template.save();
    } else {
      template = await MailTemplate.create(payload);
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const template = await MailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (!['draft', 'rejected'].includes(template.status)) {
      return res.status(400).json({ error: 'Only draft or rejected templates can be submitted' });
    }
    template.status = 'pending_approval';
    template.submittedAt = new Date();
    template.rejectionNote = undefined;
    await template.save();
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const template = await MailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Template is not pending approval' });
    }
    const { content, subject } = req.body || {};
    template.approvedContent = content || template.content;
    template.content = content || template.content;
    if (subject !== undefined) template.subject = subject;
    template.status = 'approved';
    template.approvedAt = new Date();
    template.rejectionNote = undefined;
    await template.save();
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const template = await MailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Template is not pending approval' });
    }
    template.status = 'rejected';
    template.rejectionNote = req.body.rejectionNote || '';
    await template.save();
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const template = await MailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.status === 'approved') {
      return res.status(400).json({ error: 'Cannot delete approved templates' });
    }
    await MailTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
