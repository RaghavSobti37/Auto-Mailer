/**
 * Authentication and Profile Management Module
 */

const auth = {
  user: null,
  token: null,
  profiles: {
    email: [],
    smtp: []
  },

  async init() {
    try {
      const res = await fetch('/api/auth/user');
      if (res.ok) {
        this.user = await res.json();
        return true;
      }
    } catch (e) {
      console.log('Not authenticated');
    }
    return false;
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error('Logout error:', e);
    }
  },

  async loadProfiles() {
    if (!this.user) return false;
    try {
      const [emailRes, smtpRes] = await Promise.all([
        fetch('/api/profiles/email'),
        fetch('/api/profiles/smtp')
      ]);
      if (emailRes.ok) this.profiles.email = await emailRes.json();
      if (smtpRes.ok) this.profiles.smtp = await smtpRes.json();
      return true;
    } catch (e) {
      console.error('Failed to load profiles:', e);
      return false;
    }
  },

  async createEmailProfile(email, appKey, name) {
    try {
      const res = await fetch('/api/profiles/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appKey, name })
      });
      if (res.ok) {
        const profile = await res.json();
        this.profiles.email.push(profile);
        return profile;
      }
      throw new Error(await res.text());
    } catch (e) {
      console.error('Create email profile failed:', e);
      return null;
    }
  },

  async setDefaultEmailProfile(profileId) {
    try {
      const res = await fetch(`/api/profiles/email/${profileId}/default`, { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.error('Set default email profile failed:', e);
      return false;
    }
  },

  async deleteEmailProfile(profileId) {
    try {
      const res = await fetch(`/api/profiles/email/${profileId}`, { method: 'DELETE' });
      if (res.ok) {
        this.profiles.email = this.profiles.email.filter(p => p.profile_id !== profileId);
      }
      return res.ok;
    } catch (e) {
      console.error('Delete email profile failed:', e);
      return false;
    }
  },

  async createSmtpProfile(name, host, port) {
    try {
      const res = await fetch('/api/profiles/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, host, port })
      });
      if (res.ok) {
        const profile = await res.json();
        this.profiles.smtp.push(profile);
        return profile;
      }
      throw new Error(await res.text());
    } catch (e) {
      console.error('Create SMTP profile failed:', e);
      return null;
    }
  },

  async setDefaultSmtpProfile(smtpId) {
    try {
      const res = await fetch(`/api/profiles/smtp/${smtpId}/default`, { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.error('Set default SMTP profile failed:', e);
      return false;
    }
  },

  async deleteSmtpProfile(smtpId) {
    try {
      const res = await fetch(`/api/profiles/smtp/${smtpId}`, { method: 'DELETE' });
      if (res.ok) {
        this.profiles.smtp = this.profiles.smtp.filter(p => p.smtp_id !== smtpId);
      }
      return res.ok;
    } catch (e) {
      console.error('Delete SMTP profile failed:', e);
      return false;
    }
  },

  async loadAnalytics() {
    try {
      const res = await fetch('/api/analytics/campaigns');
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Load analytics failed:', e);
    }
    return [];
  },

  logActivity(action, campaignId = '') {
    fetch('/api/log-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, campaignId })
    }).catch(e => console.error('Log activity failed:', e));
  }
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await auth.init();
  if (!isAuthenticated) {
    // Redirect to login for protected pages
    if (window.location.pathname !== '/login' && !window.location.pathname.includes('/unsubscribe')) {
      window.location.href = '/login';
    }
  } else {
    await auth.loadProfiles();
    updateUserUI();
  }
});

function updateUserUI() {
  if (!auth.user) return;
  const userNameEl = document.getElementById('userName');
  const userPictureEl = document.getElementById('userPicture');
  if (userNameEl) userNameEl.textContent = auth.user.name || auth.user.email;
  if (userPictureEl && auth.user.picture_url) userPictureEl.src = auth.user.picture_url;
}
