// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const state = {
  datasetId: "",
  columns: [],
  pollInterval: null,
  croppedBannerBlob: null,
  croppedBannerDataUrl: null, // Track data URL for preview
  cropperInstance: null,
  selectedTemplate: "none",
  ctaSettings: {
    text: "",
    url: "",
    align: "center",
    bg: "#ef4444",
    color: "#ffffff",
    padding: 16
  }
};

const APP_STATE_STORAGE_KEY = "automailer.appState.v1";
const SENDER_LOCAL_STORAGE_KEY = "automailer.senderProfile.v1"; // Legacy fallback
const GMAIL_ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE DEFINITIONS (visual cards + markdown content)
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "none",
    name: "Blank Canvas",
    thumb: [
      { h: "20%", bg: "rgba(255,255,255,0.05)" },
      { h: "60%", bg: "rgba(255,255,255,0.02)" },
      { h: "20%", bg: "rgba(255,255,255,0.05)" },
    ],
    content: ""
  },
  {
    id: "teaser",
    name: "Initial Teaser",
    thumb: [
      { h: "30%", bg: "linear-gradient(135deg,#ef4444,#dc2626)" },
      { h: "40%", bg: "#1e293b" },
      { h: "30%", bg: "#ef4444" },
    ],
    content: `# Something exciting is coming for music creators!

Dear {{firstname}},

Singer? Composer? Music Producer? Original Band? 

Ready to unfold your musical journey? Find out more below!

[Start your Journey Here](https://forms.gle/...)`
  },
  {
    id: "main_campaign",
    name: "mYOUsic Main",
    thumb: [
      { h: "25%", bg: "#ef4444" },
      { h: "15%", bg: "#334155" },
      { h: "40%", bg: "#1e293b" },
      { h: "20%", bg: "#ef4444" },
    ],
    content: `## Turn Up the Volume on Your Dreams
Is your music living in a diary, waiting for its moment? 🎶

Dear {{firstname}},

Have you ever felt that your **original music** deserves to be heard? We understand that every **authentic voice** needs the right stage to shine.

We're introducing **mYOUsic** - a creative space where you'll:
* **Unfold Your Voice:** Join a supportive community.
* **Learn from Masters:** Get personal guidance.
* **Create Pro Music:** Record in a professional studio.

[Begin Your Journey Here](https://forms.gle/...)`
  },
  {
    id: "masterclass",
    name: "Masterclass Promo",
    thumb: [
      { h: "20%", bg: "#1e293b" },
      { h: "60%", bg: "#334155" },
      { h: "20%", bg: "#ef4444" },
    ],
    content: `# Unlock the Secrets of Music Composition!

Dear {{firstname}},

Learn directly from industry legends how to compose, produce, and perfect your original music.

Limited seats available. Don't miss this exclusive masterclass!

[Learn More Now](https://example.com)`
  },
  {
    id: "final_call",
    name: "Final Call (Deadline)",
    thumb: [
      { h: "30%", bg: "#ef4444" },
      { h: "40%", bg: "#fef3c7" },
      { h: "30%", bg: "#ef4444" },
    ],
    content: `# Last Chance to Submit! 🎵

Dear {{firstname}},

Havells mYOUsic is discovering the next big voices. This is your final moment to join.

> ⏰ **DEADLINE ALERT**
> Submission deadline: **February 21st, 11:59 PM**
> AUDITION: **February 22nd (Delhi)**

[REGISTER NOW](https://forms.gle/eFyhEW3ifTdtByvm7)`
  },
  {
    id: "confirmation",
    name: "Event Confirmation",
    thumb: [
      { h: "25%", bg: "#334155" },
      { h: "50%", bg: "#1e293b" },
      { h: "25%", bg: "linear-gradient(135deg,#db2777,#be185d)" },
    ],
    content: `# 🎤 Your Music Journey Begins

Dear {{firstname}},

Thank you for registering for **Havells mYOUsic**. We are thrilled to welcome you!

### Event Details:
* 📅 **Date:** Sunday, 22nd February
* 📍 **Venue:** Global Music Institute (GMI), Noida
* ⏰ **Gate Timings:** 08:30 AM – 10:30 AM

[📸 Visit Instagram for Updates](https://www.instagram.com/the_shakti_collective/)`
  },
  {
    id: "tsc_academy",
    name: "TSC Academy",
    thumb: [
      { h: "30%", bg: "#1a1a2e" },
      { h: "10%", bg: "#d4af37" },
      { h: "40%", bg: "#1a1a2e" },
      { h: "20%", bg: "#d4af37" },
    ],
    content: `## UNFOLD Your Music Composition Potential!

Dear {{firstname}},

Imagine transforming your compositions into industry-ready masterpieces under Bollywood legend **Sandesh Shandilya**.

**What's Inside:**
* **Mentorship:** 12+ Live Sessions.
* **Content:** 200+ mins of Masterclasses.
* **The Pitch:** Pitch your music on "The Young Gunns Demo Day."

[Join Accelerator Program](https://tscacademy.exlyapp.com/...)`
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DOM ELEMENTS
// ─────────────────────────────────────────────────────────────────────────────
const elements = {
  sheetInput: document.getElementById("sheetInput"),
  uploadBtn: document.getElementById("uploadBtn"),
  nameColumn: document.getElementById("nameColumn"),
  emailColumn: document.getElementById("emailColumn"),
  datasetSummary: document.getElementById("datasetSummary"),
  smtpHost: document.getElementById("smtpHost"),
  smtpPort: document.getElementById("smtpPort"),
  senderEmail: document.getElementById("senderEmail"),
  appKey: document.getElementById("appKey"),
  rememberSender: document.getElementById("rememberSender"),
  trackingUrl: document.getElementById("trackingUrl"),
  emailType: document.getElementById("emailType"),
  subject: document.getElementById("subject"),
  message: document.getElementById("message"),
  templateGrid: document.getElementById("templateGrid"),
  attachments: document.getElementById("attachments"),
  attachmentSummary: document.getElementById("attachmentSummary"),
  sendBtn: document.getElementById("sendBtn"),
  status: document.getElementById("status"),
  previewTo: document.getElementById("previewTo"),
  previewSubject: document.getElementById("previewSubject"),
  previewFrame: document.getElementById("previewFrame"),
  progressContainer: document.getElementById("progressContainer"),
  progressBar: document.getElementById("progressBar"),
  progressStatusText: document.getElementById("progressStatusText"),
  progressCountText: document.getElementById("progressCountText"),
  // Full Screen Preview
  fullScreenBtn: document.getElementById("fullScreenBtn"),
  fullScreenModal: document.getElementById("fullScreenModal"),
  fullScreenFrame: document.getElementById("fullScreenFrame"),
  closeFullScreenBtn: document.getElementById("closeFullScreenBtn"),
  // Banner
  rawBannerInput: document.getElementById("rawBannerInput"),
  summonCropperBtn: document.getElementById("summonCropperBtn"),
  bannerPreviewBox: document.getElementById("bannerPreviewBox"),
  bannerThumb: document.getElementById("bannerThumb"),
  bannerStatus: document.getElementById("bannerStatus"),
  removeBannerBtn: document.getElementById("removeBannerBtn"),
  // Modal
  cropperModal: document.getElementById("cropperModal"),
  cropperImageEl: document.getElementById("cropperImage"),
  applyCropBtn: document.getElementById("applyCropBtn"),
  cancelCropBtn: document.getElementById("cancelCropBtn"),
  // Theme & CTA
  themeWrapperBtns: document.querySelectorAll(".theme-wrapper-btn"),
  ctaText: document.getElementById("ctaText"),
  ctaLink: document.getElementById("ctaLink"),
  ctaBgColor: document.getElementById("ctaBgColor"),
  ctaTextColor: document.getElementById("ctaTextColor"),
  ctaPadding: document.getElementById("ctaPadding"),
  ctaAlignBtns: document.querySelectorAll(".align-btn"),
};

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER HTML
// ─────────────────────────────────────────────────────────────────────────────
const previewPlaceholderHtml = `
  <html>
    <body style="margin:0;padding:32px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;min-height:200px;">
      <div style="text-align:center;border:2px dashed #cbd5e1;padding:40px;border-radius:12px;background:#fff;">
        <p style="margin:0;font-size:1rem;">Your live preview will appear here as you type.</p>
      </div>
    </body>
  </html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeHtml(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function setStatus(msg, isError) {
  elements.status.textContent = msg;
  elements.status.style.color = isError ? "var(--mc-red)" : "var(--mc-green)";
}

function insertToken(token) {
  const el = elements.message;
  const val = `{{${token}}}`;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  
  el.value = text.substring(0, start) + val + text.substring(end);
  el.selectionStart = el.selectionEnd = start + val.length;
  el.focus();
  triggerLivePreview();
  persistAppState();
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE CARD GALLERY
// ─────────────────────────────────────────────────────────────────────────────
function buildTemplateGallery() {
  elements.templateGrid.innerHTML = TEMPLATES.map(t => {
    const rows = t.thumb.map(r =>
      `<div class="template-thumb-row" style="height:${r.h};background:${r.bg};"></div>`
    ).join("");

    return `
      <div class="template-card" data-id="${t.id}" onclick="selectTemplate('${t.id}')">
        <div class="template-thumb">${rows}</div>
        <div class="template-name">${escapeHtml(t.name)}</div>
      </div>
    `;
  }).join("");
}

function selectTemplate(id) {
  // Deselect all
  document.querySelectorAll(".template-card").forEach(c => c.classList.remove("selected"));
  // Select target
  const card = document.querySelector(`.template-card[data-id="${id}"]`);
  if (card) card.classList.add("selected");

  state.selectedTemplate = id;
  const tpl = TEMPLATES.find(t => t.id === id);
  if (tpl && tpl.content) {
    elements.message.value = tpl.content;
    triggerLivePreview();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SENDER PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function persistAppState() {
  const data = {
    smtpHost: elements.smtpHost.value.trim(),
    smtpPort: elements.smtpPort.value.trim(),
    senderEmail: elements.senderEmail.value.trim(),
    appKey: elements.appKey.value.trim(),
    rememberSender: elements.rememberSender.checked,
    trackingUrl: elements.trackingUrl.value.trim(),
    subject: elements.subject.value,
    message: elements.message.value,
    nameColumn: elements.nameColumn.value,
    emailColumn: elements.emailColumn.value,
    emailType: elements.emailType.value,
    ctaSettings: state.ctaSettings
  };
  localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(data));
}

function loadAppState() {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY) || localStorage.getItem(SENDER_LOCAL_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);

    // Identity
    if (p.smtpHost) elements.smtpHost.value = p.smtpHost;
    if (p.smtpPort) elements.smtpPort.value = p.smtpPort;
    if (p.senderEmail) elements.senderEmail.value = p.senderEmail;
    if (p.appKey) elements.appKey.value = p.appKey;
    if (typeof p.rememberSender === "boolean") elements.rememberSender.checked = p.rememberSender;
    if (p.trackingUrl) elements.trackingUrl.value = p.trackingUrl;

    // Content
    if (p.subject) elements.subject.value = p.subject;
    if (p.message) elements.message.value = p.message;
    if (p.emailType) elements.emailType.value = p.emailType;

    // Settings
    if (p.ctaSettings) {
      state.ctaSettings = p.ctaSettings;
      // Sync UI for CTA
      if (elements.ctaText) elements.ctaText.value = state.ctaSettings.text || "";
      if (elements.ctaLink) elements.ctaLink.value = state.ctaSettings.url || "";
    }

    // Mappings (will be applied once cols load)
    state.savedMappings = {
      name: p.nameColumn,
      email: p.emailColumn
    };

    // Update UI theme selection
    document.querySelectorAll(".theme-wrapper-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === elements.emailType.value);
    });

  } catch { localStorage.removeItem(APP_STATE_STORAGE_KEY); }
}

async function fetchSenderProfile() {
  try {
    const res = await fetch("/api/sender-profile");
    const data = await res.json();
    elements.smtpHost.value = data.smtpHost || "smtp.gmail.com";
    elements.smtpPort.value = data.smtpPort || 587;
    elements.trackingUrl.value = data.trackingUrl || "";
    persistAppState();
  } catch (e) { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
function optionsHtml(cols) {
  return cols.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function pickColumn(cols, candidates) {
  const low = cols.map(c => c.toLowerCase());
  for (const k of candidates) {
    const i = low.indexOf(k);
    if (i >= 0) return cols[i];
  }
  return cols[0] || "";
}

async function uploadSheet() {
  const file = elements.sheetInput.files[0];
  if (!file) { setStatus("Choose a file first.", true); return; }
  elements.uploadBtn.disabled = true;
  setStatus("Uploading…", false);
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error || "Upload failed.", true); return; }
    state.datasetId = data.datasetId;
    state.columns = data.columns;
    elements.nameColumn.innerHTML = optionsHtml(data.columns);
    elements.emailColumn.innerHTML = optionsHtml(data.columns);

    // Use saved mapping if available, else auto-pick
    if (state.savedMappings && state.savedMappings.name && data.columns.includes(state.savedMappings.name)) {
      elements.nameColumn.value = state.savedMappings.name;
    } else {
      elements.nameColumn.value = pickColumn(data.columns, ["name", "full name", "contact name"]);
    }

    if (state.savedMappings && state.savedMappings.email && data.columns.includes(state.savedMappings.email)) {
      elements.emailColumn.value = state.savedMappings.email;
    } else {
      elements.emailColumn.value = pickColumn(data.columns, ["email", "email address", "email id"]);
    }

    elements.datasetSummary.textContent = `✓ ${data.rows} rows, ${data.columns.length} columns loaded.`;
    setStatus("", false);
    triggerLivePreview();
  } catch (e) { setStatus(`Upload failed: ${e.message}`, true); }
  finally { elements.uploadBtn.disabled = false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANNER CROP FLOW
// ─────────────────────────────────────────────────────────────────────────────
function openCropperModal(file) {
  const reader = new FileReader();
  reader.onload = e => {
    elements.cropperImageEl.src = e.target.result;
    elements.cropperModal.classList.add("active");

    if (state.cropperInstance) {
      state.cropperInstance.destroy();
      state.cropperInstance = null;
    }

    // Wait for img to draw then init Cropper
    setTimeout(() => {
      state.cropperInstance = new Cropper(elements.cropperImageEl, {
        aspectRatio: 2.88, // 720 / 250
        viewMode: 1,
        autoCropArea: 1,
        movable: true,
        zoomable: true,
        rotatable: false,
        scalable: false,
      });
    }, 100);
  };
  reader.readAsDataURL(file);
}

function applyCrop() {
  if (!state.cropperInstance) return;
  const canvas = state.cropperInstance.getCroppedCanvas({ width: 720, height: 250 });
  canvas.toBlob(blob => {
    state.croppedBannerBlob = blob;
    state.croppedBannerDataUrl = canvas.toDataURL("image/png"); // Save for preview
    const url = URL.createObjectURL(blob);
    elements.bannerThumb.src = url;
    elements.bannerPreviewBox.style.display = "block";
    elements.bannerStatus.style.display = "block";
    elements.summonCropperBtn.textContent = "Replace Banner";
    closeCropperModal();
    triggerLivePreview(); // Refresh preview with new banner
  }, "image/png");
}

function closeCropperModal() {
  elements.cropperModal.classList.remove("active");
  if (state.cropperInstance) { state.cropperInstance.destroy(); state.cropperInstance = null; }
}

function removeBanner() {
  state.croppedBannerBlob = null;
  state.croppedBannerDataUrl = null;
  elements.bannerThumb.src = "";
  elements.bannerPreviewBox.style.display = "none";
  elements.bannerStatus.style.display = "none";
  elements.summonCropperBtn.textContent = "Select & Crop Banner Image";
  elements.rawBannerInput.value = "";
  triggerLivePreview(); // Refresh preview to remove banner
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PREVIEW (debounced 500ms)
// ─────────────────────────────────────────────────────────────────────────────
const triggerLivePreview = debounce(async () => {
  elements.previewSubject.textContent = elements.subject.value || "Your Subject Here";
  if (!state.datasetId) return;

  const payload = {
    datasetId: state.datasetId,
    nameColumn: elements.nameColumn.value,
    emailColumn: elements.emailColumn.value,
    emailType: elements.emailType.value,
    smtpHost: elements.smtpHost.value.trim(),
    smtpPort: elements.smtpPort.value.trim(),
    senderEmail: elements.senderEmail.value.trim(),
    appKey: elements.appKey.value.trim(),
    rememberSender: elements.rememberSender.checked,
    subject: elements.subject.value,
    message: elements.message.value,
    bannerDataUrl: state.croppedBannerDataUrl, // Pass banner to preview
    ctaSettings: state.ctaSettings,             // Pass CTA logic
    trackingUrl: elements.trackingUrl.value.trim(),
  };

  try {
    const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return;
    elements.previewTo.textContent = data.recipient || "recipient@example.com";
    elements.previewSubject.textContent = data.subject || payload.subject || "Your Subject Here";
    elements.previewFrame.srcdoc = data.emailHtml || previewPlaceholderHtml;
  } catch { /* silent */ }
}, 500);

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────────────────────────
function updateAttachmentSummary() {
  const count = elements.attachments.files.length;
  if (!count) { elements.attachmentSummary.textContent = "No attachments configured."; return; }
  const total = (Array.from(elements.attachments.files).reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2);
  elements.attachmentSummary.textContent = `${count} attachment(s) — ${total} MB total.`;
  if (parseFloat(total) > 25) setStatus("Attachments exceed the 25 MB Gmail limit.", true);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
async function sendCampaign() {
  if (!state.datasetId) { setStatus("Upload an audience sheet first.", true); return; }
  if (!elements.senderEmail.value.trim()) { setStatus("Enter your sender email.", true); return; }
  if (!elements.subject.value.trim()) { setStatus("Add a subject line.", true); return; }
  if (!elements.message.value.trim()) { setStatus("Write your campaign message.", true); return; }

  elements.sendBtn.disabled = true;
  setStatus("Initialising campaign…", false);

  const fd = new FormData();
  fd.append("datasetId", state.datasetId);
  fd.append("nameColumn", elements.nameColumn.value);
  fd.append("emailColumn", elements.emailColumn.value);
  fd.append("emailType", elements.emailType.value);
  fd.append("smtpHost", elements.smtpHost.value.trim());
  fd.append("smtpPort", elements.smtpPort.value.trim());
  fd.append("senderEmail", elements.senderEmail.value.trim());
  fd.append("appKey", elements.appKey.value.trim());
  fd.append("rememberSender", String(elements.rememberSender.checked));
  fd.append("trackingUrl", elements.trackingUrl.value.trim());
  fd.append("subject", elements.subject.value);
  fd.append("message", elements.message.value);
  fd.append("ctaSettings", JSON.stringify(state.ctaSettings));

  if (state.croppedBannerBlob) {
    fd.append("bannerImage", state.croppedBannerBlob, "banner.png");
  }

  for (const file of elements.attachments.files) {
    fd.append("attachments", file, file.name);
  }

  try {
    const res = await fetch("/api/send", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { 
      setStatus(data.error || "Send failed.", true); 
      showToast(data.error || "Send failed.", "error");
      elements.sendBtn.disabled = false; 
      return; 
    }
    if (data.campaignId) pollCampaignStatus(data.campaignId);
  } catch (e) { 
    setStatus(`Failed: ${e.message}`, true); 
    showToast(`Failed: ${e.message}`, "error");
    elements.sendBtn.disabled = false; 
  }
}

// ─────────────────────────────────────────────────────────────────────────────
function pollCampaignStatus(campaignId) {
  if (state.pollInterval) clearInterval(state.pollInterval);
  elements.progressContainer.style.display = "flex";
  elements.progressBar.style.width = "0%";
  elements.progressStatusText.textContent = "Connecting…";
  elements.progressCountText.textContent = "0 / 0";

  // Store campaign ID to allow auto-resume on refresh
  localStorage.setItem("automailer.lastCampaignId", campaignId);
  
  state.pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/campaign-status/${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      
      const done = (data.sent || 0) + (data.failed || 0);
      const total = data.total || 0;
      const pct = total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0;
      elements.progressBar.style.width = `${pct}%`;
      elements.progressCountText.textContent = `${done} / ${total}`;

      if (data.status && data.status !== "sending" && data.status !== "running") {
        // Campaign finished sending, but we keep the interval alive for post-send monitoring!
        elements.sendBtn.disabled = false;
        
        if (data.status === "complete") {
           elements.progressStatusText.textContent = "✓ Sent. Monitoring Interactions…";
           setStatus(`Sent: ${data.sent}, Bounced: ${data.failed} | Interactions: ${data.opens} Opens, ${data.clicks} Clicks`, false);
           
           // Slow down the interval for background monitoring (every 10 seconds)
           if (state.pollInterval && !state.monitoringMode) {
              clearInterval(state.pollInterval);
              state.monitoringMode = true;
              pollCampaignStatus(campaignId); // Restart with new slow interval? No, easier logic below:
           }
        } else {
           // Error state - usually safe to stop polling
           clearInterval(state.pollInterval);
           state.pollInterval = null;
           elements.progressStatusText.textContent = `Error: ${data.status}`;
           setStatus(`Halted: ${data.status}`, true);
        }
      } else if (!data.status) {
        // Safety: If status is missing (e.g. server restarted or error), we stop eventually.
        state.consecutiveMissingStatus = (state.consecutiveMissingStatus || 0) + 1;
        if (state.consecutiveMissingStatus > 5) {
          clearInterval(state.pollInterval);
          state.pollInterval = null;
          elements.sendBtn.disabled = false;
          elements.progressStatusText.textContent = "Status Unknown (Stopped)";
          setStatus("Lost connection to campaign monitor.", true);
        }
      } else {
        state.consecutiveMissingStatus = 0;
        elements.progressStatusText.textContent = "Dispatching…";
      }
    } catch (e) { }
  }, state.monitoringMode ? 10000 : 1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// BIND EVENTS
// ─────────────────────────────────────────────────────────────────────────────
function bindEvents() {
  elements.uploadBtn.addEventListener("click", uploadSheet);
  elements.sendBtn.addEventListener("click", sendCampaign);

  // Live preview triggers
  elements.subject.addEventListener("input", triggerLivePreview);
  elements.message.addEventListener("input", triggerLivePreview);
  elements.nameColumn.addEventListener("change", triggerLivePreview);
  elements.emailColumn.addEventListener("change", triggerLivePreview);
  elements.emailType.addEventListener("change", triggerLivePreview);

  // Attachments
  elements.attachments.addEventListener("change", updateAttachmentSummary);

  // Expanded persistence
  const persistenceInputs = [
    "subject", "message", "nameColumn", "emailColumn", "emailType",
    "smtpHost", "smtpPort", "senderEmail", "appKey", "trackingUrl"
  ];
  persistenceInputs.forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener("input", persistAppState);
      if (elements[id].tagName === "SELECT") {
        elements[id].addEventListener("change", persistAppState);
      }
    }
  });

  elements.rememberSender.addEventListener("change", persistAppState);

  // Banner crop flow
  elements.summonCropperBtn.addEventListener("click", () => elements.rawBannerInput.click());
  elements.rawBannerInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) openCropperModal(file);
  });
  elements.applyCropBtn.addEventListener("click", applyCrop);
  elements.cancelCropBtn.addEventListener("click", closeCropperModal);
  elements.removeBannerBtn.addEventListener("click", removeBanner);

  // Theme Select Buttons
  elements.themeWrapperBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.themeWrapperBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      elements.emailType.value = btn.dataset.type;
      triggerLivePreview();
    });
  });

  // CTA Master Controls
  elements.ctaText.addEventListener("input", () => { state.ctaSettings.text = elements.ctaText.value; triggerLivePreview(); });
  elements.ctaLink.addEventListener("input", () => { state.ctaSettings.url = elements.ctaLink.value; triggerLivePreview(); });
  elements.ctaBgColor.addEventListener("input", () => { state.ctaSettings.bg = elements.ctaBgColor.value; triggerLivePreview(); });
  elements.ctaTextColor.addEventListener("input", () => { state.ctaSettings.color = elements.ctaTextColor.value; triggerLivePreview(); });
  elements.ctaPadding.addEventListener("input", () => { state.ctaSettings.padding = elements.ctaPadding.value; triggerLivePreview(); });

  elements.ctaAlignBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.ctaAlignBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.ctaSettings.align = btn.dataset.align;
      triggerLivePreview();
    });
  });

  // Full Screen Preview
  elements.fullScreenBtn.addEventListener("click", () => {
    elements.fullScreenFrame.srcdoc = elements.previewFrame.srcdoc;
    elements.fullScreenModal.classList.add("active");
  });
  elements.closeFullScreenBtn.addEventListener("click", () => {
    elements.fullScreenModal.classList.remove("active");
    elements.fullScreenFrame.srcdoc = "";
  });

  // Close modals on overlay click
  [elements.cropperModal, elements.fullScreenModal].forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        modal.classList.remove("active");
        if (modal === elements.fullScreenModal) elements.fullScreenFrame.srcdoc = "";
        if (modal === elements.cropperModal && state.cropperInstance) {
          state.cropperInstance.destroy();
          state.cropperInstance = null;
        }
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
buildTemplateGallery();
bindEvents();
elements.previewFrame.srcdoc = previewPlaceholderHtml;
updateAttachmentSummary();
loadAppState();
fetchSenderProfile();

// Auto-resume campaign monitoring if one was active
const lastCid = localStorage.getItem("automailer.lastCampaignId");
if (lastCid) {
  state.monitoringMode = true;
  pollCampaignStatus(lastCid);
}
