const state = {
  datasetId: "",
  columns: [],
};

const SENDER_LOCAL_STORAGE_KEY = "automailer.senderProfile.v1";
const GMAIL_ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024;

const elements = {
  sheetInput: document.getElementById("sheetInput"),
  uploadBtn: document.getElementById("uploadBtn"),
  nameColumn: document.getElementById("nameColumn"),
  emailColumn: document.getElementById("emailColumn"),
  datasetSummary: document.getElementById("datasetSummary"),
  senderEmail: document.getElementById("senderEmail"),
  appKey: document.getElementById("appKey"),
  rememberSender: document.getElementById("rememberSender"),
  emailType: document.getElementById("emailType"),
  subject: document.getElementById("subject"),
  message: document.getElementById("message"),
  attachments: document.getElementById("attachments"),
  attachmentSummary: document.getElementById("attachmentSummary"),
  previewBtn: document.getElementById("previewBtn"),
  sendBtn: document.getElementById("sendBtn"),
  status: document.getElementById("status"),
  previewTo: document.getElementById("previewTo"),
  previewSubject: document.getElementById("previewSubject"),
  previewFrame: document.getElementById("previewFrame"),
};

const previewPlaceholderHtml = `
  <html>
    <body style="margin:0; padding:24px; background:#f7f7f7; font-family:Arial, Helvetica, sans-serif; color:#52606a;">
      <div style="max-width:720px; margin:0 auto; background:#ffffff; padding:32px; border:1px solid #e5e7eb; border-radius:12px;">
        Upload a sheet and compose your draft to see a live preview.
      </div>
    </body>
  </html>
`;

async function fetchSenderProfile() {
  try {
    const response = await fetch("/api/sender-profile");
    const data = await response.json();
    if (data.saved && data.email && !elements.senderEmail.value.trim()) {
      elements.senderEmail.value = data.email;
      persistLocalSenderProfile();
      setStatus("Loaded saved sender email.", false);
    }
  } catch {
    setStatus("Could not load saved sender profile.", true);
  }
}

function persistLocalSenderProfile() {
  const payload = {
    senderEmail: elements.senderEmail.value.trim(),
    appKey: elements.appKey.value.trim(),
    rememberSender: elements.rememberSender.checked,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(SENDER_LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

function loadLocalSenderProfile() {
  const raw = localStorage.getItem(SENDER_LOCAL_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.senderEmail === "string") {
      elements.senderEmail.value = parsed.senderEmail;
    }
    if (typeof parsed.appKey === "string") {
      elements.appKey.value = parsed.appKey;
    }
    if (typeof parsed.rememberSender === "boolean") {
      elements.rememberSender.checked = parsed.rememberSender;
    }
    setStatus("Loaded sender details from this device.", false);
  } catch {
    localStorage.removeItem(SENDER_LOCAL_STORAGE_KEY);
  }
}

function setStatus(message, isError) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#a32727" : "#115c53";
}

function optionsHtml(columns) {
  return columns.map((col) => `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pickColumn(columns, candidates) {
  const lowered = columns.map((col) => col.toLowerCase());
  for (const candidate of candidates) {
    const index = lowered.indexOf(candidate);
    if (index >= 0) {
      return columns[index];
    }
  }
  return columns[0] || "";
}

async function uploadSheet() {
  const file = elements.sheetInput.files[0];
  if (!file) {
    setStatus("Choose a file before uploading.", true);
    return;
  }

  elements.uploadBtn.disabled = true;
  setStatus("Uploading and reading your sheet...", false);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Upload failed.", true);
      return;
    }

    state.datasetId = data.datasetId;
    state.columns = data.columns;

    elements.nameColumn.innerHTML = optionsHtml(data.columns);
    elements.emailColumn.innerHTML = optionsHtml(data.columns);

    elements.nameColumn.value = pickColumn(data.columns, ["name", "full name", "contact name"]);
    elements.emailColumn.value = pickColumn(data.columns, ["email", "email address", "email id"]);

    elements.datasetSummary.textContent = `Loaded ${data.rows} rows and ${data.columns.length} columns.`;
    setStatus("Sheet uploaded. Map columns and compose your message.", false);
    await updatePreview();
  } catch (error) {
    setStatus(`Upload failed: ${error.message}`, true);
  } finally {
    elements.uploadBtn.disabled = false;
  }
}

function buildPayload() {
  return {
    datasetId: state.datasetId,
    nameColumn: elements.nameColumn.value,
    emailColumn: elements.emailColumn.value,
    emailType: elements.emailType.value,
    senderEmail: elements.senderEmail.value.trim(),
    appKey: elements.appKey.value.trim(),
    rememberSender: elements.rememberSender.checked,
    subject: elements.subject.value,
    message: elements.message.value,
  };
}

function buildSendFormData(payload) {
  const formData = new FormData();
  formData.append("datasetId", payload.datasetId);
  formData.append("nameColumn", payload.nameColumn);
  formData.append("emailColumn", payload.emailColumn);
  formData.append("emailType", payload.emailType);
  formData.append("senderEmail", payload.senderEmail);
  formData.append("appKey", payload.appKey);
  formData.append("rememberSender", String(payload.rememberSender));
  formData.append("subject", payload.subject);
  formData.append("message", payload.message);

  for (const file of elements.attachments.files) {
    formData.append("attachments", file, file.name);
  }

  return formData;
}

function getAttachmentTotalBytes() {
  return Array.from(elements.attachments.files).reduce((sum, file) => sum + file.size, 0);
}

function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateAttachmentLimit() {
  const totalBytes = getAttachmentTotalBytes();
  if (totalBytes > GMAIL_ATTACHMENT_LIMIT_BYTES) {
    setStatus(
      `Total attachment size is ${formatMegabytes(totalBytes)}. Gmail allows up to 25.00 MB per email.`,
      true
    );
    return false;
  }
  return true;
}

function updateAttachmentSummary() {
  const count = elements.attachments.files.length;
  if (!count) {
    elements.attachmentSummary.textContent = "No attachments selected. Gmail allows up to 25 MB total attachments per email.";
    return;
  }

  const names = Array.from(elements.attachments.files).map((file) => file.name);
  const previewNames = names.slice(0, 3).join(", ");
  const extraCount = count > 3 ? ` (+${count - 3} more)` : "";
  const totalBytes = getAttachmentTotalBytes();
  const totalText = formatMegabytes(totalBytes);
  const limitText = formatMegabytes(GMAIL_ATTACHMENT_LIMIT_BYTES);
  elements.attachmentSummary.textContent = `${count} attachment(s): ${previewNames}${extraCount}. Total size: ${totalText} / ${limitText}.`;

  if (totalBytes > GMAIL_ATTACHMENT_LIMIT_BYTES) {
    setStatus(`Attachment size exceeds Gmail's 25 MB limit. Remove some files and try again.`, true);
  }
}

function resizePreviewFrame() {
  const frameDocument = elements.previewFrame.contentDocument;
  if (!frameDocument) {
    return;
  }

  const bodyHeight = frameDocument.body ? frameDocument.body.scrollHeight : 0;
  const htmlHeight = frameDocument.documentElement ? frameDocument.documentElement.scrollHeight : 0;
  const nextHeight = Math.max(bodyHeight, htmlHeight, 360);
  elements.previewFrame.style.height = `${nextHeight}px`;
}

function setPreviewFrameContent(html) {
  elements.previewFrame.srcdoc = html || previewPlaceholderHtml;
}

async function updatePreview() {
  if (!state.datasetId) {
    setStatus("Upload a sheet to see preview.", true);
    return;
  }

  const payload = buildPayload();
  try {
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Preview failed.", true);
      return;
    }

    elements.previewTo.textContent = data.recipient || "-";
    elements.previewSubject.textContent = data.subject || "-";
    setPreviewFrameContent(data.emailHtml);
    setStatus("Preview refreshed.", false);
  } catch (error) {
    setStatus(`Preview failed: ${error.message}`, true);
  }
}

async function sendCampaign() {
  if (!state.datasetId) {
    setStatus("Upload a sheet first.", true);
    return;
  }

  const payload = buildPayload();
  if (!payload.senderEmail || !payload.subject || !payload.message || !payload.nameColumn || !payload.emailColumn) {
    setStatus("Complete sender email, column mapping, subject, and message first.", true);
    return;
  }

  if (!validateAttachmentLimit()) {
    return;
  }

  elements.sendBtn.disabled = true;
  setStatus("Sending campaign... this may take a while for large sheets.", false);

  try {
    const formData = buildSendFormData(payload);
    const response = await fetch("/api/send", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Send failed.", true);
      return;
    }

    const note = `Campaign finished. Sent: ${data.sent}, Failed: ${data.failed}, Total valid: ${data.total}, Attachments: ${data.attachments || 0}.`;
    setStatus(note, false);

    if (data.failedRows && data.failedRows.length) {
      const firstFailure = data.failedRows[0];
      setStatus(`${note} First failure: ${firstFailure.email} (${firstFailure.error})`, true);
    }
  } catch (error) {
    setStatus(`Send failed: ${error.message}`, true);
  } finally {
    elements.sendBtn.disabled = false;
  }
}

function bindEvents() {
  elements.previewFrame.addEventListener("load", resizePreviewFrame);
  elements.uploadBtn.addEventListener("click", uploadSheet);
  elements.previewBtn.addEventListener("click", updatePreview);
  elements.sendBtn.addEventListener("click", sendCampaign);
  elements.nameColumn.addEventListener("change", updatePreview);
  elements.emailColumn.addEventListener("change", updatePreview);
  elements.emailType.addEventListener("change", updatePreview);
  elements.attachments.addEventListener("change", updateAttachmentSummary);
  elements.senderEmail.addEventListener("input", persistLocalSenderProfile);
  elements.appKey.addEventListener("input", persistLocalSenderProfile);
  elements.rememberSender.addEventListener("change", persistLocalSenderProfile);
}

bindEvents();
setPreviewFrameContent("");
updateAttachmentSummary();
loadLocalSenderProfile();
fetchSenderProfile();
