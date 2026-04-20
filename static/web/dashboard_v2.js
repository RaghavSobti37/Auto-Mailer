/**
 * Dashboard Analytics Module
 * Communicates with API Server for heavy operations
 */

// Configure API server endpoint
const API_SERVER_URL = `http://${window.location.hostname}:5001`;
const AUTH_TOKEN = getCookieValue('auth_token') || localStorage.getItem('auth_token');

function getCookieValue(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function getAuthHeader() {
  return {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
    color: white; border-radius: 8px; z-index: 9999; font-size: 0.9rem;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// UNSUBSCRIBE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

async function loadUnsubscribes() {
  try {
    const res = await fetch(`${API_SERVER_URL}/api/unsubscribes`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load unsubscribes');
    return await res.json();
  } catch (e) {
    console.error('Load unsubscribes failed:', e);
    showToast('Failed to load unsubscribe list', 'error');
    return [];
  }
}

async function addUnsubscribe(email, reason) {
  try {
    const res = await fetch(`${API_SERVER_URL}/api/unsubscribes/add`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, reason })
    });
    if (!res.ok) throw new Error('Failed to add unsubscribe');
    showToast('Added to unsubscribe list', 'success');
    refreshUnsubList();
  } catch (e) {
    console.error('Add unsubscribe failed:', e);
    showToast('Failed to add unsubscribe', 'error');
  }
}

async function removeUnsubscribe(email) {
  if (!confirm(`Remove ${email} from unsubscribe list?`)) return;
  try {
    const res = await fetch(`${API_SERVER_URL}/api/unsubscribes/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to remove unsubscribe');
    showToast('Removed from unsubscribe list', 'success');
    refreshUnsubList();
  } catch (e) {
    console.error('Remove unsubscribe failed:', e);
    showToast('Failed to remove unsubscribe', 'error');
  }
}

async function exportUnsubscribes() {
  try {
    const res = await fetch(`${API_SERVER_URL}/api/unsubscribes/export`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Export failed');
    const data = await res.json();
    
    // Trigger download
    const blob = new Blob([data.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unsubscribes.csv';
    a.click();
    showToast('Exported unsubscribe list', 'success');
  } catch (e) {
    console.error('Export failed:', e);
    showToast('Export failed', 'error');
  }
}

async function refreshUnsubList() {
  const unsubs = await loadUnsubscribes();
  const container = document.getElementById('unsubListContainer');
  
  if (unsubs.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No unsubscribes yet</p>';
    return;
  }
  
  container.innerHTML = unsubs.map(u => `
    <div style="padding:12px; background:rgba(15, 23, 42, 0.5); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
      <div style="flex:1;">
        <p style="margin:0; font-weight:500; color:#fff;">${escapeHtml(u.email)}</p>
        <p style="margin:4px 0 0; font-size:0.85rem; color:#94a3b8;">${escapeHtml(u.reason || 'Auto-detected bounce')}</p>
      </div>
      <button class="btn ghost mini-btn" onclick="removeUnsubscribe('${escapeHtml(u.email)}')" style="color:#ef4444;">
        Remove
      </button>
    </div>
  `).join('');
}

function openUnsubModal() {
  document.getElementById('unsubModal').style.display = 'flex';
  document.getElementById('unsubModal').style.alignItems = 'center';
  document.getElementById('unsubModal').style.justifyContent = 'center';
  document.getElementById('unsubModal').style.position = 'fixed';
  document.getElementById('unsubModal').style.top = '0';
  document.getElementById('unsubModal').style.left = '0';
  document.getElementById('unsubModal').style.width = '100%';
  document.getElementById('unsubModal').style.height = '100vh';
  document.getElementById('unsubModal').style.background = 'rgba(0,0,0,0.5)';
  document.getElementById('unsubModal').style.zIndex = '2000';
  refreshUnsubList();
}

function closeUnsubModal() {
  document.getElementById('unsubModal').style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNCE SCANNING
// ─────────────────────────────────────────────────────────────────────────────

function openBounceModal() {
  document.getElementById('bounceModal').style.display = 'flex';
  document.getElementById('bounceModal').style.alignItems = 'center';
  document.getElementById('bounceModal').style.justifyContent = 'center';
  document.getElementById('bounceModal').style.position = 'fixed';
  document.getElementById('bounceModal').style.top = '0';
  document.getElementById('bounceModal').style.left = '0';
  document.getElementById('bounceModal').style.width = '100%';
  document.getElementById('bounceModal').style.height = '100vh';
  document.getElementById('bounceModal').style.background = 'rgba(0,0,0,0.5)';
  document.getElementById('bounceModal').style.zIndex = '2000';
}

function closeBounceModal() {
  document.getElementById('bounceModal').style.display = 'none';
  document.getElementById('bounceResultsContainer').style.display = 'none';
}

async function scanBounces() {
  const email = document.getElementById('bounceEmailInput').value.trim();
  const appKey = document.getElementById('bounceAppKeyInput').value.trim();
  const imapHost = document.getElementById('bounceImapHostInput').value.trim();
  
  if (!email || !appKey) {
    showToast('Email and app password required', 'error');
    return;
  }
  
  document.getElementById('startBounceBtn').disabled = true;
  document.getElementById('startBounceBtn').textContent = '⏳ Scanning...';
  
  try {
    const res = await fetch(`${API_SERVER_URL}/api/bounces/scan`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, appKey, imapHost })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scan failed');
    
    // Show results
    const resultsContainer = document.getElementById('bounceResultsContainer');
    const resultsText = document.getElementById('bounceResultsText');
    const resultsList = document.getElementById('bounceListResults');
    
    resultsText.textContent = `Found ${data.processed} bounced emails from ${data.total_found} total bounce notifications`;
    
    if (data.bounces && data.bounces.length > 0) {
      resultsList.innerHTML = data.bounces.map(b => `
        <div style="padding:8px; background:rgba(239, 68, 68, 0.1); border-left:2px solid #ef4444; border-radius:4px; margin-bottom:4px;">
          <code style="color:#fca5a5; font-size:0.85rem;">${escapeHtml(b)}</code>
        </div>
      `).join('');
    } else {
      resultsList.innerHTML = '<p style="color:#94a3b8; font-style:italic;">No bounces detected</p>';
    }
    
    resultsContainer.style.display = 'block';
    showToast(`Found ${data.processed} bounces`, 'success');
    
    // Clear inputs and prepare for new scan
    setTimeout(() => {
      document.getElementById('bounceEmailInput').value = '';
      document.getElementById('bounceAppKeyInput').value = '';
    }, 1000);
    
  } catch (e) {
    console.error('Bounce scan failed:', e);
    showToast(`Scan error: ${e.message}`, 'error');
  } finally {
    document.getElementById('startBounceBtn').disabled = false;
    document.getElementById('startBounceBtn').textContent = '🔍 Scan Now';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

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
          'rgba(255,255,255,0.1)', // Delivered
          '#60a5fa', // Opened
          '#34d399', // Clicked
          '#a78bfa', // Registered
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#cbd5e1', font: { size: 12 } } }
      }
    }
  });
}

async function loadCampaigns() {
  try {
    const res = await fetch('/api/analytics/campaigns');
    if (!res.ok) throw new Error('Failed to load campaigns');
    return await res.json();
  } catch (e) {
    console.error('Load campaigns failed:', e);
    return [];
  }
}

function renderCampaigns(campaigns) {
  const container = document.getElementById('campaignsContainer');
  
  if (campaigns.length === 0) {
    container.innerHTML = '<div class="no-campaigns-msg">No campaigns yet</div>';
    return;
  }
  
  container.innerHTML = campaigns.map(c => `
    <div class="campaign-card glass-card">
      <h3>${escapeHtml(c.name)}</h3>
      <p style="font-size:0.9rem; color:#94a3b8; margin:4px 0 12px;">${escapeHtml(c.subject)}</p>
      <div class="campaign-metrics">
        <div class="metric"><span class="metric-value">${c.sent}</span><span class="metric-label">Sent</span></div>
        <div class="metric"><span class="metric-value">${c.delivered}</span><span class="metric-label">Delivered</span></div>
        <div class="metric"><span class="metric-value">${c.opens}</span><span class="metric-label">Opens</span></div>
        <div class="metric"><span class="metric-value">${c.clicks}</span><span class="metric-label">Clicks</span></div>
        <div class="metric"><span class="metric-value">${c.failed}</span><span class="metric-label">Bounced</span></div>
      </div>
      <div style="margin-top:12px; font-size:0.85rem; color:#94a3b8;">
        Status: <strong style="color:#cbd5e1;">${escapeHtml(c.status)}</strong>
      </div>
    </div>
  `).join('');
}

async function refreshDashboard() {
  try {
    renderSummaryBar([]);
    showToast('Refreshing analytics...', 'info');
    const campaigns = await loadCampaigns();
    renderSummaryBar(campaigns);
    renderCampaigns(campaigns);
    showToast('Analytics updated', 'success');
  } catch (e) {
    console.error('Refresh failed:', e);
    showToast('Refresh failed', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE LOGS
// ─────────────────────────────────────────────────────────────────────────────

function addLogEntry(msg, type = 'info') {
  const console = document.getElementById('liveConsole');
  const entry = document.createElement('div');
  entry.className = `console-msg ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.appendChild(entry);
  console.scrollTop = console.scrollHeight;
  
  // Keep only last 50 entries
  while (console.children.length > 50) {
    console.removeChild(console.firstChild);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Unsubscribe modal
  document.getElementById('manageUnsubsBtn')?.addEventListener('click', openUnsubModal);
  document.getElementById('closeUnsubModal')?.addEventListener('click', closeUnsubModal);
  document.getElementById('addUnsubBtn')?.addEventListener('click', () => {
    const email = document.getElementById('unsubEmailInput').value.trim();
    const reason = document.getElementById('unsubReasonInput').value.trim();
    if (email) {
      addUnsubscribe(email, reason);
      document.getElementById('unsubEmailInput').value = '';
      document.getElementById('unsubReasonInput').value = '';
    } else {
      showToast('Enter an email address', 'error');
    }
  });
  document.getElementById('exportUnsubBtn')?.addEventListener('click', exportUnsubscribes);
  
  // Bounce modal
  document.getElementById('scanBouncesBtn')?.addEventListener('click', openBounceModal);
  document.getElementById('closeBounceModal')?.addEventListener('click', closeBounceModal);
  document.getElementById('closeBounceModalBtn')?.addEventListener('click', closeBounceModal);
  document.getElementById('startBounceBtn')?.addEventListener('click', scanBounces);
  
  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', refreshDashboard);
  
  // Initial load
  refreshDashboard();
  
  // Auto-refresh every 10 seconds
  setInterval(() => {
    loadCampaigns().then(campaigns => {
      renderSummaryBar(campaigns);
      renderCampaigns(campaigns);
    }).catch(e => console.error('Auto-refresh failed:', e));
  }, 10000);
  
  addLogEntry('Dashboard initialized', 'success');
});

// Allow auth module to add log entries
if (typeof window.addLogEntry !== 'function') {
  window.addLogEntry = addLogEntry;
}
