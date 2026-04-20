#!/usr/bin/env python3
"""
Dedicated API Server for Auto-Mailer
Handles: campaign dispatch, bounce scanning, unsubscribe management
Runs on a separate port to avoid overloading the main web server
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import imaplib
import email
import re

from tracking_db import TrackingDB
from auth_db import AuthDB
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for calls from main web server

# API Key for frontend authentication
API_KEY = os.getenv("API_KEY", "auto-mailer-secret-key-2024")

BASE_DIR = Path(__file__).resolve().parent
RUNTIME_ROOT = Path("/tmp/auto_mailer") if os.getenv("VERCEL") else BASE_DIR

if os.getenv("VERCEL"):
    DB_PATH = RUNTIME_ROOT / "tracking.db"
    AUTH_DB_PATH = RUNTIME_ROOT / "auth.db"
    UNSUBSCRIBE_LIST_PATH = RUNTIME_ROOT / "unsubscribes.csv"
else:
    DB_PATH = RUNTIME_ROOT / "data" / "tracking.db"
    AUTH_DB_PATH = RUNTIME_ROOT / "data" / "auth.db"
    UNSUBSCRIBE_LIST_PATH = RUNTIME_ROOT / "data" / "unsubscribes.csv"

# Initialize databases
tracking_db = TrackingDB(DB_PATH)
auth_db = AuthDB(AUTH_DB_PATH)

# HolySheet configuration
HOLYSHEET_API_KEY = os.getenv("HOLYSHEET_API_KEY", "Z2BhkUlsA5F-wq2GQ-g5fSYu-JgfHryt")
HOLYSHEET_URL = f"https://holysheet.soneshjain.com/api/v1/{HOLYSHEET_API_KEY}/rows"

# ─────────────────────────────────────────────────────────────────────────────
# API KEY VALIDATION MIDDLEWARE
# ─────────────────────────────────────────────────────────────────────────────

@app.before_request
def validate_api_key():
    """Validate API key for all requests (skip /health)."""
    if request.path == "/health":
        return

    api_key = request.headers.get("X-API-Key", "")
    if api_key != API_KEY:
        return jsonify({"error": "Unauthorized: Invalid API key"}), 401

# ─────────────────────────────────────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────────────────────────────────────

def get_current_user():
    """Extract user from auth header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        return auth_db.get_user_by_session(token)
    return None

def require_auth(f):
    """Decorator to require authentication."""
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ─────────────────────────────────────────────────────────────────────────────
# UNSUBSCRIBE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

def fetch_external_unsubscribes() -> set[str]:
    """Fetch unsubscribed emails from HolySheet API."""
    try:
        res = requests.get(HOLYSHEET_URL, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list):
                return {str(row.get("email", "")).lower().strip() for row in data if row.get("email")}
    except Exception as e:
        logger.error(f"Failed to fetch external unsubscribes: {e}")
    return set()

def append_external_unsubscribe(email_addr: str, campaign_id: str, reason: str = "", name: str = "") -> bool:
    """Append unsubscribe entry to HolySheet."""
    try:
        payload = {
            "email": email_addr.lower().strip(),
            "campaign": campaign_id,
            "reason": reason or "No reason provided",
            "name": name or "",
            "timestamp": datetime.now().isoformat()
        }
        res = requests.post(HOLYSHEET_URL, json=payload, timeout=10)
        return res.status_code in (200, 201)
    except Exception as e:
        logger.error(f"Failed to append unsubscribe: {e}")
        return False

def sync_unsubscribe_csv() -> bool:
    """Sync unsubscribe list from tracking_db to CSV."""
    try:
        unsubs = tracking_db.get_unsubscribed_list()
        UNSUBSCRIBE_LIST_PATH.parent.mkdir(parents=True, exist_ok=True)
        with UNSUBSCRIBE_LIST_PATH.open("w", encoding="utf-8") as f:
            f.write("email,timestamp\n")
            for entry in unsubs:
                f.write(f"{entry.get('email', '')},{entry.get('timestamp', '')}\n")
        return True
    except Exception as e:
        logger.error(f"Failed to sync unsubscribe CSV: {e}")
        return False

@app.get("/api/unsubscribes")
@require_auth
def list_unsubscribes(user):
    """Get list of unsubscribed emails."""
    unsubs = tracking_db.get_unsubscribed_list()
    return jsonify(unsubs)

@app.post("/api/unsubscribes/add")
@require_auth
def add_unsubscribe(user):
    """Add email to unsubscribe list."""
    payload = request.get_json(silent=True) or {}
    email_addr = (payload.get("email") or "").strip().lower()
    reason = payload.get("reason", "Manual unsubscribe")
    
    if not email_addr:
        return jsonify({"error": "Email required"}), 400
    
    tracking_db.record_unsubscribe(email_addr, "manual", "manual", reason)
    sync_unsubscribe_csv()
    append_external_unsubscribe(email_addr, "manual", reason)
    
    auth_db.log_activity(user["user_id"], "unsubscribe_add", details=email_addr)
    return jsonify({"success": True})

@app.delete("/api/unsubscribes/<path:email>")
@require_auth
def remove_unsubscribe(user, email):
    """Remove email from unsubscribe list."""
    email = email.lower().strip()
    tracking_db.remove_unsubscribe(email)
    sync_unsubscribe_csv()
    
    auth_db.log_activity(user["user_id"], "unsubscribe_remove", details=email)
    return jsonify({"success": True})

@app.post("/api/unsubscribes/export")
@require_auth
def export_unsubscribes(user):
    """Export unsubscribe list."""
    sync_unsubscribe_csv()
    if not UNSUBSCRIBE_LIST_PATH.exists():
        return jsonify({"error": "No unsubscribes yet"}), 404
    
    with open(UNSUBSCRIBE_LIST_PATH, "r") as f:
        content = f.read()
    
    auth_db.log_activity(user["user_id"], "unsubscribe_export")
    return jsonify({
        "success": True,
        "filename": "unsubscribes.csv",
        "data": content
    })

# ─────────────────────────────────────────────────────────────────────────────
# BOUNCE SCANNING
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/bounces/scan")
@require_auth
def scan_bounces(user):
    """Scan IMAP inbox for bounce notifications."""
    from tracking_db import TrackingDB
    
    payload = request.get_json(silent=True) or {}
    email_address = (payload.get("email") or "").strip()
    app_key = (payload.get("appKey") or "").strip()
    imap_host = (payload.get("imapHost") or "imap.gmail.com").strip()
    
    if not email_address or not app_key:
        return jsonify({"error": "Email and app key required"}), 400
    
    try:
        logger.info(f"Connecting to IMAP {imap_host}...")
        mail = imaplib.IMAP4_SSL(imap_host)
        mail.login(email_address, app_key)
        mail.select("inbox")
        
        # Search for bounce notifications
        search_query = '(OR SUBJECT "Delivery Status Notification" SUBJECT "Undeliverable")'
        _, data = mail.search(None, search_query)
        
        mail_ids = data[0].split()
        logger.info(f"Found {len(mail_ids)} potential bounce emails.")
        
        bounced_emails = []
        
        # Process last 50 emails
        for m_id in mail_ids[-50:]:
            _, msg_data = mail.fetch(m_id, "(RFC822)")
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Heuristic 1: X-Failed-Recipients header
            failed_recipient = msg.get("X-Failed-Recipients")
            if failed_recipient:
                bounced_emails.append(failed_recipient.split(",")[0].strip().lower())
                continue
            
            # Heuristic 2: Parse body for Final-Recipient
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode(errors='ignore')
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors='ignore')
            
            match = re.search(r"Final-Recipient: rfc822;\s*([^\s<>]+@[^\s<>]+)", body, re.IGNORECASE)
            if match:
                bounced_emails.append(match.group(1).lower().strip())
            else:
                matches = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", body)
                for e in matches:
                    if e.lower().strip() != email_address.lower().strip():
                        bounced_emails.append(e.lower().strip())
                        break
        
        mail.logout()
        
        # Deduplicate and update DB
        unique_bounces = list(set(bounced_emails))
        for bounce_email in unique_bounces:
            tracking_db.mark_bounce(bounce_email)
            append_external_unsubscribe(bounce_email, "IMAP_SCAN", "Auto-Detected Bounce")
        
        auth_db.log_activity(user["user_id"], "bounce_scan", details=f"Found {len(unique_bounces)} bounces")
        
        return jsonify({
            "success": True,
            "total_found": len(mail_ids),
            "processed": len(unique_bounces),
            "bounces": unique_bounces
        })
        
    except Exception as e:
        logger.error(f"IMAP Scan Failed: {e}")
        return jsonify({"error": f"IMAP Error: {str(e)}"}), 500

# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN LOGS & MONITORING
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/campaign-logs/<campaign_id>")
@require_auth
def get_campaign_logs(user, campaign_id):
    """Get activity/dispatch logs for a campaign."""
    limit = request.args.get("limit", 100, type=int)
    logs = tracking_db.get_recent_activity(campaign_id, limit=limit)
    return jsonify(logs)

@app.get("/api/campaign-stats/<campaign_id>")
@require_auth
def get_campaign_stats(user, campaign_id):
    """Get stats for a campaign."""
    stats = tracking_db.get_campaign_stats(campaign_id)
    return jsonify(stats)

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK & CONFIG
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "api_server"}), 200

@app.get("/api/config")
def get_config():
    """Safe config endpoint - frontend calls this instead of hardcoding values."""
    return jsonify({
        "api_url": request.host_url.rstrip('/'),
        "service": "api_server",
        "version": "1.0"
    }), 200

# ─────────────────────────────────────────────────────────────────────────────
# ERROR HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {e}")
    return jsonify({"error": "Internal server error"}), 500

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("API_SERVER_PORT", 5001))
    logger.info(f"Starting API Server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
