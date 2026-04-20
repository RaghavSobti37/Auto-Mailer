# Auto-Mailer Quick Start Guide

## 🚀 Getting Started (2 minutes)

### 1. Install Dependencies
```bash
cd Auto-Mailer
pip install -r requirements.txt
```

### 2. Setup Environment Variables
Create `.env` file:
```env
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
HOLYSHEET_API_KEY=your-holysheet-key
```

### 3. Start Both Servers
```bash
python run_servers.py
```

Output:
```
🚀 Starting Auto-Mailer Dual-Server Architecture
====================================================================
📊 Web Server  will run on http://localhost:5000
🔌 API Server will run on http://localhost:5001
====================================================================
✓ Web Server started (PID: 12345)
✓ API Server started (PID: 12346)
====================================================================
✅ Both servers are running!
```

### 4. Access Application
- **Studio**: http://localhost:5000
- **Analytics**: http://localhost:5000/dashboard
- **API Health Check**: http://localhost:5001/health

## 📊 Dashboard Features

### Overview Section
- **Campaign Cards**: Summary stats (sent, delivered, opens, clicks)
- **Summary Bar**: Aggregate metrics across all campaigns
- **Engagement Funnel**: Visual breakdown of email journey

### Live Dispatch Logs
- Full-width section at bottom
- Real-time activity updates
- Auto-refreshes every 5 seconds

### Action Buttons (Top Navigation)
| Button | Function | Server |
|--------|----------|--------|
| 🚫 Unsubscribes | Manage unsubscribe list (HolySheet) | API |
| 📬 Scan Bounces | Scan IMAP for bounced emails | API |
| 🔄 Refresh | Update analytics dashboard | Web |

## 🎯 Key Operations

### Send a Campaign
1. Go to **Studio** (http://localhost:5000)
2. Upload CSV with audience
3. Select **Email Profile** from dropdown (or add new)
4. Select **SMTP Server** from dropdown (optional)
5. Compose message with template
6. Click **Deploy Campaign Sequence**
7. Monitor in **Analytics** dashboard

### Manage Unsubscribes
1. Go to **Analytics** (http://localhost:5000/dashboard)
2. Click **🚫 Unsubscribes** button
3. Add/remove emails manually
4. Click **Sync HolySheet** to sync external list
5. Click **Export List** to download CSV

### Scan for Bounces
1. Go to **Analytics** dashboard
2. Click **📬 Scan Bounces** button
3. Enter your email address
4. Enter app password (not your main password)
5. (Optional) Change IMAP host if not Gmail
6. Click **Scan Now**
7. Results show detected bounces
8. Bounces automatically added to unsubscribe list

### Create Email Profile
1. Go to **Studio**
2. Click **+ Manage** next to "Sender Profile"
3. Click **+ Add Email Profile**
4. Enter email, app password, name
5. Click **Save**
6. Profile now available in dropdown

### Create SMTP Profile
1. Go to **Studio**
2. Click **+ Manage** next to "SMTP Server"
3. Click **+ Add SMTP Server**
4. Enter name (e.g., "Gmail", "Outlook"), host, port
5. Click **Save**
6. Profile now available in dropdown

## 🔧 Server Ports

| Service | Port | URL |
|---------|------|-----|
| Web Server (UI) | 5000 | http://localhost:5000 |
| API Server | 5001 | http://localhost:5001 |

To change ports, set environment variables before starting:
```bash
export WEB_PORT=8000
export API_SERVER_PORT=8001
python run_servers.py
```

## 📁 Important Files

```
Auto-Mailer/
├── run_servers.py            # Start both servers
├── web_app.py                # Web UI server
├── api_server.py             # API/backend server
├── .env                       # Configuration (create this!)
├── data/
│   ├── tracking.db           # Campaign data
│   ├── auth.db               # User & profile data
│   └── ui_uploads/           # Uploaded CSVs
├── templates/web/
│   ├── index.html            # Studio interface
│   └── dashboard_v2.html     # Analytics dashboard
└── static/web/
    ├── app.js                # Studio logic
    └── dashboard_v2.js       # Analytics logic
```

## 🔐 Authentication

### First Time Login
1. Visit http://localhost:5000
2. Click **Play** button (top right) - Trigger Google OAuth
3. Sign in with your Google account
4. You're authenticated!

### Session Token
- Stored in browser cookies as `auth_token`
- Valid for 30 days
- Used for all API requests
- Cleared on logout

## 📊 Analytics Dashboard Layout

```
┌─ Navbar with Auth & Buttons ────────────────────────────┐
│  [Home] [Analytics] [Docs]  [🚫 Unsub] [📬 Bounces] [🔄]│
└────────────────────────────────────────────────────────┘

┌─ Header ──────────────────────────────────────────────────┐
│ Analytics Matrix                                           │
│ Campaign Dashboard                                         │
└────────────────────────────────────────────────────────────┘

┌─ Summary Cards (6 metrics) ───────────────────────────────┐
│ [Campaigns] [Delivered] [Open Rate] [Click Rate] [Bounced]│
│ [Conversion Rate]                                          │
└────────────────────────────────────────────────────────────┘

┌─ Global Engagement Chart ────────────────────────────────┐
│ Funnel visualization (Bounced → Delivered → Opened →     │
│ Clicked → Registered)                                     │
└────────────────────────────────────────────────────────────┘

┌─ Campaign Cards (Grid) ──────────────────────────────────┐
│ [Campaign 1] [Campaign 2] [Campaign 3]                   │
│ [Campaign 4] [Campaign 5] [Campaign 6]                   │
└────────────────────────────────────────────────────────────┘

┌─ LIVE DISPATCH LOGS (Full Width, Below) ────────────────┐
│ [Live indicator]  LIVE DISPATCH LOGS                     │
│                                                            │
│ [timestamp] Campaign started...                          │
│ [timestamp] Email sent to: user@example.com              │
│ [timestamp] Bounce detected: other@example.com           │
│                                                            │
│ └─ Auto-refreshes every 5 seconds ──────────────────────┘
└────────────────────────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Servers won't start
```bash
# Check port availability
netstat -an | grep 5000
netstat -an | grep 5001
```

### API Server not responding
```bash
# Check health
curl http://localhost:5001/health

# Check logs for errors
# (See terminal output from run_servers.py)
```

### Profile dropdowns not populating
- Make sure you're logged in (check browser cookies)
- Create a profile first (Studio → + Manage)
- Refresh page (Ctrl+F5)

### Unsubscribe list not syncing
- Check HolySheet API key in .env
- Verify internet connection
- Check API server logs

## 💾 Data Persistence

All data is stored in SQLite databases:
- **auth.db**: Users, profiles, activity logs
- **tracking.db**: Campaign data, sends, opens, clicks

These are automatically created in `data/` folder.

## 📈 Next: Deployment

For production deployment, see [ARCHITECTURE.md](ARCHITECTURE.md) for:
- Running on separate machines
- HTTPS configuration
- Load balancing
- Docker deployment

---

**For detailed technical information, see [ARCHITECTURE.md](ARCHITECTURE.md)**
