const output = document.getElementById('output');

function write(data) {
  output.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function request(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.reason || res.statusText);
  return data;
}

async function refresh() {
  try {
    const [health, folders, analytics, outcomes] = await Promise.all([
      request('/health'),
      request('/api/data-hub/folders'),
      request('/api/data-hub/analytics'),
      request('/api/data-hub/campaign-outcomes'),
    ]);
    document.getElementById('health').textContent = health.status;
    document.getElementById('peopleCount').textContent = folders.counts?.all ?? 0;
    document.getElementById('campaignCount').textContent = analytics.totalCampaigns ?? 0;
    document.getElementById('waActive').textContent = folders.counts?.whatsappActive ?? 0;
    renderCampaigns(outcomes.campaigns || []);
  } catch (error) {
    write(`Refresh failed: ${error.message}`);
  }
}

function renderCampaigns(campaigns) {
  const root = document.getElementById('waCampaigns');
  if (!campaigns.length) {
    root.innerHTML = '<p>No WhatsApp outcomes imported yet.</p>';
    return;
  }
  root.innerHTML = campaigns.map((campaign) => {
    const badges = Object.entries(campaign.byStatus || {})
      .map(([status, count]) => `<span class="badge">${status} ${count}</span>`)
      .join('');
    return `
      <div class="campaign-row">
        <strong>${escapeHtml(campaign.campaignName)}</strong>
        <span>${campaign.total || 0} rows · score ${campaign.activityScore || 0}</span>
        <span class="badges">${badges}</span>
      </div>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

document.getElementById('bootButton').addEventListener('click', async () => {
  write('Starting Docker and syncing Data Hub...');
  try {
    const data = await request('/api/system/local-data/start-and-sync', { method: 'POST' });
    write(data);
    await refresh();
  } catch (error) {
    write(`Boot failed: ${error.message}`);
  }
});

document.getElementById('refreshButton').addEventListener('click', refresh);

document.getElementById('uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  const body = new FormData();
  body.append('file', file);
  for (const key of ['campaignName', 'status', 'tags']) {
    const value = form.elements[key].value.trim();
    if (value) body.append(key, value);
  }
  write('Importing AiSensy CSV...');
  try {
    const data = await request('/api/data-hub/campaign-outcomes/import', { method: 'POST', body });
    write(data);
    form.reset();
    await refresh();
  } catch (error) {
    write(`Import failed: ${error.message}`);
  }
});

refresh();
