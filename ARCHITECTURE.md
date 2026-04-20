# Auto-Mailer: Dual-Server Architecture

## System Architecture

Auto-Mailer now uses a **dual-server architecture** to separate concerns and prevent frontend overload:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser / Frontend                      │
│              (HTML, CSS, JS - Dashboard, Studio)                │
└────────────┬──────────────────────────────┬─────────────────────┘
             │                              │
             │ (Light Requests)             │ (Heavy Requests)
             │ - UI rendering               │ - API operations
             │ - Profile management         │ - Campaign dispatch
             │ - Analytics dashboard        │ - Bounce scanning
             │                              │ - Unsubscribe mgmt
             ▼                              ▼
     ┌───────────────────┐        ┌──────────────────────┐
     │   Web Server      │        │    API Server        │
     │   (Port 5000)     │        │    (Port 5001)       │
     │                   │        │                      │
     │ ✓ Serve UI        │        │ ✓ Heavy Processing   │
     │ ✓ Auth endpoints  │        │ ✓ IMAP bounce scan   │
     │ ✓ Profile API     │        │ ✓ HolySheet sync     │
     │ ✓ Monitor routes  │        │ ✓ Unsubscribe mgmt   │
     │                   │        │ ✓ Campaign logs      │
     └─────────┬─────────┘        └──────────┬───────────┘
               │                            │
               │         Database           │
               │         (SQLite)           │
               │                            │
               └────────────┬───────────────┘
                            │
                    ┌───────▼────────┐
                    │  Data Files    │
                    │  - tracking.db │
                    │  - auth.db     │
                    │  - uploads/    │
                    └────────────────┘
```

## Features

### Web Server (port 5000)
- **UI Rendering**: Serves all HTML/CSS/JS pages
- **Authentication**: Google OAuth & session management
- **Profile Management**: Email & SMTP profile CRUD
- **Analytics Dashboard**: Campaign statistics & overview
- **Preview & Sending**: Campaign composition & dispatch
- **Lightweight**: Minimal database queries

### API Server (port 5001)
- **Bounce Scanning**: IMAP integration for bounce detection
- **Unsubscribe Management**: HolySheet synchronization
- **Campaign Logs**: Real-time activity monitoring
- **Heavy Processing**: Offloaded from main web server
- **Independent**: Can run on separate machine/container
- **RESTful**: JSON API for all operations

## Setup & Installation

### Prerequisites
```bash
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file with:

```env
# Email sender (for fallback)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# HolySheet Integration
HOLYSHEET_API_KEY=your-holysheet-api-key

# Ports (optional)
WEB_PORT=5000
API_SERVER_PORT=5001

# Vercel deployment
VERCEL=0  # Set to 1 for Vercel
```

## Running the Servers

### Option 1: Run Both Servers (Recommended for Development)
```bash
python run_servers.py
```

This script starts both servers concurrently:
- Web server on `http://localhost:5000`
- API server on `http://localhost:5001`
- Monitors both processes and exits on any crash

### Option 2: Run Separately

**Terminal 1 - Web Server:**
```bash
python run_web.py
```

**Terminal 2 - API Server:**
```bash
python api_server.py
```

### Option 3: Production Deployment

Use separate process managers (systemd, supervisor, or Docker):

**Web Server:**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 web_app:app
```

**API Server:**
```bash
gunicorn -w 2 -b 0.0.0.0:5001 api_server:app
```

## API Server Endpoints

### Authentication
- `POST /api/auth/callback` - Google OAuth callback
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout

### Unsubscribe Management
- `GET /api/unsubscribes` - List all unsubscribed emails
- `POST /api/unsubscribes/add` - Add email to unsubscribe list
- `DELETE /api/unsubscribes/<email>` - Remove from list
- `POST /api/unsubscribes/export` - Export as CSV

### Bounce Scanning
- `POST /api/bounces/scan` - Scan IMAP inbox for bounces
  ```json
  {
    "email": "your-email@gmail.com",
    "appKey": "your-app-password",
    "imapHost": "imap.gmail.com"
  }
  ```

### Campaign Analytics
- `GET /api/campaign-logs/<campaign_id>` - Get activity logs
- `GET /api/campaign-stats/<campaign_id>` - Get campaign stats

### Health
- `GET /health` - API server health check

## Frontend API Configuration

The frontend (web server) communicates with the API server. Configuration in `dashboard_v2.js`:

```javascript
const API_SERVER_URL = `http://${window.location.hostname}:5001`;
```

This can be customized via environment variable `API_SERVER_URL` if deploying across different machines.

## Database Architecture

### Users Table (auth.db)
- User profiles with Google OAuth
- Session tokens
- Login history

### Email Profiles Table (auth.db)
- User's email accounts + app keys
- Default profile selection
- Display names

### SMTP Profiles Table (auth.db)
- User's SMTP configurations
- Default profile selection
- Multiple server support

### Campaigns Table (tracking.db)
- Campaign metadata
- Associated user + profiles
- Analytics per campaign

### Activity Logs (auth.db)
- User actions (login, send, scan, etc.)
- Campaign events
- Audit trail

## Key Improvements

✅ **Load Distribution**: Heavy operations don't block UI server  
✅ **Scalability**: API server can be replicated  
✅ **Resilience**: If UI server crashes, API operations continue  
✅ **Flexibility**: Deploy API server on dedicated hardware  
✅ **Monitoring**: Separate process monitoring per server  
✅ **Performance**: Optimized database queries per server  

## Architecture Benefits

| Aspect | Old Single Server | New Dual Server |
|--------|------------------|-----------------|
| **Frontend Blocking** | Yes (bounce scans block UI) | No (API server handles it) |
| **Bounce Scanning** | Blocks email sending | Runs independently |
| **Campaign Dispatch** | Mixed with UI | Dedicated API server |
| **Scalability** | Limited | Each server can scale separately |
| **Deployment** | Single process | Multiple process management |
| **Resource Isolation** | None | Separate memory/CPU per server |

## Troubleshooting

### API Server Connection Issues
```bash
# Check if API server is running
curl http://localhost:5001/health
```

### Port Already in Use
```bash
# Change ports in .env
export API_SERVER_PORT=5002
python api_server.py

# Via command line
python api_server.py --port 5002
```

### CORS Issues
If frontend is on different domain, update API server:
```python
CORS(app, origins=["http://localhost:5000", "https://yourdomain.com"])
```

### Database Locking Issues
If you see "database is locked" errors:
- Ensure only one instance of each server is running
- Check for zombie processes: `ps aux | grep python`
- Restart both servers

## File Structure

```
Auto-Mailer/
├── run_servers.py          # ← Start both servers
├── web_app.py              # Web server (UI + light API)
├── api_server.py           # API server (heavy operations)
├── auth_db.py              # User & profile database
├── tracking_db.py          # Campaign tracking database
├── templates/web/
│   ├── index.html          # Studio interface
│   ├── dashboard_v2.html   # Analytics dashboard
│   ├── login.html          # Google OAuth login
│   └── ...
├── static/web/
│   ├── app.js              # Studio logic
│   ├── dashboard_v2.js     # Analytics + API calls
│   ├── auth.js             # Authentication module
│   └── ...
└── data/
    ├── tracking.db         # Campaign data
    ├── auth.db             # User & profile data
    └── ...
```

## Security Notes

1. **API Server Authentication**: All API endpoints require Bearer token
2. **CORS**: API server has CORS enabled (configure for production)
3. **HTTPS**: Use HTTPS in production (both servers)
4. **Token Expiration**: Consider implementing token expiration
5. **Rate Limiting**: Add rate limiting to API server in production
6. **Input Validation**: All inputs validated on both servers

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Configure `.env` with Google OAuth credentials
3. Run dual servers: `python run_servers.py`
4. Access at `http://localhost:5000`
5. Check API server health: `curl http://localhost:5001/health`

## Support

For issues or questions:
- Check logs from both server processes
- Verify connectivity: `curl http://localhost:5001/health`
- Ensure auth token is valid
- Check firewall/port settings
