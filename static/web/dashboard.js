// ────────────────────────────────────────
// DUMMY DATA (shown when real data is empty)
// ────────────────────────────────────────
const DUMMY_CAMPAIGNS = [
  {
    id: "demo-001",
    subject: "🚀 Product Launch — Spring Collection 2024",
    createdAt: "2024-04-10T08:30:00",
    stats: { total: 12450, sent: 12180, failed: 270, opens: 5432, clicks: 1876, registered: 312 }
  },
  {
    id: "demo-002",
    subject: "🎯 AutoMailer Monthly Newsletter — March",
    createdAt: "2024-03-28T14:00:00",
    stats: { total: 8200, sent: 8031, failed: 169, opens: 3110, clicks: 892, registered: 148 }
  },
  {
    id: "demo-003",
    subject: "🎓 Webinar Invite: Mastering Email Marketing",
    createdAt: "2024-03-15T09:00:00",
    stats: { total: 4500, sent: 4455, failed: 45, opens: 2870, clicks: 1203, registered: 389 }
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function colorForPct(pct) {
  if (pct >= 60) return "var(--mc-green)";
  if (pct >= 30) return "#facc15";
  return "var(--mc-red)";
}

function pct(num, denom) {
  return denom > 0 ? ((num / denom) * 100).toFixed(1) : "0";
}

function renderSummaryBar(campaigns) {
  const totals = campaigns.reduce((acc, c) => {
    acc.total += c.stats.total;
    acc.sent += c.stats.sent;
    acc.failed += c.stats.failed;
    acc.opens += c.stats.opens;
    acc.clicks += c.stats.clicks;
    acc.registered += c.stats.registered;
    return acc;
  }, { total:0, sent:0, failed:0, opens:0, clicks:0, registered:0 });

  const openPct  = pct(totals.opens, totals.sent);
  const clickPct = pct(totals.clicks, totals.sent);
  const convPct  = pct(totals.registered, totals.sent);

  document.getElementById("summaryBar").innerHTML = `
    <div class="summary-card" style="--accent:var(--mc-yellow);">
      <div class="summary-value">${campaigns.length}</div>
      <div class="summary-label">Campaigns</div>
    </div>
    <div class="summary-card" style="--accent:var(--mc-green);">
      <div class="summary-value">${totals.sent.toLocaleString()}</div>
      <div class="summary-label">Total Delivered</div>
    </div>
    <div class="summary-card" style="--accent:#6366f1;">
      <div class="summary-value">${openPct}%</div>
      <div class="summary-label">Avg Open Rate</div>
    </div>
    <div class="summary-card" style="--accent:#06b6d4;">
      <div class="summary-value">${clickPct}%</div>
      <div class="summary-label">Avg Click Rate</div>
    </div>
    <div class="summary-card" style="--accent:var(--mc-red);">
      <div class="summary-value">${totals.failed.toLocaleString()}</div>
      <div class="summary-label">Bounced</div>
    </div>
    <div class="summary-card" style="--accent:#a855f7;">
      <div class="summary-value">${convPct}%</div>
      <div class="summary-label">Conversion Rate</div>
    </div>
  `;
}

function renderCampaignCard(c) {
  const dateStr = new Date(c.createdAt + (c.createdAt.endsWith("Z") ? "" : "Z")).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
  const openRate  = pct(c.stats.opens, c.stats.sent);
  const clickRate = pct(c.stats.clicks, c.stats.sent);
  const convRate  = pct(c.stats.registered, c.stats.sent);
  const isDemo    = c.id.startsWith("demo-");

  return `
    <div class="campaign-glass-card">
      <div class="campaign-glass-header">
        <div>
          <h3 class="campaign-glass-title">${escapeHtml(c.subject)}</h3>
          <p class="campaign-glass-meta">${dateStr} &mdash; ID: <code style="opacity:.5; font-size:0.75rem;">${c.id.split("-")[0]}…</code>${isDemo ? ' <span style="color:rgba(255,255,255,.25);font-size:.7rem;">(demo)</span>' : ''}</p>
        </div>
        <span class="status-badge status-complete">Complete</span>
      </div>

      <div class="metrics-row">
        <div class="metric-tile">
          <div class="val" style="color:#fff;">${c.stats.total.toLocaleString()}</div>
          <div class="lbl">Total</div>
        </div>
        <div class="metric-tile">
          <div class="val" style="color:var(--mc-green);">${c.stats.sent.toLocaleString()}</div>
          <div class="lbl">Delivered</div>
        </div>
        <div class="metric-tile">
          <div class="val" style="color:var(--mc-red);">${c.stats.failed.toLocaleString()}</div>
          <div class="lbl">Bounced</div>
        </div>
        <div class="metric-tile">
          <div class="val" style="color:#facc15;">${c.stats.opens.toLocaleString()}</div>
          <div class="lbl">Opened (${openRate}%)</div>
        </div>
        <div class="metric-tile">
          <div class="val" style="color:#06b6d4;">${c.stats.clicks.toLocaleString()}</div>
          <div class="lbl">Clicked (${clickRate}%)</div>
        </div>
        <div class="metric-tile">
          <div class="val" style="color:#a855f7;">${c.stats.registered.toLocaleString()}</div>
          <div class="lbl">Registered (${convRate}%)</div>
        </div>
      </div>
    </div>
  `;
}

async function fetchCampaigns() {
  const container = document.getElementById("campaignsContainer");
  let campaigns = [];

  try {
    const res = await fetch("/api/campaigns");
    if (res.ok) campaigns = await res.json();
  } catch (_) {}

  // Merge real data with dummy seed
  const allCampaigns = [...campaigns, ...DUMMY_CAMPAIGNS];

  renderSummaryBar(allCampaigns);

  if (allCampaigns.length === 0) {
    container.innerHTML = `<div class="no-campaigns-msg">No campaigns yet. Send one from the Studio!</div>`;
    return;
  }

  container.innerHTML = allCampaigns.map(renderCampaignCard).join("");
}

document.addEventListener("DOMContentLoaded", fetchCampaigns);
