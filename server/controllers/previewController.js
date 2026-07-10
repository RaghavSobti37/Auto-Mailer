/**
 * Preview and test send controller.
 * Renders email previews with variable substitution and generates test sends.
 */
const EmailProfile = require('../models/EmailProfile');
const { dispatchEmailPayload } = require('../services/mailDriver');
const { applySignature } = require('../utils/emailSignature');
const { wrapPreviewDocument } = require('../utils/buildFinalEmailHtml');

/**
 * POST /api/mail/preview
 * Render a preview of an email with variables substituted.
 */
exports.preview = async (req, res) => {
  try {
    const {
      content, subject, format, includeSignature, signature,
      removeUnsubscribe, sampleRecipient, variableMapping, theme,
    } = req.body;

    if (!sampleRecipient || !sampleRecipient.email) {
      return res.status(400).json({ error: 'sampleRecipient with email is required' });
    }

    let html = content || '';

    // Substitute variables from sample recipient
    if (variableMapping && typeof variableMapping === 'object') {
      Object.entries(variableMapping).forEach(([idx, col]) => {
        const val = sampleRecipient.rowData?.[col] || sampleRecipient[col] || '';
        const pattern = new RegExp(`\\{${idx}\\}`, 'g');
        const patternNamed = new RegExp(`\\{\\{${idx}\\}\\}`, 'g');
        html = html.replace(pattern, val).replace(patternNamed, val);
      });
    }

    // Apply signature
    if (includeSignature && signature) {
      html = applySignature(html, signature);
    }

    // Build preview HTML
    const previewHtml = format === 'rawHtml'
      ? html
      : wrapPreviewDocument(html, { theme: theme || 'light' });

    res.json({ html: previewHtml, subject: subject || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/mail/test-campaign
 * Send a test email to a single recipient.
 */
exports.testCampaign = async (req, res) => {
  try {
    const {
      subject, content, testEmail, senderProfileId, senderProfileIds,
      senderMode, resendFromEmail, format, includeSignature, signature,
      removeUnsubscribe, variableMapping, sampleRecipient, attachments,
    } = req.body;

    if (!testEmail || !/[^\s@]+@[^\s@]+/.test(testEmail)) {
      return res.status(400).json({ error: 'Valid test email is required' });
    }

    let html = content || '';

    // Substitute variables from sample recipient if provided
    if (variableMapping && typeof variableMapping === 'object' && sampleRecipient) {
      Object.entries(variableMapping).forEach(([idx, col]) => {
        const val = sampleRecipient.rowData?.[col] || sampleRecipient[col] || '';
        const pattern = new RegExp(`\\{${idx}\\}`, 'g');
        const patternNamed = new RegExp(`\\{\\{${idx}\\}\\}`, 'g');
        html = html.replace(pattern, val).replace(patternNamed, val);
      });
    }

    // Apply signature
    if (includeSignature && signature) {
      html = applySignature(html, signature);
    }

    // Build final HTML
    let finalHtml = html;
    if (format !== 'rawHtml') {
      finalHtml = wrapPreviewDocument(html);
    }

    let from = null;

    if (senderMode === 'system_resend' || senderMode === 'system_smtp') {
      from = resendFromEmail || undefined;
    } else if (senderProfileId) {
      const profile = await EmailProfile.findById(senderProfileId);
      if (profile) {
        from = profile.email;
      }
    }

    const result = await dispatchEmailPayload({
      to: testEmail,
      subject: subject || 'Test Campaign',
      html: finalHtml,
      from,
    });

    res.json({ result, message: `Test sent to ${testEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/mail/scan-bounces
 * Scan inbox for bounce messages (basic implementation).
 */
exports.scanBounces = async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }

    const profile = await EmailProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // In the standalone mailer, IMAP bounce scanning is limited.
    // This endpoint logs the attempt and marks it as a placeholder.
    // For real bounce detection, use Resend webhooks or IMAP scanning.
    console.log(`[ScanBounces] Profile "${profile.email}" — bounce scan placeholder. Use Resend webhooks for real bounce detection.`);

    res.json({
      success: true,
      message: 'Bounce scan placeholder. For real bounce detection, configure Resend webhooks.',
      scanned: 0,
      found: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/campaigns/upload-attachment
 * Upload a campaign attachment (stored as memory/file reference).
 */
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file && !req.body?.fileData) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // For now, support fileData in JSON body (base64 or URL references)
    if (req.body?.fileData) {
      const { filename, contentType, data } = req.body.fileData;
      return res.json({
        filename: filename || 'attachment',
        contentType: contentType || 'application/octet-stream',
        storageKey: `upload_${Date.now()}_${filename || 'file'}`,
        storageUrl: data || '',
      });
    }

    // Multer file upload
    return res.json({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      storageKey: `upload_${Date.now()}_${req.file.originalname}`,
      storageUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
