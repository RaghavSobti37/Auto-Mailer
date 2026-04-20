// ────────────────────────────────────────
// DUMMY DATA (shown when real data is empty)
// ────────────────────────────────────────


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

let lastLogTimestamp = null;
let activeCidForLogs = null;

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

  // Global funnel distribution
  const globalFunnel = campaigns.reduce((acc, c) => {
    const f = c.stats.funnel || {
      "Bounced": c.stats.failed,
      "Delivered": Math.max(0, c.stats.sent - (c.stats.opens || 0)),
      "Opened": Math.max(0, (c.stats.opens || 0) - (c.stats.clicks || 0)),
      "Clicked": Math.max(0, (c.stats.clicks || 0) - (c.stats.registered || 0)),
      "Registered": c.stats.registered || 0
    };
    Object.keys(f).forEach(k => acc[k] = (acc[k] || 0) + f[k]);
    return acc;
  }, { "Bounced": 0, "Delivered": 0, "Opened": 0, "Clicked": 0, "Registered": 0 });

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
  
  setTimeout(() => initGlobalChart(globalFunnel), 50);
}

let globalChartInstance = null;
function initGlobalChart(funnel) {
    const ctx = document.getElementById("globalFunnelChart");
    if (!ctx) return;
    if (globalChartInstance) globalChartInstance.destroy();

    globalChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(funnel),
        datasets: [{
          data: Object.values(funnel),
          backgroundColor: [
            '#f87171', // Bounced
            'rgba(255,255,255,0.1)', // Delivered (Sent Only)
            '#facc15', // Opened
            '#06b6d4', // Clicked
            '#a855f7'  // Registered
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        plugins: { 
            legend: { 
                display: true, 
                position: 'bottom',
                labels: { color: 'rgba(255,255,255,0.5)', usePointStyle: true, font: { size: 10 } }
            } 
        },
        cutout: '70%',
        responsive: false,
        maintainAspectRatio: true
      }
    });
}

function renderCampaignCard(c) {
  const dateStr = new Date(c.createdAt + (c.createdAt.endsWith("Z") ? "" : "Z")).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
  const openRate  = pct(c.stats.opens, c.stats.total);
  const clickRate = pct(c.stats.clicks, c.stats.total);
  const convRate  = pct(c.stats.registered, c.stats.total);
  const isDemo    = c.id.startsWith("demo-");

  const statusText = c.status === "sending" ? `Sending (${c.stats.sent}/${c.stats.total})` : "Complete";
  const statusClass = c.status === "sending" ? "status-sending" : "status-complete";

  return `
    <div class="campaign-glass-card" id="card-${c.id}">
      <div class="campaign-glass-header">
        <div style="flex:1;">
          <h3 class="campaign-glass-title">${escapeHtml(c.subject)}</h3>
          <p class="campaign-glass-meta">${dateStr} &mdash; <code style="opacity:.6; font-size:0.75rem;">${c.id}</code>${isDemo ? ' <span style="color:rgba(255,255,255,.25);font-size:.7rem;">(demo)</span>' : ''}</p>
          ${c.currentRecipient ? `<p style="font-size:0.7rem; color:var(--mc-yellow); margin-top:4px;">→ Processing: ${escapeHtml(c.currentRecipient)}</p>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="/monitor/${c.id}" class="btn-small monitor-link-btn" title="Open Live Monitor">
             <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
             Live Monitor
          </a>
          ${!isDemo ? `<button class="delete-campaign-btn" onclick="deleteCampaign('${c.id}')" title="Delete Campaign">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>` : ''}
        </div>
      </div>

      <div class="campaign-card-layout">
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
            <div class="lbl">Bounced <button class="help-icon" onclick="showImapHelp()" title="IMAP Setup Help">?</button></div>
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
        
        <div class="chart-box">
           <canvas id="chart-${c.id}" width="200" height="200"></canvas>
           <div class="lbl" style="font-size:0.65rem;">Engagement Funnel</div>
        </div>
      </div>
    </div>
  `;
}

async function deleteCampaign(cid) {
  showConfirm(
    "Delete Campaign?",
    "Are you sure you want to delete this campaign? All tracking data will be permanently removed.",
    async () => {
      try {
        const res = await apiDelete(`/api/campaign/${cid}`);
        if (res.ok) {
          showToast("Campaign deleted successfully", "success");
          fetchCampaigns();
        } else {
          showToast("Failed to delete campaign", "error");
        }
      } catch (e) {
        showToast("Error deleting campaign: " + e.message, "error");
      }
    }
  );
}

function initCharts(campaigns) {
  campaigns.forEach(c => {
    const ctx = document.getElementById(`chart-${c.id}`);
    if (!ctx) return;
    
    // Funnel distribution logic (shared with backend logic)
    const funnel = c.stats.funnel || {
      "Bounced": c.stats.failed,
      "Delivered": Math.max(0, c.stats.sent - (c.stats.opens || 0)),
      "Opened": Math.max(0, (c.stats.opens || 0) - (c.stats.clicks || 0)),
      "Clicked": Math.max(0, (c.stats.clicks || 0) - (c.stats.registered || 0)),
      "Registered": c.stats.registered || 0
    };

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(funnel),
        datasets: [{
          data: Object.values(funnel),
          backgroundColor: [
            '#f87171', // Bounced
            'rgba(255,255,255,0.1)', // Delivered (Sent Only)
            '#facc15', // Opened
            '#06b6d4', // Clicked
            '#a855f7'  // Registered
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        cutout: '70%',
        responsive: false,
        maintainAspectRatio: true
      }
    });
  });
}

// ────────────────────────────────────────
// UNSUBSCRIBE MANAGEMENT
// ────────────────────────────────────────
async function showUnsubManager() {
  document.getElementById("unsubModal").classList.add("active");
  const container = document.getElementById("unsubListContainer");
  container.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.5;">Loading list…</div>`;
  
  try {
    const res = await apiGet("/api/unsubscribes");
    const data = await res.json();
    if (!data.length) {
      container.innerHTML = `<div style="text-align:center;padding:20px;opacity:0.3;">No unsubscribed emails yet.</div>`;
      return;
    }
    
    container.innerHTML = `
      <table class="mgmt-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Reason</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(u => `
            <tr>
              <td>${escapeHtml(u.email)}</td>
              <td style="opacity:0.6;font-size:0.8rem;">${escapeHtml(u.reason || '-')}</td>
              <td style="text-align:right;">
                <button class="btn-small btn-danger" onclick="removeUnsubscribe('${u.email}')">Re-enable</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    container.innerHTML = `<div style="color:var(--mc-red);">Failed to load list.</div>`;
  }
}

async function removeUnsubscribe(email) {
  showConfirm(
    "Re-enable Recipient?",
    `Re-enable ${email}? They will be able to receive emails again.`,
    async () => {
      try {
        const res = await apiDelete(`/api/unsubscribes/${encodeURIComponent(email)}`);
        if (res.ok) {
          showToast("Recipient re-enabled", "success");
          showUnsubManager();
        } else {
          showToast("Failed to remove", "error");
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    }
  );
}

function showImapHelp() {
  showToast("Opening IMAP setup guide...", "info");
  window.location.href = "/docs#imap-setup";
}

async function refreshDashboard() {
  const btn = document.getElementById("refreshBtn");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>⏳</span> Syncing & Scanning…`;
  
  try {
    // 1. Trigger Async Bounce Scan
    const scanRes = await apiPost("/api/scan-bounces");
    const scanData = await scanRes.json();
    
    // 2. Fetch Latest Campaigns
    await fetchCampaigns();
    
    // Resume auto-refresh if something is sending
    const anyActive = document.querySelector(".status-sending");
    if (anyActive) startAutoRefresh();
    
    if (scanRes.ok && scanData.processed > 0) {
      showToast(`Scan complete: Found ${scanData.processed} new bounces.`, "success");
    }
  } catch (e) {
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function fetchCampaigns() {
  const container = document.getElementById("campaignsContainer");
  let campaigns = [];

  try {
    const res = await apiGet("/api/campaigns");
    if (res.ok) campaigns = await res.json();
  } catch (_) {}

  // Removed dummy seed
  const allCampaigns = campaigns;

  renderSummaryBar(allCampaigns);

  if (allCampaigns.length === 0) {
    container.innerHTML = `<div class="no-campaigns-msg">No campaigns yet. Send one from the Studio!</div>`;
    return;
  }

  container.innerHTML = allCampaigns.map(renderCampaignCard).join("");
  
  // Paint charts after DOM update
  setTimeout(() => initCharts(allCampaigns), 50);

  // Update active campaign for logs
  const active = allCampaigns.find(c => c.status === "sending" || c.status === "running");
  if (active) activeCidForLogs = active.id;
  else if (allCampaigns.length > 0) activeCidForLogs = allCampaigns[0].id;
}

// ────────────────────────────────────────
// AUTO-REFRESH (Keep tracking in background)
// ────────────────────────────────────────
let autoRefreshInterval = null;
function startAutoRefresh() {
  if (autoRefreshInterval) return;
  autoRefreshInterval = setInterval(async () => {
    await fetchCampaigns();
    const anyActive = document.querySelector(".status-sending");
    if (!anyActive) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }, 2500);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ────────────────────────────────────────
// LIVE CONSOLE FEED
// ────────────────────────────────────────
async function pollLiveLogs() {
  if (!activeCidForLogs) return;

  try {
    const res = await apiGet(`/api/monitor-stats/${activeCidForLogs}`);
    if (!res.ok) return;
    const data = await res.json();
    
    const consoleBody = document.getElementById("liveConsole");
    if (!consoleBody) return;

    if (data.logs && data.logs.length > 0) {
      // Filter new logs
      const newLogs = lastLogTimestamp 
        ? data.logs.filter(l => new Date(l.ts) > new Date(lastLogTimestamp))
        : data.logs.slice(0, 5); // Show last 5 on first load

      if (newLogs.length > 0) {
        if (consoleBody.querySelector(".muted")) consoleBody.innerHTML = "";
        
        newLogs.reverse().forEach(log => {
          const line = document.createElement("div");
          line.className = "console-line";
          const timeStr = new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          line.innerHTML = `
            <span class="console-ts">[${timeStr}]</span>
            <span class="console-msg type-${log.type}">${escapeHtml(log.email)}: ${escapeHtml(log.message)}</span>
          `;
          consoleBody.prepend(line);
        });
        lastLogTimestamp = data.logs[0].ts;
      }
    }
  } catch (e) {
    console.error("Log Poll Error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchCampaigns();
  
  // Start log polling
  setInterval(pollLiveLogs, 2000);
  
  // Modal listeners
  const modal = document.getElementById("unsubModal");
  document.getElementById("manageUnsubsBtn").addEventListener("click", showUnsubManager);
  document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);
  document.getElementById("closeUnsubModal").addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });
});
