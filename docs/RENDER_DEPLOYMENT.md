# Render Deployment Guide - Backend Only

## Architecture

```
┌──────────────────┐           ┌──────────────────┐
│    Vercel        │           │      Render      │
│  Frontend App    │──────────▶│   API Server     │
│ auto-mailer-     │  HTTPS    │  (api_server.py) │
│ blue.vercel.app  │  calls    │                  │
│                  │  /api/*   │  https://...     │
│                  │           │  .onrender.com   │
└──────────────────┘           └──────────────────┘
```

Frontend: Vercel → Backend: Render

## Step 1: Login to Render Dashboard

1. Go to **https://dashboard.render.com**
2. Sign in with your GitHub/Google/Render account

## Step 2: Connect Your Repository

1. Click **New +** → **Web Service**
2. Select **Connect a repository**
3. Search for your **Auto-Mailer** repo
4. Click **Connect**

## Step 3: Deploy API Server

### Configuration:
- **Name:** `automailer-api`
- **Environment:** Python 3.11
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python api_server.py`

### Environment Variables:
Click **Add Environment Variable** and add:

```
PYTHON_VERSION=3.11.0
FLASK_ENV=production
API_SERVER_PORT=$PORT
HOLYSHEET_API_KEY=Z2BhkUlsA5F-wq2GQ-g5fSYu-JgfHryt
```

### Instance Type:
- **Plan:** Free (or Starter for better performance)
- **Auto-deploy:** Yes

### Deploy:
Click **Create Web Service** and wait ~2 minutes for deployment.

You'll get a URL like: `https://automailer-api.onrender.com`

---

## Step 4: Update Vercel Environment

Go to your **Vercel project** settings and add environment variable:

```
REACT_APP_API_URL=https://automailer-api.onrender.com
```

Then redeploy your Vercel frontend to use the new backend URL.

---

## Step 5: Persistent Database (Optional but Recommended)

If you want to keep data between deployments, create a **Render Disk**:

### Create Disk:
1. Go to **automailer-api** service in Render
2. Click **Disks** tab
3. Click **Add Disk**
   - **Name:** `auto-mailer-data`
   - **Size:** 1GB
   - **Mount Path:** `/var/data`

### Update Environment Variables:

In **api_server.py**, use `/var/data` for database paths:

```python
if os.getenv("RENDER"):
    DB_PATH = Path("/var/data/tracking.db")
    AUTH_DB_PATH = Path("/var/data/auth.db")
    UNSUBSCRIBE_LIST_PATH = Path("/var/data/unsubscribes.csv")
else:
    # ... existing paths
```

---

## Step 6: Testing

### Test API Server:
```bash
curl https://automailer-api.onrender.com/health
```

Expected response: `{"status": "ok", "service": "api_server"}`

### Check Logs:
1. Go to Render dashboard
2. Click **automailer-api** service
3. Click **Logs** tab to see real-time output
4. Look for startup messages or errors

### Test from Vercel:
1. Go to https://auto-mailer-blue.vercel.app/
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Make an API call in the app
5. Check if requests go to `https://automailer-api.onrender.com`

---

## Environment Variables Summary

### Render (automailer-api):
- [ ] `PYTHON_VERSION` → `3.11.0`
- [ ] `FLASK_ENV` → `production`
- [ ] `HOLYSHEET_API_KEY` → Your API key
- [ ] Disk mounted at `/var/data` (optional but recommended)

### Vercel (Frontend):
- [ ] Set environment variable to point to Render backend
- [ ] Redeploy after updating

---

## Quick Summary

1. **Push code to GitHub**
2. **Deploy to Render:** New Web Service → `python api_server.py`
3. **Copy Render API URL** from dashboard
4. **Update Vercel env** with new backend URL
5. **Redeploy Vercel**
6. **Done!** Frontend (Vercel) ↔ Backend (Render)

---

## Troubleshooting

### API server won't start?
- Check Logs in Render dashboard
- Verify `requirements.txt` has all dependencies
- Check port: Should use `$PORT` env variable

### Frontend can't reach API?
- Verify Render backend URL in Vercel env variables
- Check CORS headers in `api_server.py`
- Check browser console for errors

### Database errors?
- Create Render Disk and update paths to `/var/data`
- Restart the service
- Check database file permissions

### 502/504 errors (gateway timeout)?
- Increase Render instance plan (Free tier has 15-minute idle timeout)
- Upgrade to **Standard** or **Pro** plan

---

## Useful Links

- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Your Frontend:** https://auto-mailer-blue.vercel.app/
