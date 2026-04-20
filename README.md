# AutoMailer 🚀

**AutoMailer** is a professional email marketing studio with dual-server architecture for scalability. It combines a modern glassmorphic interface with robust background processing, multi-account support, and automated bounce tracking.

---

## 🎯 What's New

### v2.0: Dual-Server Architecture
- **Web Server** (port 5000): UI, auth, profile management
- **API Server** (port 5001): Heavy operations (bounce scanning, dispatch, unsubscribe management)
- **Better Scalability**: Separate servers can run independently
- **No More UI Blocking**: Heavy operations don't freeze the interface
- **Multi-Account Support**: Store multiple email & SMTP profiles
- **Google OAuth**: Professional user authentication

---

## ✨ Core Features

### 🎨 Premium UI/UX
- **Modern Dashboard**: Unified analytics with real-time metrics
- **Profile Management**: Store and switch between multiple email accounts
- **Glassmorphic Design**: Sleek backdrop-blur interface for campaign composition
- **Live Dispatch Logs**: Full-width real-time activity monitor
- **Banner Cropper**: Integrated image editor with CID embedding
- **Smart Toast Notifications**: Non-intrusive feedback system

### 🚀 Multi-Account Support
- **Email Profiles**: Store multiple email addresses + app keys
- **SMTP Profiles**: Save and switch between SMTP servers
- **Default Selection**: Quick-select default profiles for campaigns
- **Per-Campaign Tracking**: Analytics tied to specific accounts

### 🛡️ Resilience & Tracking
- **IMAP Bounce Scanning**: Auto-detect bounced emails from inbox
- **HolySheet Integration**: Persist unsubscribes to Google Sheets
- **Unsubscribe Manager**: Manual control + CSV export
- **Campaign Analytics**: Comprehensive metrics per user + account
- **Activity Logging**: Audit trail of all user actions

### ⚙️ Performance
- **Dual-Server Architecture**: Web & API servers scale independently
- **Asynchronous Dispatch**: Multi-threaded email sending
- **No UI Blocking**: Heavy operations run on dedicated API server
- **Real-Time Logs**: Live dispatch activity monitoring
- **Production Ready**: Gunicorn/Waitress deployment ready

---

## 🏗️ System Architecture

### Dual-Server Model

```
Frontend (Browser)
    ↓
  ┌──────────────────────────────────────┐
  │          Web Server (5000)           │
  ├──────────────────────────────────────┤
  │ ✓ Serve UI (HTML/CSS/JS)             │
  │ ✓ Google OAuth                       │
  │ ✓ Profile Management API             │
  │ ✓ Dashboard/Analytics                │
  └─────────────┬────────────────────────┘
            │
       Light Operations
            ↓
      ┌────────────────┐
      │ Local Cache &  │
      │ Fast Queries   │
      └────────────────┘
                
      ┌────────────────────────────────── 
      │ Heavy Operations (API Server)
      ↓
  ┌──────────────────────────────────────┐
  │        API Server (5001)             │
  ├──────────────────────────────────────┤
  │ ✓ IMAP Bounce Scanning               │
  │ ✓ Campaign Dispatch                  │
  │ ✓ HolySheet Sync                     │
  │ ✓ Unsubscribe Management             │
  │ ✓ Campaign Logs                      │
  └──────────────────────────────────────┘
            ↓
      ┌────────────────┐
      │  SQLite DBs:   │
      │ - tracking.db  │
      │ - auth.db      │
      └────────────────┘
```

### Key Advantage: **No UI Blocking**
- Old: Campaign dispatch freezes the UI
- **New**: API server handles dispatch independently

---

## 🚀 Quick Start

### 1. Install
```bash
git clone <repo>
cd AutoMailer
pip install -r requirements.txt
```

### 2. Configure `.env`
```env
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
HOLYSHEET_API_KEY=your-holysheet-key
```

### 3. Start Dual Servers
```bash
python run_servers.py
```

Output:
```
🚀 Starting Auto-Mailer Dual-Server Architecture
📊 Web Server on http://localhost:5000
🔌 API Server on http://localhost:5001
✓ Both servers running!
```

### 4. Access
- **Studio**: http://localhost:5000
- **Analytics**: http://localhost:5000/dashboard

---

## 📊 Dashboard Features

### Overview Section
- **Summary Cards**: Campaign count, delivered, open rate, click rate, bounces, conversion
- **Engagement Funnel**: Visual breakdown of email journey
- **Campaign Grid**: Per-campaign performance metrics

### Live Dispatch Logs
- **Full-Width Section**: Real-time activity monitoring
- **Auto-Refresh**: Updates every 5 seconds
- **Timestamped Events**: Sent, bounced, opened, clicked actions
- **Color-Coded**: Error (red), success (green), info (blue)

### Action Buttons
| Button | Function | Purpose |
|--------|----------|---------|
| 🚫 Unsubscribes | Manage unsubscribe list | Manual control + HolySheet sync |
| 📬 Scan Bounces | IMAP inbox scanning | Auto-detect delivery failures |
| 🔄 Refresh | Update analytics | Reload all metrics |

---

## 🎯 Usage Guide

### Send a Campaign

1. **Upload Audience**
  - Go to Studio
  - Upload CSV with name & email columns
  - Select columns from dropdowns

2. **Select Profiles**
  - Choose **Email Profile** from dropdown
  - Choose **SMTP Server** from dropdown
  - (Or add new profiles via "+ Manage")

3. **Compose Message**
  - Select template or write markdown
  - Design CTA button with colors & alignment
  - Upload attachments (optional)

4. **Deploy**
  - Click "🚀 Deploy Campaign Sequence"
  - Monitor in Analytics dashboard
  - View live dispatch logs

### Manage Email Profiles

1. Go to **Studio** → "+ Manage" next to Sender Profile
2. **Add Email Profile**:
  - Email address
  - App password (not main password)
  - Display name (optional)
3. Click **Save** → Profile available in dropdown
4. Set as **Default** for quick selection

### Manage SMTP Profiles

1. Go to **Studio** → "+ Manage" next to SMTP Server
2. **Add SMTP Profile**:
  - Name (e.g., "Gmail", "Outlook", "Custom")
  - SMTP Host (e.g., smtp.gmail.com)
  - Port (e.g., 587)
3. Click **Save** → Profile available in dropdown
4. Set as **Default** for quick selection

### Scan for Bounces

1. Go to **Analytics** dashboard
2. Click **📬 Scan Bounces** button
3. Enter email & app password
4. (Optional) Change IMAP host
5. Click **Scan Now**
6. Bounces automatically added to unsubscribe list

### Manage Unsubscribes

1. Go to **Analytics** dashboard
2. Click **🚫 Unsubscribes** button
3. **Add** email addresses manually
4. **Remove** from list to re-enable
5. **Export** as CSV
6. **Sync HolySheet** to sync external list

---

## 🔧 API Server Endpoints

### Authentication
- `POST /api/auth/callback` - Google OAuth callback
- `GET /api/auth/user` - Get current user (requires token)
- `POST /api/auth/logout` - Logout

### Unsubscribe Management
- `GET /api/unsubscribes` - List all unsubscribed emails
- `POST /api/unsubscribes/add` - Add email to list
- `DELETE /api/unsubscribes/<email>` - Remove from list
- `POST /api/unsubscribes/export` - Export as CSV

### Bounce Scanning
- `POST /api/bounces/scan` - Scan IMAP for bounces
  ```json
  {
   "email": "your-email@gmail.com",
   "appKey": "your-app-password",
   "imapHost": "imap.gmail.com"
  }
  ```

### Campaign Monitoring
- `GET /api/campaign-logs/<id>` - Get activity logs
- `GET /api/campaign-stats/<id>` - Get campaign stats

### Health
- `GET /health` - API server health check

---

## 📁 Project Structure

```
AutoMailer/
├── run_servers.py          # ⭐ Start both servers
├── web_app.py              # Web server (port 5000)
├── api_server.py           # API server (port 5001)
│
├── auth_db.py              # User & profile database
├── tracking_db.py          # Campaign tracking database
│
├── templates/web/
│   ├── index.html          # Studio interface
│   ├── dashboard_v2.html   # Analytics dashboard
│   └── login.html          # Google OAuth login
│
├── static/web/
│   ├── app.js              # Studio logic
│   ├── dashboard_v2.js     # Analytics + API integration
│   ├── auth.js             # Authentication module
│   └── styles.css          # Glassmorphic design
│
├── data/
│   ├── tracking.db         # Campaign data
│   ├── auth.db             # User & profile data
│   └── ui_uploads/         # Uploaded CSV files
│
├── ARCHITECTURE.md         # Detailed technical docs
├── QUICK_START.md          # Quick reference guide
├── .env                    # Configuration (create this!)
└── requirements.txt        # Python dependencies
```

---

## ⚙️ Configuration

### Environment Variables
```env
# Sender email (fallback)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# HolySheet Integration
HOLYSHEET_API_KEY=your-api-key

# Server Ports
WEB_PORT=5000
API_SERVER_PORT=5001

# Deployment
VERCEL=0  # Set to 1 for Vercel
```

### Running Separate Servers

**Web Server only:**
```bash
python run_web.py
```

**API Server only:**
```bash
python api_server.py
```

**Both (Recommended):**
```bash
python run_servers.py
```

---

## 🌐 Deployment

### Local Development
```bash
python run_servers.py
# Visit http://localhost:5000
```

### Production (Gunicorn)
```bash
# Web server
gunicorn -w 4 -b 0.0.0.0:5000 web_app:app

# API server (separate terminal/container)
gunicorn -w 2 -b 0.0.0.0:5001 api_server:app
```

### Docker (Coming Soon)
```dockerfile
# Dockerfile for both services
```

### Vercel / Cloud Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud-specific instructions.

---

## 🔐 Security

- ✓ Google OAuth for authentication
- ✓ CORS-enabled API server
- ✓ Bearer token validation on all endpoints
- ✓ Password stored as app keys (not plaintext)
- ✓ User activity logging for auditing
- ⚠️ **In Production**: Use HTTPS, add rate limiting, implement token expiration

---

## 📊 Analytics & Metrics

- **Campaign Count**: Total campaigns created
- **Total Delivered**: Emails successfully sent (minus bounces)
- **Open Rate**: % of delivered emails that were opened
- **Click Rate**: % of delivered emails with clicks
- **Bounced**: Failed delivery attempts
- **Conversion Rate**: Custom metric based on campaign goals

### Per-Campaign Stats
- **Sent**: Total emails dispatched
- **Delivered**: Non-bounced sends
- **Failed**: Bounced emails
- **Opens**: Pixel-tracked opens
- **Clicks**: Link click tracking
- **Status**: Draft / Sending / Complete

---

## 🐛 Troubleshooting

### Ports Already in Use
```bash
# Change ports via .env
export WEB_PORT=8000
export API_SERVER_PORT=8001
python run_servers.py
```

### API Server Not Responding
```bash
# Check health endpoint
curl http://localhost:5001/health

# See detailed logs in terminal output
```

### Unsubscribe List Not Syncing
- Verify HolySheet API key in .env
- Check internet connection
- Verify API server is running

### Database Locked
```bash
# Kill any zombie processes
pkill -f "python.*server"

# Restart servers
python run_servers.py
```

---

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Deep dive into dual-server architecture
- [QUICK_START.md](QUICK_START.md) - Quick reference guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Cloud deployment instructions

---

## 🤝 Contributing

Contributions welcome! Areas for enhancement:
- [ ] Docker containers
- [ ] Load balancing across API servers
- [ ] WebSocket for real-time logs
- [ ] Campaign scheduling
- [ ] A/B testing support
- [ ] Advanced analytics

---

## 📜 License

MIT License - see LICENSE file for details

---

## 🎓 The Philosophy

AutoMailer was built because:
- **Email marketing shouldn't require learning enterprise tools**
- **Designers should create, not manage complexity**
- **Speed beats features**
- **Reliability means users forget it's running**

---

## 📞 Support

For issues or questions:
1. Check [QUICK_START.md](QUICK_START.md) for common solutions
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
3. Check terminal logs from both servers
4. Verify `.env` configuration

---

**Happy Emailing! 🚀**

Made with ❤️ by the AutoMailer team
