# Vercel Deployment Guide - Frontend

## Setup Overview

Your frontend is now configured to call the Render backend with API key authentication.

```
Frontend (Vercel)              Backend (Render)
    ↓                              ↑
[config.js] ─ API_KEY ───────→ [api_server.py validates key]
  |                              |
  └─ BASE_URL ────────────────────┘
  https://auto-mailer-5e54.onrender.com
```

---

## API Configuration

### Current Setup (in `static/web/config.js`):

```javascript
const API_CONFIG = {
  BASE_URL: 'https://auto-mailer-5e54.onrender.com',
  API_KEY: 'auto-mailer-secret-key-2024',  // ← Change this!
  TIMEOUT: 10000,
};
```

---

## Steps to Deploy

### 1. Update Frontend Code

**Option A: Hardcode the URL (simpler, less secure)**
- Already done in `config.js`
- `BASE_URL` = https://auto-mailer-5e54.onrender.com
- `API_KEY` = `auto-mailer-secret-key-2024`

**Option B: Use Vercel Environment Variables (recommended)**

Go to Vercel > Project > Settings > Environment Variables

Add:
```
NEXT_PUBLIC_API_URL=https://auto-mailer-5e54.onrender.com
NEXT_PUBLIC_API_KEY=auto-mailer-secret-key-2024
```

Then update `config.js`:
```javascript
const API_CONFIG = {
  BASE_URL: window.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://auto-mailer-5e54.onrender.com',
  API_KEY: window.API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'auto-mailer-secret-key-2024',
};
```

### 2. Update Render Backend

Go to Render > automailer-api > Environment

Add/Update:
```
API_KEY=auto-mailer-secret-key-2024
```

**Make sure this matches the key in your frontend config!**

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add API configuration for Render backend"
git push
```

Vercel will auto-deploy. Check the deployment at: **https://auto-mailer-blue.vercel.app/**

### 4. Test the Connection

1. Open https://auto-mailer-blue.vercel.app/
2. Open DevTools (F12) → Network tab
3. Perform an action (upload, send, etc.)
4. Look for API calls going to `https://auto-mailer-5e54.onrender.com/api/*`
5. Verify response status is `200` (not `401`)

---

## Important: CORS Headers

Your Render backend already has CORS enabled in `api_server.py`:

```python
CORS(app)  # Enable CORS for calls from Vercel
```

This allows your Vercel frontend to call the Render backend.

---

## Security Considerations

⚠️ **Current Setup**:
- API Key is hardcoded in frontend (visible in browser)
- This is OK for a development/demo app
- NOT recommended for production with sensitive data

✅ **For Production**:
1. Use environment variables (see Option B above)
2. Implement user authentication via JWT
3. Validate API key server-side (done ✓)
4. Use HTTPS only (both Vercel and Render use HTTPS ✓)
5. Add rate limiting
6. Add request logging

---

## API Endpoints Now Available

All calls from frontend automatically route through Render:

```
GET  /api/unsubscribes          → Render
POST /api/unsubscribes/add      → Render
DELETE /api/unsubscribes/<email> → Render
POST /api/unsubscribes/export   → Render

POST /api/bounces/scan          → Render
GET  /api/campaign-logs/<id>    → Render
GET  /api/campaign-stats/<id>   → Render

GET  /health                    → Render (no auth required)
```

---

## Troubleshooting

### 401 Unauthorized in Console

**Problem**: API calls returning 401

**Solution**:
1. Check `API_KEY` in config.js matches Render env var
2. Check browser sends `X-API-Key` header (DevTools → Network → Headers)
3. Restart Render service

### 404 Not Found

**Problem**: API endpoint not found

**Solution**:
- These endpoints exist only in Render backend
- If web server (Flask) is called instead, endpoint won't exist
- Verify `BASE_URL` in config.js points to Render, not localhost

### CORS Error

**Problem**: "No Access-Control-Allow-Origin header"

**Solution**:
- CORS already enabled in api_server.py
- Verify Render service is running (check health: https://auto-mailer-5e54.onrender.com/health)

### Slow Requests / Timeouts

**Problem**: Requests take >10 seconds

**Solution**:
- Free Render instances go to sleep, takes ~30s to wake up
- Upgrade to Standard plan for better performance
- Or keep it warm with periodic pings

---

## Key Files Modified

- ✅ `static/web/config.js` - API configuration
- ✅ `static/web/auth.js` - Uses apiGet/apiPost helpers
- ✅ `static/web/app.js` - Uses apiGet/apiPost helpers
- ✅ `static/web/dashboard.js` - Uses apiGet/apiPost helpers
- ✅ `static/web/dashboard_v2.js` - Uses apiGet/apiPost helpers
- ✅ `templates/web/index.html` - Includes config.js
- ✅ `api_server.py` - Added API key validation

---

## Next Steps

1. **Commit and push** to GitHub
2. **Vercel auto-deploys** (check deployment)
3. **Test** the app at https://auto-mailer-blue.vercel.app/
4. **Monitor** Render logs if issues occur

All done! 🚀
