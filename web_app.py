#!/usr/bin/env python3
"""Web frontend for Auto-Mailer with upload, mapping, preview, and send flows."""

from __future__ import annotations

import csv
import mimetypes
import os
import re
import secrets
import smtplib
import threading
import urllib.parse
import json
import requests
import imaplib
import email
from email.message import Message
from dataclasses import dataclass
from datetime import datetime
from email import encoders
from email.mime.base import MIMEBase
from pathlib import Path
from typing import Any
from uuid import uuid4
from email.mime.image import MIMEImage
from urllib.parse import quote_plus
import logging

# Configure production logging
def setup_logging():
    is_vercel = os.getenv("VERCEL") == "1"
    handlers = [logging.StreamHandler()]
    
    if not is_vercel:
        try:
            # Ensure logs dir exists for local file logging
            RUNTIME_ROOT.joinpath("logs").mkdir(parents=True, exist_ok=True)
            handlers.append(logging.FileHandler(RUNTIME_ROOT / "logs" / "automailer.log"))
        except Exception:
            pass # Fallback to stream only if root is read-only
            
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=handlers
    )

logger = logging.getLogger(__name__)

import pandas as pd
import bleach
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, jsonify, render_template, request, make_response, redirect
from markdown import markdown

from tracking_db import TrackingDB

BASE_DIR = Path(__file__).resolve().parent

def runtime_data_root() -> Path:
    if os.getenv("VERCEL"):
        return Path("/tmp") / "auto_mailer"
    return BASE_DIR

RUNTIME_ROOT = runtime_data_root()
# On Vercel, keep paths flat in /tmp to avoid directory creation issues
if os.getenv("VERCEL"):
    UPLOAD_DIR = RUNTIME_ROOT / "ui_uploads"
    LOG_PATH = RUNTIME_ROOT / "web_email_log.csv"
    SENDER_PROFILE_PATH = RUNTIME_ROOT / "sender_profile.enc"
    SENDER_PROFILE_KEY_PATH = RUNTIME_ROOT / "sender_profile.key"
    DB_PATH = RUNTIME_ROOT / "tracking.db"
    UNSUBSCRIBE_LIST_PATH = RUNTIME_ROOT / "unsubscribes.csv"
else:
    UPLOAD_DIR = RUNTIME_ROOT / "data" / "ui_uploads"
    LOG_PATH = RUNTIME_ROOT / "logs" / "web_email_log.csv"
    SENDER_PROFILE_PATH = RUNTIME_ROOT / "params" / "sender_profile.enc"
    SENDER_PROFILE_KEY_PATH = RUNTIME_ROOT / "params" / "sender_profile.key"
    DB_PATH = RUNTIME_ROOT / "data" / "tracking.db"
    UNSUBSCRIBE_LIST_PATH = RUNTIME_ROOT / "data" / "unsubscribes.csv"


# Lazy-init directories
def ensure_runtime_dirs():
    for d in [UPLOAD_DIR, LOG_PATH.parent, SENDER_PROFILE_PATH.parent, DB_PATH.parent]:
        try:
            d.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            if not os.getenv("VERCEL"):
                print(f"Warning: Could not create directory {d}: {e}")

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}
VALID_EMAIL_TYPES = {"marketing", "plain"}
GMAIL_ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024
DATASET_ID_REGEX = re.compile(r"^[a-f0-9-]{36}$", re.IGNORECASE)
ALLOWED_HTML_TAGS = [
    "a", "abbr", "acronym", "b", "blockquote", "br", "code", "em", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "i", "li", "ol", "p", "pre", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]
ALLOWED_HTML_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
}

ACTIVE_CAMPAIGNS = {}
UNSUBSCRIBE_LIST_PATH = RUNTIME_ROOT / "data" / "unsubscribes.csv"
HOLYSHEET_API_KEY = "Z2BhkUlsA5F-wq2GQ-g5fSYu-JgfHryt"
HOLYSHEET_URL = f"https://holysheet.soneshjain.com/api/v1/{HOLYSHEET_API_KEY}/rows"

# Global tracking_db for background threads
tracking_db: TrackingDB | None = None


def fetch_external_unsubscribes() -> set[str]:
    """Fetch unsubscribed emails from HolySheet API."""
    try:
        res = requests.get(HOLYSHEET_URL, timeout=10)
        if res.ok:
            data = res.json().get("data", [])
            unsubs = set()
            for row in data:
                email = next((v for k, v in row.items() if "email" in k.lower()), None)
                if email:
                    unsubs.add(str(email).strip().lower())
            return unsubs
    except Exception as e:
        logger.error(f"Failed to fetch external unsubscribes: {e}")
    return set()

def append_external_unsubscribe(email: str, campaign_id: str, reason: str, name: str = ""):
    """Append unsubscription feedback to HolySheet as a raw array to avoid header duplication."""
    try:
        # Using array format: [email, name, campaign_id, reason, unsubscribed_at]
        # matching the user's sheet header order exactly.
        row_data = [
            email,
            name,
            campaign_id,
            reason,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ]
        requests.post(HOLYSHEET_URL, json={"rows": [row_data]}, timeout=10)
    except Exception as e:
        logger.error(f"Failed to append external unsubscribe: {e}")


def sync_unsubscribe_csv(db: TrackingDB):
    """Ensure the universal unsubscribe CSV is up to date."""
    emails = db.get_all_unsubscribes()
    UNSUBSCRIBE_LIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(UNSUBSCRIBE_LIST_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["email", "unsubscribed_at"])
        # Note: get_all_unsubscribes currently only returns emails, 
        # but the user wanted a "universal unsubscribe data sheet".
        # I'll update it to handle emails for now.
        for email in emails:
            writer.writerow([email, datetime.now().isoformat()])


@dataclass
class SenderProfile:
    email: str
    app_key: str
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    tracking_url: str = ""


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__, template_folder="templates", static_folder="static")
    @app.get("/api/debug-env")
    def debug_env():
        return jsonify({
            "VERCEL": os.getenv("VERCEL"),
            "RUNTIME_ROOT": str(RUNTIME_ROOT),
            "BASE_DIR": str(BASE_DIR),
            "DB_PATH": str(DB_PATH),
            "UPLOAD_DIR": str(UPLOAD_DIR),
            "cwd": os.getcwd(),
            "tmp_writable": os.access("/tmp", os.W_OK),
            "runtime_writable": os.access(str(RUNTIME_ROOT), os.W_OK) if RUNTIME_ROOT.exists() else "root_not_exists"
        })

    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE_BYTES
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(32))

    # Initialize Environment
    ensure_runtime_dirs()
    setup_logging()
    
    logger.info(f"Initializing TrackingDB at {DB_PATH}")
    # Initialize global tracking_db if not already
    global tracking_db
    if tracking_db is None:
        tracking_db = TrackingDB(DB_PATH)

    @app.get("/")
    def index() -> str:
        return render_template("web/index.html")

    @app.errorhandler(404)
    def not_found(e):
        return render_template("web/index.html")

    @app.errorhandler(413)
    def file_too_large(_: Any) -> Any:
        return error_response("File too large. Keep uploads and attachments within your configured request limit.", 413)

    @app.get("/api/sender-profile")
    def get_sender_profile() -> Any:
        profile = load_sender_profile()
        if not profile:
            return jsonify({"saved": False, "email": "", "smtpHost": "smtp.gmail.com", "smtpPort": 587, "trackingUrl": ""})
        return jsonify({
            "saved": True, 
            "email": profile.email, 
            "smtpHost": profile.smtp_host, 
            "smtpPort": profile.smtp_port,
            "trackingUrl": profile.tracking_url
        })

    @app.post("/api/upload")
    def upload_file() -> Any:
        incoming_file = request.files.get("file")
        if incoming_file is None or incoming_file.filename is None or not incoming_file.filename.strip():
            return error_response("Please choose a CSV or Excel file.", 400)

        ext = incoming_file.filename.rsplit(".", 1)[-1].lower() if "." in incoming_file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return error_response("Unsupported file type. Use CSV, XLSX, or XLS.", 400)

        dataset_id = str(uuid4())
        temp_file_path = UPLOAD_DIR / f"{dataset_id}.upload.{ext}"
        canonical_path = UPLOAD_DIR / f"{dataset_id}.csv"
        incoming_file.save(temp_file_path)

        try:
            df = read_dataframe(temp_file_path)
            df = normalize_dataframe(df)
        except Exception as exc:
            safe_unlink(temp_file_path)
            return error_response(f"Could not read file: {exc}", 400)

        if df.empty:
            safe_unlink(temp_file_path)
            return error_response("The uploaded file has no rows.", 400)

        try:
            df.to_csv(canonical_path, index=False, encoding="utf-8")
        finally:
            safe_unlink(temp_file_path)

        return jsonify(
            {
                "datasetId": dataset_id,
                "columns": df.columns.tolist(),
                "rows": len(df),
                "sample": sanitize_records(df.head(8).to_dict(orient="records")),
            }
        )

    @app.post("/api/preview")
    def preview_message() -> Any:
        payload = request.get_json(silent=True) or {}
        dataset_id = (payload.get("datasetId") or "").strip()
        name_column = (payload.get("nameColumn") or "").strip()
        email_column = (payload.get("emailColumn") or "").strip()
        message = payload.get("message") or ""
        email_type = normalize_email_type(payload.get("emailType") or "marketing")
        banner_data_url = payload.get("bannerDataUrl") or ""
        cta_settings = payload.get("ctaSettings") or {}

        if not dataset_id:
            return error_response("Upload a sheet first.", 400)

        df = load_dataset(dataset_id)
        if df is None:
            return error_response("Uploaded sheet expired or was not found.", 404)

        if name_column not in df.columns or email_column not in df.columns:
            return error_response("Please select valid name and email columns.", 400)

        row = df.iloc[0].fillna("").to_dict()
        # Derive firstname from name if possible
        name_val = str(row.get(name_column, "")).strip()
        row["firstname"] = name_val.split()[0] if name_val else ""
        
        # Construct banner into template slot if present
        banner_tag = ""
        if banner_data_url:
            banner_tag = f'<img src="{banner_data_url}" alt="Banner" style="width:100%; height:auto; display:block; border-bottom:1px solid #eee;">'
        
        preview_subject = payload.get("subject") or ""
        rendered_subject = render_tokens(preview_subject, row)
        rendered_message = render_tokens(message, row)
        
        rendered_fragment = render_rich_email_fragment(rendered_message)

        # Inject Master CTA AFTER cleaning
        if cta_settings.get("text") and cta_settings.get("url"):
            button_html = generate_bulletproof_button(cta_settings)
            if "{{CTA}}" in rendered_fragment:
                rendered_fragment = rendered_fragment.replace("{{CTA}}", button_html)
            else:
                rendered_fragment += "<br><br>" + button_html
        unsub_link = f"{request.host_url.rstrip('/')}/unsubscribe/preview/preview"

        return jsonify(
            {
                "subject": rendered_subject,
                "html": rendered_fragment,
                "emailHtml": build_email_html(rendered_fragment, email_type, unsub_link, banner_tag),
                "recipient": str(row.get(email_column, "")),
                "name": str(row.get(name_column, "")),
            }
        )

    @app.get("/dashboard")
    def dashboard() -> str:
        return render_template("web/dashboard.html")

    @app.get("/docs")
    def docs_page() -> str:
        return render_template("web/docs.html")

    @app.get("/api/campaigns")
    def get_campaigns() -> Any:
        return jsonify(tracking_db.get_all_campaigns())

    @app.get("/track/open/<campaign_id>/<tracking_id>.gif")
    def track_open(campaign_id: str, tracking_id: str):
        tracking_db.record_open(tracking_id)
        response = make_response(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
        response.headers['Content-Type'] = 'image/gif'
        return response

    @app.delete("/api/campaign/<campaign_id>")
    def delete_campaign(campaign_id: str):
        tracking_db.delete_campaign(campaign_id)
        return jsonify({"success": True})

    @app.get("/api/unsubscribes")
    def list_unsubscribes():
        return jsonify(tracking_db.get_unsubscribed_list())

    @app.delete("/api/unsubscribes/<path:email>")
    def remove_unsubscribe(email: str):
        tracking_db.remove_unsubscribe(email)
        return jsonify({"success": True})

    @app.get("/track/click/<campaign_id>/<tracking_id>")
    def track_click(campaign_id: str, tracking_id: str):
        url = request.args.get("url")
        if url:
            # A click implies an open
            tracking_db.record_open(tracking_id)
            tracking_db.record_click(tracking_id, url)
            resp = redirect(url)
            resp.set_cookie('am_tracker', tracking_id, max_age=60*60*24*30)
            return resp
        return "Invalid URL", 400

    @app.route("/unsubscribe/<campaign_id>/<tracking_id>", methods=["GET", "POST"])
    def unsubscribe_page(campaign_id: str, tracking_id: str):
        if request.method == "POST":
            payload = request.get_json(silent=True) or {}
            reason = payload.get("reason", "No reason provided")
            
            if tracking_id == "preview":
                # Mock a preview submission to HolySheet so the user can verify the sheet columns and integration
                append_external_unsubscribe("preview@example.com", "preview_campaign", reason, "Preview Tester")
                return jsonify({"success": True, "note": "Preview mode: Mock unsubscription recorded in HolySheet."})

            # Find recipient email and name from tracking ID
            with tracking_db._get_conn() as conn:
                cursor = conn.execute("SELECT recipient, recipient_name FROM sent_emails WHERE tracking_id = ?", (tracking_id,))
                row = cursor.fetchone()
                if row:
                    email, name = row[0], row[1] or ""
                    tracking_db.record_unsubscribe(email, campaign_id, tracking_id, reason)
                    sync_unsubscribe_csv(tracking_db)
                    
                    # Append to HolySheet for reference
                    append_external_unsubscribe(email, campaign_id, reason, name)
                    return jsonify({"success": True})
            return jsonify({"error": "Recipient not found"}), 404
        
        return render_template("web/unsubscribe.html")

    @app.get("/api/unsubscribes/export")
    def export_unsubscribes():
        sync_unsubscribe_csv(tracking_db)
        if not UNSUBSCRIBE_LIST_PATH.exists():
            return error_response("No unsubscribes yet.", 404)
        
        with open(UNSUBSCRIBE_LIST_PATH, "r") as f:
            content = f.read()
        
        response = make_response(content)
        response.headers["Content-Disposition"] = "attachment; filename=unsubscribes.csv"
        response.headers["Content-Type"] = "text/csv"
        return response

    @app.post("/api/scan-bounces")
    def scan_bounces():
        """Scans the configured sender's inbox for bounce notifications."""
        profile = load_sender_profile()
        if not profile:
            return error_response("Sender profile not found. Please save your identity first.", 400)
        
        # We assume IMAP host is same as SMTP but with imap. prefix if it's gmail
        imap_host = "imap.gmail.com" if "gmail" in profile.smtp_host else profile.smtp_host.replace("smtp", "imap")
        
        try:
            logger.info(f"Connecting to IMAP {imap_host}...")
            mail = imaplib.IMAP4_SSL(imap_host)
            mail.login(profile.email, profile.app_key)
            mail.select("inbox")
            
            # Search for common bounce notification subjects
            # Gmail uses: "Delivery Status Notification (Failure)"
            # Outlook uses: "Undeliverable:"
            search_query = '(OR SUBJECT "Delivery Status Notification" SUBJECT "Undeliverable")'
            _, data = mail.search(None, search_query)
            
            mail_ids = data[0].split()
            logger.info(f"Found {len(mail_ids)} potential bounce emails.")
            
            bounced_emails = []
            
            # Process last 50 emails to avoid huge overhead
            for m_id in mail_ids[-50:]:
                _, msg_data = mail.fetch(m_id, "(RFC822)")
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                # Heuristic 1: Look for X-Failed-Recipients header
                failed_recipient = msg.get("X-Failed-Recipients")
                if failed_recipient:
                    bounced_emails.append(failed_recipient.split(",") [0].strip().lower())
                    continue
                
                # Heuristic 2: Look for email in the body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode(errors='ignore')
                            break
                else:
                    body = msg.get_payload(decode=True).decode(errors='ignore')
                
                # Regex to find email addresses in the body of a bounce report
                # Often it's like "Final-Recipient: rfc822; user@example.com"
                match = re.search(r"Final-Recipient: rfc822;\s*([^\s<>]+@[^\s<>]+)", body, re.IGNORECASE)
                if match:
                    bounced_emails.append(match.group(1).lower().strip())
                else:
                    # Fallback regex for any email in the body
                    # (This might be noisy, but usually bounce reports contain the recipient email)
                    matches = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", body)
                    for e in matches:
                        # Skip own email
                        if e.lower().strip() != profile.email.lower().strip():
                            bounced_emails.append(e.lower().strip())
                            break
            
            mail.logout()
            
            # Deduplicate and update DB & HolySheet
            unique_bounces = list(set(bounced_emails))
            for email_addr in unique_bounces:
                # Mark in local DB for immediate skipping in currently running campaigns
                tracking_db.mark_bounce(email_addr)
                # Append to HolySheet for future campaigns (as a universal unsubscribe)
                append_external_unsubscribe(email_addr, "IMAP_SCAN", "Auto-Detected Bounce")
            
            return jsonify({
                "success": True, 
                "total_found": len(mail_ids),
                "processed": len(unique_bounces),
                "bounces": unique_bounces
            })
            
        except Exception as e:
            logger.error(f"IMAP Scan Failed: {e}")
            return error_response(f"IMAP Error: {str(e)}", 500)

    @app.get("/api/campaign-status/<campaign_id>")
    def get_campaign_status(campaign_id: str):
        stats = tracking_db.get_campaign_stats(campaign_id)
        active_info = ACTIVE_CAMPAIGNS.get(campaign_id, {})
        if active_info:
            stats.update(active_info)
        return jsonify(stats)

    @app.post("/api/send")
    def send_campaign() -> Any:
        payload = request.get_json(silent=True) if request.is_json else request.form
        dataset_id = (payload.get("datasetId") or "").strip()
        name_column = (payload.get("nameColumn") or "").strip()
        email_column = (payload.get("emailColumn") or "").strip()
        subject = (payload.get("subject") or "").strip()
        message = payload.get("message") or ""
        sender_email = (payload.get("senderEmail") or "").strip()
        app_key = (payload.get("appKey") or "").strip()
        email_type = normalize_email_type(payload.get("emailType") or "marketing")
        remember_sender = parse_bool(payload.get("rememberSender"))
        
        smtp_host = (payload.get("smtpHost") or "smtp.gmail.com").strip()
        smtp_port = int(payload.get("smtpPort") or 587)
        tracking_url_override = (payload.get("trackingUrl") or "").strip()
        
        cta_settings_raw = payload.get("ctaSettings")
        cta_settings = {}
        if cta_settings_raw:
            try:
                cta_settings = json.loads(cta_settings_raw) if isinstance(cta_settings_raw, str) else cta_settings_raw
            except: cta_settings = {}
        
        banner_file = request.files.get("bannerImage") if not request.is_json else None
        banner_payload = banner_file.read() if banner_file else b""
        
        attachments = request.files.getlist("attachments") if not request.is_json else []
        
        # Use provided tracking URL or default to current host
        host_url = tracking_url_override.rstrip('/') if tracking_url_override else request.host_url.rstrip('/')

        if not all([dataset_id, name_column, email_column, subject, message, sender_email]):
            return error_response("All fields are required before sending.", 400)

        if not app_key:
            stored_profile = load_sender_profile()
            if stored_profile and stored_profile.email.lower() == sender_email.lower():
                app_key = stored_profile.app_key

        if not app_key:
            return error_response("App key is required, or use a sender with saved credentials.", 400)

        df = load_dataset(dataset_id)
        if df is None:
            return error_response("Uploaded sheet expired or was not found.", 404)

        if name_column not in df.columns or email_column not in df.columns:
            return error_response("Name/email column selection is invalid.", 400)

        df = df.fillna("")
        valid_targets = df[df[email_column].astype(str).str.contains(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", regex=True)]
        if valid_targets.empty:
            return error_response("No valid recipient email addresses found in selected column.", 400)

        try:
            attachment_payloads = parse_attachments(attachments)
        except ValueError as exc:
            return error_response(str(exc), 400)

        if remember_sender:
            save_sender_profile(SenderProfile(
                email=sender_email, 
                app_key=app_key, 
                smtp_host=smtp_host, 
                smtp_port=smtp_port,
                tracking_url=tracking_url_override
            ))

        campaign_id = str(uuid4())
        tracking_db.create_campaign(campaign_id, subject)

        ACTIVE_CAMPAIGNS[campaign_id] = {
            "status": "sending",
            "total": len(valid_targets),
            "sent": 0,
            "failed": 0,
            "failedRows": []
        }

        def process_campaign(cid: str, data: pd.DataFrame, attach: list, smhost: str, smport: int, banner_bytes: bytes, cta: dict):
            logger.info(f"Starting campaign {cid} with {len(data)} rows.")
            sent_count = 0
            failed_count = 0
            failed_rows = []
            
            # Fetch external unsubs at the start of campaign
            logger.info("Fetching external unsubscribes from HolySheet...")
            external_unsubs = fetch_external_unsubscribes() if email_type == "marketing" else set()
            logger.info(f"Found {len(external_unsubs)} external unsubscribes.")
            
            try:
                logger.info(f"Connecting to SMTP {smhost}:{smport}...")
                smtp = smtplib.SMTP(smhost, smport, timeout=30)
                smtp.starttls()
                logger.info(f"Attempting SMTP login for {sender_email}...")
                smtp.login(sender_email, app_key)
                logger.info("SMTP Login Successful.")
            except Exception as exc:
                err_msg = f"SMTP Connection/Login Failed: {exc}"
                logger.error(err_msg)
                ACTIVE_CAMPAIGNS[cid]["status"] = err_msg
                return

            try:
                for idx, row in data.iterrows():
                    recipient = str(row[email_column]).strip()
                    logger.info(f"[{idx+1}/{len(data)}] Processing: {recipient}")
                    
                    recipient_name = str(row.get(name_column, "")).strip() or "there"
                    context = {k: str(v) for k, v in row.to_dict().items()}
                    # Derive firstname
                    context["firstname"] = recipient_name.split()[0] if recipient_name != "there" else "there"
                    
                    tracking_id = str(uuid4())
                    
                    # Check for unsubscription
                    is_unsub = tracking_db.is_unsubscribed(recipient)
                    if not is_unsub and email_type == "marketing":
                        if recipient.lower().strip() in external_unsubs:
                            is_unsub = True
                    
                    if is_unsub:
                        logger.info(f"Skipping {recipient} (Unsubscribed)")
                        tracking_db.record_sent_email(tracking_id, cid, recipient, status="skipped_unsubscribed")
                        sent_count += 1 # Count as processed
                        continue

                    tracking_db.record_sent_email(tracking_id, cid, recipient, recipient_name)

                    row_subject = render_tokens(subject, context)
                    row_body = render_tokens(message, context)
                    
                    tracking_context = {
                        "campaign_id": cid,
                        "tracking_id": tracking_id,
                        "host_url": host_url
                    }
                    
                    rendered_fragment = render_rich_email_fragment(row_body, tracking_context)
                    
                    # Inject Master CTA AFTER cleaning
                    if cta.get("text") and cta.get("url"):
                        button_html = generate_bulletproof_button(cta, tracking_id, cid, host_url)
                        if "{{CTA}}" in rendered_fragment:
                            rendered_fragment = rendered_fragment.replace("{{CTA}}", button_html)
                        else:
                            rendered_fragment += "<br><br>" + button_html
                    
                    banner_tag = ""
                    if banner_bytes:
                        banner_tag = '<img src="cid:custom_banner.png" alt="Banner" style="width:100%; height:auto; display:block; border-bottom:1px solid #eee;">'
                    
                    unsub_url = f"{host_url}/unsubscribe/{cid}/{tracking_id}"
                    html_body = build_email_html(rendered_fragment, email_type, unsub_url, banner_tag)
                    
                    if email_type == "marketing":
                        plain_text_indication = f"\n\nUnsubscribe: {unsub_url}"
                    else:
                        plain_text_indication = ""
                        
                    plain_text_body = rich_html_to_plain_text(rendered_fragment) + plain_text_indication

                    msg = MIMEMultipart("mixed")
                    msg["From"] = sender_email
                    msg["To"] = recipient
                    msg["Subject"] = row_subject

                    body_part = MIMEMultipart("alternative")
                    body_part.attach(MIMEText(plain_text_body, "plain", "utf-8"))
                    
                    related_part = MIMEMultipart("related")
                    # Attach HTML here AFTER banner_tag is included in construction
                    related_part.attach(MIMEText(html_body, "html", "utf-8"))
                    
                    if banner_bytes:
                        banner_img = MIMEImage(banner_bytes, _subtype="png")
                        banner_img.add_header('Content-ID', '<custom_banner.png>')
                        # No Content-Disposition: inline to avoid listing in attachment bar
                        related_part.attach(banner_img)
                        
                    body_part.attach(related_part)
                    msg.attach(body_part)

                    for attachment in attach:
                        msg.attach(build_attachment_part(attachment))

                    try:
                        smtp.sendmail(sender_email, recipient, msg.as_string())
                        sent_count += 1
                        logger.info(f"Email sent to {recipient}")
                        log_send_attempt(recipient, recipient_name, "SENT", "")
                    except (smtplib.SMTPRecipientsRefused, smtplib.SMTPDataError, smtplib.SMTPResponseException) as smtp_err:
                        failed_count += 1
                        err_str = str(smtp_err)
                        failed_rows.append({"email": recipient, "error": f"Bounced: {err_str}"})
                        tracking_db.update_status(tracking_id, "failed")
                        logger.warning(f"Bounce to {recipient}: {err_str}")
                        log_send_attempt(recipient, recipient_name, "BOUNCED", err_str)
                    except Exception as send_exc:
                        failed_count += 1
                        failed_rows.append({"email": recipient, "error": str(send_exc)})
                        tracking_db.update_status(tracking_id, "failed")
                        logger.error(f"Failed to send to {recipient}: {send_exc}")
                        log_send_attempt(recipient, recipient_name, "FAILED", str(send_exc))
                        
                    ACTIVE_CAMPAIGNS[cid].update({
                        "sent": sent_count,
                        "failed": failed_count,
                        "lastError": str(failed_rows[-1]["error"]) if failed_rows else None
                    })
                    if len(failed_rows) <= 10:
                        ACTIVE_CAMPAIGNS[cid]["failedRows"] = failed_rows
            
            except Exception as loop_exc:
                err_msg = f"Unexpected loop failure: {loop_exc}"
                logger.critical(err_msg)
                ACTIVE_CAMPAIGNS[cid]["status"] = f"CRASH: {loop_exc}"
            finally:
                try: smtp.quit()
                except: pass
                if ACTIVE_CAMPAIGNS[cid]["status"] == "sending":
                    ACTIVE_CAMPAIGNS[cid]["status"] = "complete"
                logger.info(f"Campaign {cid} finished. Status: {ACTIVE_CAMPAIGNS[cid]['status']}")
        threading.Thread(target=process_campaign, args=(campaign_id, valid_targets, attachment_payloads, smtp_host, smtp_port, banner_payload, cta_settings), daemon=True).start()

        return jsonify({"campaignId": campaign_id, "status": "started"})

    return app


def sanitize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    clean_records = []
    for record in records:
        clean_record = {str(key): str(value) for key, value in record.items()}
        clean_records.append(clean_record)
    return clean_records

def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed", case=False)]
    for col in df.columns:
        df[col] = df[col].astype(str).replace("nan", "", regex=False).str.strip()
    return df

def read_dataframe(file_path: Path) -> pd.DataFrame:
    if file_path.suffix.lower() == ".csv":
        try:
            return pd.read_csv(file_path, encoding="utf-8")
        except UnicodeDecodeError:
            return pd.read_csv(file_path, encoding="latin-1")
    return pd.read_excel(file_path)

def safe_unlink(file_path: Path) -> None:
    try:
        file_path.unlink(missing_ok=True)
    except TypeError:
        if file_path.exists():
            file_path.unlink()

def dataset_csv_path(dataset_id: str) -> Path:
    if not DATASET_ID_REGEX.match(dataset_id):
        raise ValueError("Invalid dataset id")
    return UPLOAD_DIR / f"{dataset_id}.csv"

def load_dataset(dataset_id: str) -> pd.DataFrame | None:
    try:
        path = dataset_csv_path(dataset_id)
    except ValueError:
        return None
    if not path.exists():
        return None
    return pd.read_csv(path, dtype=str).fillna("")

def render_tokens(value: str, context: dict[str, str]) -> str:
    def replace_token(match: re.Match[str]) -> str:
        token = match.group(1).strip()
        return context.get(token, "")
    return re.sub(r"\{\{\s*([^{}]+)\s*\}\}", replace_token, value)

def render_rich_email_fragment(message: str, tracking_context: dict|None = None) -> str:
    rendered_html = markdown(
        message,
        extensions=["extra", "nl2br", "sane_lists"],
        output_format="html5",
    )
    cleaned_html = bleach.clean(
        rendered_html,
        tags=ALLOWED_HTML_TAGS,
        attributes=ALLOWED_HTML_ATTRIBUTES,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
    cleaned_html = bleach.linkify(cleaned_html)
    
    if tracking_context:
        campaign_id = tracking_context.get("campaign_id")
        tracking_id = tracking_context.get("tracking_id")
        host_url = tracking_context.get("host_url", "")
        
        # Cache-busting timestamp
        from time import time
        ts = int(time())
        pixel_url = f"{host_url}/track/open/{campaign_id}/{tracking_id}.gif?t={ts}"
        pixel_tag = f'<img src="{pixel_url}" width="1" height="1" border="0" style="display:none !important;" />'
        
        # Inject pixel at the TOP of the fragment for better reliability
        cleaned_html = pixel_tag + cleaned_html
        
        def replace_link(match):
            href = match.group(1)
            if href.startswith("mailto:") or not (href.startswith("http://") or href.startswith("https://")):
                return match.group(0)
            encoded_url = urllib.parse.quote(href)
            new_href = f"{host_url}/track/click/{campaign_id}/{tracking_id}?url={encoded_url}"
            return match.group(0).replace(href, new_href)
            
        cleaned_html = re.sub(r'<a\s+[^>]*href=["\'](.*?)["\'][^>]*>', replace_link, cleaned_html, flags=re.IGNORECASE)
        
    return cleaned_html

def rich_html_to_plain_text(html_fragment: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html_fragment, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</h[1-6]>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</blockquote>", "\n\n", text, flags=re.IGNORECASE)
    text = bleach.clean(text, tags=[], strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def normalize_email_type(email_type: str) -> str:
    normalized = str(email_type).strip().lower()
    return normalized if normalized in VALID_EMAIL_TYPES else "marketing"

def build_email_html(fragment: str, email_type: str, unsubscribe_url: str = "#", banner_tag: str = "") -> str:
    if email_type == "plain":
        return wrap_plain_email_html(fragment, show_unsubscribe=False)
    return wrap_email_html(fragment, unsubscribe_url, banner_tag)

def wrap_plain_email_html(fragment: str, unsubscribe_url: str = "#", show_unsubscribe: bool = True) -> str:
    unsub_footer = ""
    if show_unsubscribe:
        unsub_footer = f"<div style='margin-top:20px; border-top:1px solid #eee; padding-top:10px; font-size:12px; color:#666;'><a href='{unsubscribe_url}'>Unsubscribe</a></div>"
        
    return (
        "<html><body style='margin:0; padding:20px; font-family:Arial, Helvetica, sans-serif; color:#1f2937; line-height:1.7;'>"
        f"{fragment}"
        f"{unsub_footer}"
        "</body></html>"
    )

def wrap_email_html(fragment: str, unsubscribe_url: str = "#", banner_tag: str = "") -> str:
    return (
        "<html><body style='margin:0; padding:24px; background:#f6f6f4;'>"
        "<div style='max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #000000; border-radius:8px; overflow:hidden; font-family:\"Arial\", Helvetica, sans-serif; color:#241c15; line-height:1.7;'>"
        f"{banner_tag}"
        "<div style='padding:32px;'>"
        f"{fragment}"
        "<div style='margin-top:40px; padding-top:20px; border-top:1px solid #eee; text-align:center; color:#999; font-size:12px;'>"
        "You are receiving this because you signed up for our updates.<br>"
        f"<a href='{unsubscribe_url}' style='color:#999; text-decoration:underline;'>Unsubscribe from this list</a>"
        "</div>"
        "</div>"
        "</div></body></html>"
    )

def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}

def parse_attachments(incoming_files: list[Any]) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    total_bytes = 0
    for incoming_file in incoming_files:
        filename = (incoming_file.filename or "").strip()
        if not filename:
            continue

        payload_bytes = incoming_file.read()
        if not payload_bytes:
            raise ValueError(f"Attachment '{filename}' is empty.")

        total_bytes += len(payload_bytes)
        if total_bytes > GMAIL_ATTACHMENT_LIMIT_BYTES:
            limit_mb = GMAIL_ATTACHMENT_LIMIT_BYTES / (1024 * 1024)
            raise ValueError(
                f"Total attachment size exceeds Gmail's limit of {limit_mb:.0f} MB per message."
            )

        mime_type, _ = mimetypes.guess_type(filename)
        maintype, subtype = (mime_type or "application/octet-stream").split("/", 1)
        parsed.append(
            {
                "filename": filename,
                "payload": payload_bytes,
                "maintype": maintype,
                "subtype": subtype,
            }
        )
    return parsed

def build_attachment_part(attachment: dict[str, Any]) -> MIMEBase:
    part = MIMEBase(attachment["maintype"], attachment["subtype"])
    part.set_payload(attachment["payload"])
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", "attachment", filename=attachment["filename"])
    return part

def log_send_attempt(recipient: str, name: str, status: str, error: str) -> None:
    file_exists = LOG_PATH.exists()
    with LOG_PATH.open("a", newline="", encoding="utf-8") as log_file:
        writer = csv.writer(log_file)
        if not file_exists:
            writer.writerow(["timestamp", "recipient", "name", "status", "error"])
        writer.writerow([datetime.now().isoformat(timespec="seconds"), recipient, name, status, error])

def ensure_fernet() -> Fernet:
    if not SENDER_PROFILE_KEY_PATH.exists():
        key = Fernet.generate_key()
        SENDER_PROFILE_KEY_PATH.write_bytes(key)
        if os.name == "nt":
            os.system(f'icacls "{SENDER_PROFILE_KEY_PATH}" /inheritance:r /grant:r "%USERNAME%":F >nul 2>&1')
    key_bytes = SENDER_PROFILE_KEY_PATH.read_bytes()
    return Fernet(key_bytes)

def save_sender_profile(profile: SenderProfile) -> None:
    token = ensure_fernet().encrypt(f"{profile.email}\n{profile.app_key}\n{profile.smtp_host}\n{profile.smtp_port}\n{profile.tracking_url}".encode("utf-8"))
    SENDER_PROFILE_PATH.write_bytes(token)

def load_sender_profile() -> SenderProfile | None:
    if not SENDER_PROFILE_PATH.exists():
        return None
    try:
        decrypted = ensure_fernet().decrypt(SENDER_PROFILE_PATH.read_bytes()).decode("utf-8")
        parts = decrypted.split("\n")
        email = parts[0].strip()
        app_key = parts[1].strip() if len(parts) > 1 else ""
        smtp_host = parts[2].strip() if len(parts) > 2 else "smtp.gmail.com"
        smtp_port = int(parts[3]) if len(parts) > 3 else 587
        tracking_url = parts[4].strip() if len(parts) > 4 else ""
        if not email:
            return None
        return SenderProfile(email=email, app_key=app_key, smtp_host=smtp_host, smtp_port=smtp_port, tracking_url=tracking_url)
    except Exception:
        return None

def error_response(message: str, status_code: int) -> Any:
    return jsonify({"error": message}), status_code

app = create_app()

try:
    if not os.getenv("VERCEL"):
        ensure_runtime_dirs()
        tracking_db = TrackingDB(DB_PATH)
except Exception:
    pass

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
def generate_bulletproof_button(settings: dict, tracking_id: str|None = None, campaign_id: str|None = None, host_url: str|None = None) -> str:
    text = settings.get("text", "Click Here")
    url = settings.get("url", "#")
    bg = settings.get("bg", "#ef4444")
    color = settings.get("color", "#ffffff")
    align = settings.get("align", "center")
    padding_val = int(settings.get("padding", 16))
    
    # Tracking logic if provided
    final_url = url
    if tracking_id and campaign_id and host_url:
        final_url = f"{host_url}/track/click/{campaign_id}/{tracking_id}?url={quote_plus(url)}"

    # Bulletproof HTML
    return f"""
    <div style="text-align:{align}; margin:20px 0;">
      <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{final_url}" style="height:{padding_val*2 + 20}px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="{bg}" fillcolor="{bg}">
          <w:anchorlock/>
          <center style="color:{color};font-family:sans-serif;font-size:16px;font-weight:bold;">{text}</center>
        </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
        <table cellspacing="0" cellpadding="0" border="0" align="{align}" style="margin:0 {'auto' if align=='center' else '0' if align=='left' else 'auto 0'};">
          <tr>
            <td bgcolor="{bg}" style="border-radius:6px;text-align:center;">
              <a href="{final_url}" style="color:{color};font-family:sans-serif;font-size:16px;font-weight:bold;text-decoration:none;display:inline-block;padding:{padding_val}px {padding_val*2}px;border-radius:6px;">
                {text}
              </a>
            </td>
          </tr>
        </table>
      <!--<![endif]-->
    </div>
    """
