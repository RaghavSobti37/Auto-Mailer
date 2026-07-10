const state = {
  view: 'overview',
  loading: true,
  health: null,
  system: null,
  folders: null,
  analytics: null,
  campaigns: [],
  templates: [],
  profiles: [],
  people: null,
  outcomes: [],
  syncStatus: null,
  selectedCampaign: null,
  selectedPerson: null,
};

const viewTitles = {
  overview: 'Overview',
  campaigns: 'Campaigns',
  templates: 'Templates',
  senders: 'Sender Governance',
  audience: 'Audience Data Hub',
  whatsapp: 'WhatsApp Outcomes',
  analytics: 'Analytics',
  settings: 'Settings',
};

const statusTone = {
  draft: 'neutral',
  queued: 'warning',
  sending: 'warning',
  completed: 'success',
  sent: 'success',
  failed: 'danger',
  stopped: 'danger',
  approved: 'success',
  pending_approval: 'warning',
  rejected: 'danger',
};

const root = document.getElementById('viewRoot');
const notice = document.getElementById('notice');
const viewTitle = document.getElementById('viewTitle');

function api(path, options = {}) {
  return fetch(path, options).then(async (res) => {
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) {
      const error = typeof data === 'string' ? data : data.error || data.reason || data.message;
      throw new Error(error || `${res.status} ${res.statusText}`);
    }
    return data;
  });
}

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function number(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0));
}

function date(value) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';
  return parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 1)) * 100);
}

function showNotice(message, tone = 'info') {
  notice.hidden = false;
  notice.className = `alert ${tone}`;
  notice.textContent = message;
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = '';
}

function setConnection(ok, label) {
  document.getElementById('connectionDot').className = `dot ${ok ? 'ok' : 'bad'}`;
  document.getElementById('connectionLabel').textContent = label;
}

async function refresh({ quiet = false } = {}) {
  if (!quiet) {
    state.loading = true;
    render();
  }

  try {
    const [health, system, folders, analytics, campaigns, templates, profiles, people, outcomes, syncStatus] = await Promise.all([
      api('/health'),
      api('/api/system/status').catch((error) => ({ error: error.message })),
      api('/api/data-hub/folders'),
      api('/api/mail/analytics/stats'),
      api('/api/mail/campaign-api'),
      api('/api/mail/templates'),
      api('/api/mail/profiles'),
      api('/api/data-hub/people?limit=12&page=1'),
      api('/api/data-hub/campaign-outcomes'),
      api('/api/data-hub/sync-status').catch(() => ({})),
    ]);

    Object.assign(state, {
      loading: false,
      health,
      system,
      folders,
      analytics,
      campaigns: Array.isArray(campaigns) ? campaigns : [],
      templates: Array.isArray(templates) ? templates : [],
      profiles: Array.isArray(profiles) ? profiles : [],
      people,
      outcomes: outcomes.campaigns || [],
      syncStatus,
    });
    setConnection(true, `${health.service || 'auto-mailer'} ${health.status || 'ok'}`);
    clearNotice();
  } catch (error) {
    state.loading = false;
    setConnection(false, 'Disconnected');
    showNotice(`Refresh failed: ${error.message}`, 'danger');
  }
  render();
}

function setView(view) {
  state.view = view;
  state.selectedCampaign = null;
  state.selectedPerson = null;
  document.querySelectorAll('#navTabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  render();
}

function metricCards() {
  const sent = state.analytics?.totalSent || 0;
  const opened = state.analytics?.totalOpened || 0;
  const clicked = state.analytics?.totalClicked || 0;
  return `
    <section class="metric-grid">
      ${metric('People', state.folders?.counts?.all || 0, 'Data Hub contacts')}
      ${metric('Campaigns', state.analytics?.totalCampaigns || state.campaigns.length, 'Email campaigns')}
      ${metric('Opened', opened, `${pct(opened, sent)}% open rate`)}
      ${metric('Clicked', clicked, `${pct(clicked, sent)}% click rate`)}
      ${metric('WA Active', state.folders?.counts?.whatsappActive || 0, 'WhatsApp engaged')}
      ${metric('Bounced', state.analytics?.totalBounced || 0, 'Email bounce count')}
    </section>
  `;
}

function metric(label, value, detail) {
  return `<article class="metric"><span>${html(label)}</span><strong>${number(value)}</strong><small>${html(detail)}</small></article>`;
}

function statusBadge(status) {
  const key = String(status || 'unknown').toLowerCase();
  return `<span class="badge ${statusTone[key] || 'neutral'}">${html(status || 'unknown')}</span>`;
}

function progressBar(label, value, total, tone = '') {
  const width = Math.min(100, pct(value, total));
  return `
    <div class="progress-row">
      <div><span>${html(label)}</span><strong>${number(value)}</strong></div>
      <div class="progress"><i class="${tone}" style="width:${width}%"></i></div>
    </div>
  `;
}

function renderOverview() {
  const recent = state.campaigns.slice(0, 5).map(campaignRow).join('');
  const pendingTemplates = state.templates.filter((template) => template.status === 'pending_approval').length;
  return `
    ${metricCards()}
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div><h2>Campaign Pulse</h2><p>Email performance across all campaigns.</p></div>
        </div>
        ${funnelChart({
          Sent: state.analytics?.totalSent || 0,
          Opened: state.analytics?.totalOpened || 0,
          Clicked: state.analytics?.totalClicked || 0,
          Bounced: state.analytics?.totalBounced || 0,
        })}
      </article>
      <article class="panel">
        <div class="panel-head">
          <div><h2>Operational Readiness</h2><p>Data Hub, template approvals, and sender coverage.</p></div>
        </div>
        <div class="readiness">
          ${readinessItem('Database', state.system?.database?.connected ? 'Connected' : 'Check connection', state.system?.database?.connected)}
          ${readinessItem('Docker / Local Hub', state.system?.docker?.skipped ? 'Hosted mode' : state.system?.docker?.ok ? 'Available' : 'Local only', Boolean(state.system?.docker?.ok))}
          ${readinessItem('Pending approvals', `${pendingTemplates} templates`, pendingTemplates === 0)}
          ${readinessItem('Sender profiles', `${state.profiles.length} configured`, state.profiles.length > 0)}
        </div>
      </article>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div><h2>Recent Campaigns</h2><p>Status, recipients, and engagement at a glance.</p></div>
        <button class="button secondary" data-action="view" data-view="campaigns">View all</button>
      </div>
      <div class="table">${campaignHeader()}${recent || empty('No campaigns found.')}</div>
    </section>
  `;
}

function readinessItem(label, value, ok) {
  return `<div class="readiness-item"><span class="dot ${ok ? 'ok' : 'warn'}"></span><div><strong>${html(label)}</strong><small>${html(value)}</small></div></div>`;
}

function funnelChart(items) {
  const max = Math.max(1, ...Object.values(items).map(Number));
  return `<div class="funnel">${Object.entries(items).map(([label, value], index) => progressBar(label, value, max, `tone-${index}`)).join('')}</div>`;
}

function campaignHeader() {
  return '<div class="table-row table-head"><span>Campaign</span><span>Status</span><span>Recipients</span><span>Open</span><span>Click</span></div>';
}

function campaignRow(campaign) {
  const sent = campaign.metrics?.totalSent ?? campaign.stats?.sent ?? 0;
  const opened = campaign.metrics?.opened ?? campaign.stats?.opened ?? 0;
  const clicked = campaign.metrics?.clicked ?? campaign.stats?.clicked ?? 0;
  return `
    <button class="table-row row-button" data-action="campaign" data-id="${html(campaign._id)}">
      <span><strong>${html(campaign.title || campaign.subject || campaign.campaignId || 'Untitled')}</strong><small>${html(campaign.subject || campaign.emailStreamSlug || campaign.campaignId || '')}</small></span>
      <span>${statusBadge(campaign.status)}</span>
      <span>${number(campaign.recipientCount || campaign.recipients?.length || 0)}</span>
      <span>${pct(opened, sent)}%</span>
      <span>${pct(clicked, sent)}%</span>
    </button>
  `;
}

function renderCampaigns() {
  const rows = state.campaigns.map(campaignRow).join('');
  const detail = state.selectedCampaign ? renderCampaignDetail(state.selectedCampaign) : '';
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Campaigns</h2><p>Governed sends with tracking, recipients, opens, clicks, and bounces.</p></div>
      </div>
      <div class="table">${campaignHeader()}${rows || empty('No campaigns found.')}</div>
    </section>
    ${detail}
  `;
}

function renderCampaignDetail(campaign) {
  const sent = campaign.metrics?.totalSent ?? campaign.stats?.sent ?? 0;
  return `
    <section class="panel detail-panel">
      <div class="panel-head">
        <div><h2>${html(campaign.title || 'Campaign detail')}</h2><p>${html(campaign.subject || campaign.campaignId || '')}</p></div>
        ${statusBadge(campaign.status)}
      </div>
      ${funnelChart({
        Sent: sent,
        Opened: campaign.metrics?.opened ?? campaign.stats?.opened ?? 0,
        Clicked: campaign.metrics?.clicked ?? campaign.stats?.clicked ?? 0,
        Bounced: campaign.metrics?.bounced ?? campaign.stats?.bounced ?? 0,
      })}
      <div class="detail-grid">
        <span>Stream <strong>${html(campaign.emailStreamSlug || 'default')}</strong></span>
        <span>Template <strong>${html(campaign.mailTemplateId || 'not linked')}</strong></span>
        <span>Sent at <strong>${html(date(campaign.sentAt || campaign.updatedAt))}</strong></span>
      </div>
    </section>
  `;
}

function renderTemplates() {
  const grouped = groupBy(state.templates, (template) => template.status || 'unknown');
  return `
    <section class="resource-grid">
      ${['approved', 'pending_approval', 'draft', 'rejected'].map((status) => `
        <article class="panel">
          <h2>${html(labelize(status))}</h2>
          <p>${number((grouped[status] || []).length)} templates</p>
          <div class="card-stack">
            ${(grouped[status] || []).slice(0, 6).map(templateCard).join('') || empty('No templates here.')}
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

function templateCard(template) {
  return `
    <div class="mini-card">
      <div><strong>${html(template.name || 'Untitled')}</strong><small>${html(template.subject || 'No subject')}</small></div>
      ${statusBadge(template.status)}
    </div>
  `;
}

function renderSenders() {
  return `
    <section class="resource-grid">
      ${state.profiles.map(profileCard).join('') || emptyPanel('No sender profiles configured yet.')}
    </section>
  `;
}

function profileCard(profile) {
  const usage = profile.providerUsage || {};
  const providers = ['gmail', 'brevo', 'sendgrid', 'mailjet'];
  const today = providers.reduce((sum, key) => sum + Number(usage[key]?.today || 0), 0);
  const limit = Number(profile.dailyLimit || providers.length * 500 || 1);
  return `
    <article class="panel sender-card">
      <div class="panel-head">
        <div><h2>${html(profile.name || profile.email)}</h2><p>${html(profile.email || 'No email')}</p></div>
        ${statusBadge(profile.rotationEnabled ? 'rotation' : 'single')}
      </div>
      ${progressBar('Daily quota used', today, limit, today > limit * 0.8 ? 'danger' : 'success')}
      <div class="provider-grid">
        ${providers.map((key) => `<span><strong>${html(key)}</strong><small>${number(usage[key]?.today || 0)} today / ${number(usage[key]?.total || 0)} total</small></span>`).join('')}
      </div>
    </article>
  `;
}

function renderAudience() {
  const people = state.people?.people || state.people?.items || state.people?.data || [];
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Audience</h2><p>${number(state.people?.total || state.folders?.counts?.all || 0)} contacts across email and WhatsApp.</p></div>
      </div>
      <div class="folder-pills">
        ${Object.entries(state.folders?.counts || {}).map(([key, value]) => `<span>${html(labelize(key))}<strong>${number(value)}</strong></span>`).join('')}
      </div>
      <div class="table audience-table">
        <div class="table-row table-head"><span>Contact</span><span>Channel</span><span>Campaign</span><span>Email</span><span>WhatsApp</span></div>
        ${people.map(personRow).join('') || empty('No contacts returned.')}
      </div>
    </section>
  `;
}

function personRow(person) {
  const wa = person.whatsapp || {};
  return `
    <button class="table-row row-button" data-action="person" data-id="${html(person._id)}">
      <span><strong>${html(person.name || person.leadName || 'Unknown')}</strong><small>${html(person.phone || '')}</small></span>
      <span>${html(person.channel || 'email')}</span>
      <span>${html(person.campaignId || wa.campaignName || 'unknown')}</span>
      <span>${person.opened ? 'Opened' : person.clicked ? 'Clicked' : person.bounced ? 'Bounced' : 'Quiet'}</span>
      <span>${html(wa.status || 'none')}</span>
    </button>
  `;
}

function renderWhatsapp() {
  return `
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div><h2>AiSensy CSV Upload</h2><p>Import one CSV per campaign segment. Status can come from the file name or a CSV column.</p></div>
        </div>
        <form id="uploadForm" class="form-grid">
          <input id="campaignName" name="campaignName" placeholder="Campaign name">
          <select id="status" name="status">
            <option value="">Infer status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="clicked">Clicked</option>
            <option value="replied">Replied</option>
            <option value="failed">Failed</option>
          </select>
          <input id="tags" name="tags" placeholder="Tags, comma separated">
          <input id="csvFile" name="file" type="file" accept=".csv,text/csv" required>
          <button class="button primary" type="submit">Import CSV</button>
        </form>
      </article>
      <article class="panel">
        <h2>Outcome Funnel</h2>
        ${whatsappFunnel(state.outcomes)}
      </article>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div><h2>WhatsApp Campaign Outcomes</h2><p>Activity score: sent 1, delivered 2, read 3, clicked 4, replied 5, failed 6.</p></div>
      </div>
      <div class="campaign-list">${state.outcomes.map(waCampaignRow).join('') || empty('No WhatsApp outcomes imported yet.')}</div>
    </section>
  `;
}

function whatsappFunnel(campaigns) {
  const totals = {};
  campaigns.forEach((campaign) => Object.entries(campaign.byStatus || {}).forEach(([key, count]) => {
    totals[key] = (totals[key] || 0) + count;
  }));
  const order = ['sent', 'delivered', 'read', 'clicked', 'replied', 'failed'];
  const max = Math.max(1, ...Object.values(totals));
  return `<div class="funnel">${order.map((key, index) => progressBar(labelize(key), totals[key] || 0, max, `tone-${index}`)).join('')}</div>`;
}

function waCampaignRow(campaign) {
  const badges = Object.entries(campaign.byStatus || {})
    .map(([status, count]) => `<span class="badge neutral">${html(status)} ${number(count)}</span>`)
    .join('');
  return `
    <div class="campaign-card">
      <div><strong>${html(campaign.campaignName)}</strong><small>${number(campaign.total || 0)} rows · score ${campaign.activityScore || 0}</small></div>
      <div class="badges">${badges}</div>
    </div>
  `;
}

function renderAnalytics() {
  const campaignBars = state.campaigns.slice(0, 8).map((campaign) => {
    const sent = campaign.metrics?.totalSent ?? campaign.stats?.sent ?? 0;
    const opened = campaign.metrics?.opened ?? campaign.stats?.opened ?? 0;
    return progressBar(campaign.title || campaign.subject || campaign.campaignId || 'Campaign', opened, Math.max(1, sent), 'success');
  }).join('');
  return `
    ${metricCards()}
    <section class="two-col">
      <article class="panel">
        <h2>Email Funnel</h2>
        ${funnelChart({
          Sent: state.analytics?.totalSent || 0,
          Opened: state.analytics?.totalOpened || 0,
          Clicked: state.analytics?.totalClicked || 0,
          Bounced: state.analytics?.totalBounced || 0,
        })}
      </article>
      <article class="panel">
        <h2>Campaign Open Rate</h2>
        <div class="funnel">${campaignBars || empty('No campaign metrics yet.')}</div>
      </article>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="panel">
      <h2>System Settings</h2>
      <div class="settings-grid">
        <span>API service <strong>${html(state.health?.service || 'unknown')}</strong></span>
        <span>Database <strong>${html(state.system?.database?.name || 'unknown')}</strong></span>
        <span>Host <strong>${html(state.system?.database?.host || 'unknown')}</strong></span>
        <span>Last sync <strong>${html(date(state.syncStatus?.lastSyncedAt))}</strong></span>
      </div>
      <div class="button-row">
        <button class="button primary" data-action="sync">Sync Data Hub</button>
        <button class="button secondary" data-action="backup">Run Online Backup</button>
      </div>
      <p class="hint">On this laptop, boot starts Docker Desktop and syncs local MongoDB. On Render/Vercel, Docker is skipped and the configured MongoDB is synced.</p>
    </section>
  `;
}

function render() {
  viewTitle.textContent = viewTitles[state.view] || 'Overview';
  if (state.loading) {
    root.innerHTML = document.getElementById('loadingTemplate').innerHTML;
    return;
  }

  const views = {
    overview: renderOverview,
    campaigns: renderCampaigns,
    templates: renderTemplates,
    senders: renderSenders,
    audience: renderAudience,
    whatsapp: renderWhatsapp,
    analytics: renderAnalytics,
    settings: renderSettings,
  };
  root.innerHTML = (views[state.view] || renderOverview)();
}

function empty(message) {
  return `<div class="empty">${html(message)}</div>`;
}

function emptyPanel(message) {
  return `<article class="panel">${empty(message)}</article>`;
}

function labelize(value) {
  return String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

document.getElementById('navTabs').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-view]');
  if (button) setView(button.dataset.view);
});

document.getElementById('refreshButton').addEventListener('click', () => refresh());

document.getElementById('bootButton').addEventListener('click', async () => {
  showNotice('Starting local Docker when available and syncing the Data Hub...', 'info');
  try {
    const data = await api('/api/system/local-data/start-and-sync', { method: 'POST' });
    showNotice(data.docker?.skipped ? data.docker.message : 'Docker is up and Data Hub sync completed.', 'success');
    await refresh({ quiet: true });
  } catch (error) {
    showNotice(`Boot failed: ${error.message}`, 'danger');
  }
});

root.addEventListener('click', async (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;

  if (action.dataset.action === 'view') setView(action.dataset.view);
  if (action.dataset.action === 'campaign') {
    state.selectedCampaign = state.campaigns.find((campaign) => String(campaign._id) === action.dataset.id);
    render();
  }
  if (action.dataset.action === 'sync') {
    showNotice('Syncing Data Hub...', 'info');
    try {
      await api('/api/data-hub/reconcile', { method: 'POST' });
      showNotice('Data Hub sync complete.', 'success');
      await refresh({ quiet: true });
    } catch (error) {
      showNotice(`Sync failed: ${error.message}`, 'danger');
    }
  }
  if (action.dataset.action === 'backup') {
    showNotice('Running online backup...', 'info');
    try {
      const result = await api('/api/data-hub/backup/run', { method: 'POST' });
      showNotice(`Backup complete: ${Object.keys(result.copied || {}).length} collections copied.`, 'success');
    } catch (error) {
      showNotice(`Backup failed: ${error.message}`, 'danger');
    }
  }
});

root.addEventListener('submit', async (event) => {
  if (event.target.id !== 'uploadForm') return;
  event.preventDefault();
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  const body = new FormData();
  body.append('file', file);
  for (const key of ['campaignName', 'status', 'tags']) {
    const value = event.target.elements[key].value.trim();
    if (value) body.append(key, value);
  }
  showNotice('Importing AiSensy CSV...', 'info');
  try {
    const data = await api('/api/data-hub/campaign-outcomes/import', { method: 'POST', body });
    event.target.reset();
    showNotice(`Imported ${number(data.stats?.imported || 0)} rows for ${html(data.stats?.campaignName || 'campaign')}.`, 'success');
    await refresh({ quiet: true });
  } catch (error) {
    showNotice(`Import failed: ${error.message}`, 'danger');
  }
});

refresh();
