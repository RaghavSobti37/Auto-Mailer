const EmailProfile = require('../models/EmailProfile');

exports.list = async (req, res) => {
  try {
    const profiles = await EmailProfile.find({}).select('-smtpPass -providerCredentials').lean();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const profile = await EmailProfile.findById(req.params.id).select('-smtpPass -providerCredentials').lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name?.trim() || !data.email?.trim()) {
      return res.status(400).json({ error: 'Profile name and From email are required.' });
    }
    const hasPrimary = data.smtpUser?.trim() && data.smtpPass?.trim();
    if (!hasPrimary) {
      return res.status(400).json({ error: 'SMTP credentials are required.' });
    }
    if (data.rotationEnabled !== false) {
      data.rotationEnabled = true;
      data.providerType = 'rotation';
      data.smtpHost = 'rotation';
      data.smtpPort = 587;
    }
    const profile = await EmailProfile.create(data);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const profile = await EmailProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const data = { ...req.body };
    if (data.rotationEnabled !== false) {
      data.rotationEnabled = true;
      data.providerType = 'rotation';
      data.smtpHost = 'rotation';
      data.smtpPort = 587;
    }
    if (!data.smtpPass) delete data.smtpPass;

    Object.assign(profile, data);
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const profile = await EmailProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    await EmailProfile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
