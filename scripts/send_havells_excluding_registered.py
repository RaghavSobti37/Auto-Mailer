#!/usr/bin/env python3
"""Send Havells mYOUsic campaign while excluding already registered contacts.

Behavior:
- Reads master contacts from data/master_db/master_db_final.csv
- Reads already-registered contacts from data/search/auto - auto.csv
- Excludes master rows that match registered records by normalized email OR phone
- Sends email in BCC batches (default: 50)
- Defaults to TEST mode and sends only to configured test emails
- Writes export and send logs for auditability
- Loads HTML and text templates from standalone files for easy preview/editing
"""

import argparse
import csv
import math
import os
import re
import smtplib
import sys
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Tuple

import pandas as pd
from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MASTER_CSV = os.path.join(BASE_DIR, "data", "master_db", "master_db_final.csv")
DEFAULT_REGISTERED_CSV = os.path.join(BASE_DIR, "data", "search", "auto - auto.csv")
DEFAULT_ELIGIBLE_EXPORT = os.path.join(BASE_DIR, "data", "exports", "havells_eligible_contacts.csv")
DEFAULT_EXCLUSION_REPORT = os.path.join(BASE_DIR, "data", "exports", "havells_registered_exclusion_report.csv")
DEFAULT_LOG_FILE = os.path.join(BASE_DIR, "logs", "havells_batch_send_log.csv")
DEFAULT_HTML_TEMPLATE = os.path.join(
    BASE_DIR, "assets", "email_templates", "havells_indore_audition_template.html"
)
DEFAULT_TEXT_TEMPLATE = os.path.join(
    BASE_DIR, "assets", "email_templates", "havells_indore_audition_template.txt"
)

DEFAULT_TEST_EMAILS = [
    "raghavsobti37@gmail.com",
    "harshika@theshakticollective.in",
    "aarush@theshakticollective.in",
    "aryaman@theshakticollective.in",
    "dmehta.work@gmail.com",
    "rohith@theshakticollective.in",
]

DEFAULT_SUBJECT = "Havells mYOUsic | Help Discover Emerging Music Talent"
DEFAULT_EVENT_DATETIME = "5th April 2026 at 8:00 AM"
DEFAULT_VENUE = "Sage University, Kailod Kartal, Indore-Dewas Bypass Road, Indore, Madhya Pradesh 452020"
DEFAULT_MAPS_URL = "https://maps.google.com/?q=Sage+University+Indore"
DEFAULT_HELPDESK_1 = "+91 9667509384"
DEFAULT_HELPDESK_2 = "+91 7230993707"
DEFAULT_NAME = "Artist"
DEFAULT_ENTRY_ID = "HMY-INDORE-2026"
DEFAULT_QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HMY-INDORE-2026"

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send Havells campaign excluding already-registered contacts."
    )
    parser.add_argument("--master-csv", default=DEFAULT_MASTER_CSV, help="Path to master_db_final.csv")
    parser.add_argument(
        "--registered-csv",
        default=DEFAULT_REGISTERED_CSV,
        help="Path to already-registered CSV (auto - auto.csv)",
    )
    parser.add_argument("--mode", choices=["test", "prod"], default="test", help="test or prod")
    parser.add_argument("--batch-size", type=int, default=50, help="BCC recipients per batch")
    parser.add_argument(
        "--test-emails",
        default=",".join(DEFAULT_TEST_EMAILS),
        help="Comma-separated emails used in test mode",
    )
    parser.add_argument("--subject", default=DEFAULT_SUBJECT, help="Email subject")
    parser.add_argument("--html-template", default=DEFAULT_HTML_TEMPLATE, help="Path to HTML email template")
    parser.add_argument("--text-template", default=DEFAULT_TEXT_TEMPLATE, help="Path to text email template")
    parser.add_argument("--name", default=DEFAULT_NAME, help="Template token value for name")
    parser.add_argument("--entry-id", default=DEFAULT_ENTRY_ID, help="Template token value for entry ID")
    parser.add_argument("--qr-url", default=DEFAULT_QR_URL, help="Template token value for QR image URL")
    parser.add_argument(
        "--event-datetime",
        default=DEFAULT_EVENT_DATETIME,
        help="Template token value for event date/time",
    )
    parser.add_argument("--venue", default=DEFAULT_VENUE, help="Template token value for venue")
    parser.add_argument("--maps-url", default=DEFAULT_MAPS_URL, help="Template token value for maps URL")
    parser.add_argument("--helpdesk-1", default=DEFAULT_HELPDESK_1, help="Template token value for first helpdesk")
    parser.add_argument("--helpdesk-2", default=DEFAULT_HELPDESK_2, help="Template token value for second helpdesk")
    parser.add_argument("--delay-seconds", type=float, default=1.0, help="Delay between batches")
    parser.add_argument("--dry-run", action="store_true", help="Do not send, only prepare and print summary")
    parser.add_argument(
        "--eligible-export",
        default=DEFAULT_ELIGIBLE_EXPORT,
        help="CSV path for eligible production recipients",
    )
    parser.add_argument(
        "--exclusion-report",
        default=DEFAULT_EXCLUSION_REPORT,
        help="CSV path for exclusion analysis report",
    )
    parser.add_argument("--log-file", default=DEFAULT_LOG_FILE, help="CSV path for send logs")
    return parser.parse_args()


def ensure_parent_dir(file_path: str) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def normalize_email(value: str) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def normalize_phone(value: str) -> str:
    if value is None:
        return ""
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    if not digits:
        return ""
    # Keep last 10 digits for India-centric matching when available.
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def is_valid_email(value: str) -> bool:
    return bool(EMAIL_REGEX.match(value or ""))


def dedupe_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    output = []
    for item in items:
        key = item.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(item.strip())
    return output


def read_text_file(file_path: str) -> str:
        if not os.path.exists(file_path):
                raise FileNotFoundError(f"Template file not found: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
                return f.read()


def render_tokens(content: str, context: Dict[str, str]) -> str:
        output = content
        for key, value in context.items():
                output = output.replace("{{" + key + "}}", value)
        return output


def build_template(html_template_path: str, text_template_path: str, context: Dict[str, str]) -> Tuple[str, str]:
        text_template = read_text_file(text_template_path)
        html_template = read_text_file(html_template_path)
        text_body = render_tokens(text_template, context)
        html_body = render_tokens(html_template, context)
        return text_body, html_body


def load_data(master_csv: str, registered_csv: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if not os.path.exists(master_csv):
        raise FileNotFoundError(f"Master CSV not found: {master_csv}")
    if not os.path.exists(registered_csv):
        raise FileNotFoundError(f"Registered CSV not found: {registered_csv}")

    master_df = pd.read_csv(master_csv, dtype=str, keep_default_na=False)
    registered_df = pd.read_csv(registered_csv, dtype=str, keep_default_na=False)
    return master_df, registered_df


def prepare_exclusion(master_df: pd.DataFrame, registered_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    required_master_cols = ["name", "email", "phone"]
    for col in required_master_cols:
        if col not in master_df.columns:
            raise ValueError(f"Master CSV missing required column: {col}")

    required_registered_cols = ["email", "contact"]
    for col in required_registered_cols:
        if col not in registered_df.columns:
            raise ValueError(f"Registered CSV missing required column: {col}")

    work = master_df.copy()
    work["email_norm"] = work["email"].apply(normalize_email)
    work["phone_norm"] = work["phone"].apply(normalize_phone)
    work["email_valid"] = work["email_norm"].apply(is_valid_email)

    # Registered sets
    reg_email_set = {
        e for e in registered_df["email"].apply(normalize_email).tolist() if is_valid_email(e)
    }
    reg_phone_set = {
        p for p in registered_df["contact"].apply(normalize_phone).tolist() if p
    }

    work["match_registered_email"] = work["email_norm"].isin(reg_email_set)
    work["match_registered_phone"] = work["phone_norm"].isin(reg_phone_set)
    work["is_excluded_registered"] = work["match_registered_email"] | work["match_registered_phone"]

    def reason(row: pd.Series) -> str:
        if row["match_registered_email"] and row["match_registered_phone"]:
            return "email_and_phone"
        if row["match_registered_email"]:
            return "email"
        if row["match_registered_phone"]:
            return "phone"
        return ""

    work["exclusion_reason"] = work.apply(reason, axis=1)

    # Keep only valid emails and not excluded.
    eligible = work[(work["email_valid"]) & (~work["is_excluded_registered"])].copy()
    eligible = eligible.drop_duplicates(subset=["email_norm"], keep="first")

    stats = {
        "master_total": int(len(work)),
        "registered_total": int(len(registered_df)),
        "registered_unique_emails": int(len(reg_email_set)),
        "registered_unique_phones": int(len(reg_phone_set)),
        "master_invalid_email": int((~work["email_valid"]).sum()),
        "excluded_registered": int(work["is_excluded_registered"].sum()),
        "eligible_production": int(len(eligible)),
    }

    return work, stats


def export_reports(work_df: pd.DataFrame, eligible_df: pd.DataFrame, exclusion_report: str, eligible_export: str) -> None:
    ensure_parent_dir(exclusion_report)
    ensure_parent_dir(eligible_export)

    report_cols = [
        "name",
        "email",
        "phone",
        "city",
        "role in music",
        "email_norm",
        "phone_norm",
        "email_valid",
        "match_registered_email",
        "match_registered_phone",
        "is_excluded_registered",
        "exclusion_reason",
    ]
    keep_report_cols = [c for c in report_cols if c in work_df.columns]
    work_df.to_csv(exclusion_report, index=False, columns=keep_report_cols)

    eligible_cols = [
        "name",
        "email",
        "phone",
        "city",
        "role in music",
        "country_code",
        "email_norm",
        "phone_norm",
    ]
    keep_eligible_cols = [c for c in eligible_cols if c in eligible_df.columns]
    eligible_df.to_csv(eligible_export, index=False, columns=keep_eligible_cols)


def load_sent_emails_from_log(log_file: str) -> set:
    """Load all emails marked as SENT from the batch send log.
    
    Returns a set of normalized emails (lowercase) that have been sent.
    """
    sent_emails = set()
    if not os.path.exists(log_file):
        return sent_emails
    
    try:
        log_df = pd.read_csv(log_file, dtype=str, keep_default_na=False)
        # Get all emails with status = 'SENT' and normalize them
        sent_mask = (log_df["status"] == "SENT")
        sent_list = log_df[sent_mask]["recipient"].tolist()
        sent_emails = {normalize_email(email) for email in sent_list if email}
    except Exception as e:
        print(f"Warning: Could not load sent emails from log: {e}")
    
    return sent_emails


def load_or_init_tracking(eligible_df: pd.DataFrame, eligible_export: str) -> pd.DataFrame:
    """Load tracking CSV if exists, otherwise create from eligible_df."""
    tracking_df = eligible_df.copy()
    if "havells_sent" not in tracking_df.columns:
        tracking_df["havells_sent"] = False
    if "havells_sent_timestamp" not in tracking_df.columns:
        tracking_df["havells_sent_timestamp"] = ""
    return tracking_df


def save_tracking(tracking_df: pd.DataFrame, eligible_export: str) -> None:
    """Save tracking CSV with sent status."""
    ensure_parent_dir(eligible_export)
    tracking_cols = [
        "name",
        "email",
        "phone",
        "city",
        "role in music",
        "country_code",
        "email_norm",
        "phone_norm",
        "havells_sent",
        "havells_sent_timestamp",
    ]
    keep_cols = [c for c in tracking_cols if c in tracking_df.columns]
    tracking_df.to_csv(eligible_export, index=False, columns=keep_cols)


def write_log_rows(log_file: str, rows: List[List[str]]) -> None:
    ensure_parent_dir(log_file)
    file_exists = os.path.exists(log_file)

    with open(log_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(
                [
                    "timestamp",
                    "mode",
                    "batch_no",
                    "recipient",
                    "status",
                    "error",
                ]
            )
        writer.writerows(rows)


def build_message(sender: str, to_email: str, subject: str, text_body: str, html_body: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def send_batches(
    sender_email: str,
    sender_password: str,
    recipients: List[Tuple[int, str]],
    mode: str,
    batch_size: int,
    subject: str,
    delay_seconds: float,
    dry_run: bool,
    log_file: str,
    html_template_path: str,
    text_template_path: str,
    context: Dict[str, str],
    tracking_df: pd.DataFrame = None,
    eligible_export: str = "",
) -> Dict[str, int]:
    text_body, html_body = build_template(
        html_template_path=html_template_path,
        text_template_path=text_template_path,
        context=context,
    )
    total = len(recipients)

    if total == 0:
        return {"sent": 0, "failed": 0, "batches": 0}

    batches = [recipients[i : i + batch_size] for i in range(0, total, batch_size)]
    sent = 0
    failed = 0

    smtp = None
    if not dry_run:
        smtp = smtplib.SMTP("smtp.gmail.com", 587)
        smtp.starttls()
        smtp.login(sender_email, sender_password)

    try:
        for idx, batch in enumerate(batches, start=1):
            print(f"[Batch {idx}/{len(batches)}] recipients={len(batch)}")
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            batch_email_list = [recip[1] if isinstance(recip, tuple) else recip for recip in batch]
            batch_index_list = [recip[0] if isinstance(recip, tuple) else None for recip in batch]

            if dry_run:
                rows = [[timestamp, mode, str(idx), email, "DRY_RUN", ""] for email in batch_email_list]
                write_log_rows(log_file, rows)
                sent += len(batch)
                # Mark as sent in tracking even for dry-run
                for df_idx in batch_index_list:
                    if df_idx is not None:
                        tracking_df.at[df_idx, "havells_sent"] = True
                        tracking_df.at[df_idx, "havells_sent_timestamp"] = timestamp
            else:
                msg = build_message(
                    sender=sender_email,
                    to_email=sender_email,
                    subject=subject,
                    text_body=text_body,
                    html_body=html_body,
                )
                try:
                    # Envelope recipients include BCC list, but Bcc header is intentionally omitted
                    # so recipients cannot see other recipients.
                    smtp.sendmail(sender_email, [sender_email] + batch_email_list, msg.as_string())
                    rows = [[timestamp, mode, str(idx), email, "SENT", ""] for email in batch_email_list]
                    write_log_rows(log_file, rows)
                    sent += len(batch)
                    # Mark as sent in tracking
                    for df_idx in batch_index_list:
                        if df_idx is not None:
                            tracking_df.at[df_idx, "havells_sent"] = True
                            tracking_df.at[df_idx, "havells_sent_timestamp"] = timestamp
                    print("  Status: SENT")
                except Exception as exc:
                    err = str(exc)
                    rows = [[timestamp, mode, str(idx), email, "FAILED", err] for email in batch_email_list]
                    write_log_rows(log_file, rows)
                    failed += len(batch)
                    print(f"  Status: FAILED ({err})")

            if idx < len(batches) and delay_seconds > 0:
                time.sleep(delay_seconds)
            
            # Save tracking after each batch for resumability
            if tracking_df is not None:
                save_tracking(tracking_df, eligible_export)
    finally:
        if smtp is not None:
            smtp.quit()

    return {"sent": sent, "failed": failed, "batches": len(batches)}


def main() -> None:
    args = parse_args()

    load_dotenv()
    sender_email = os.getenv("EMAIL_ADDRESS", "").strip()
    sender_password = os.getenv("EMAIL_PASSWORD", "").strip()

    if not sender_email or not sender_password:
        print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD missing in .env")
        sys.exit(1)

    master_df, registered_df = load_data(args.master_csv, args.registered_csv)
    work_df, stats = prepare_exclusion(master_df, registered_df)

    eligible_df = work_df[(work_df["email_valid"]) & (~work_df["is_excluded_registered"])].copy()
    eligible_df = eligible_df.drop_duplicates(subset=["email_norm"], keep="first")

    export_reports(
        work_df=work_df,
        eligible_df=eligible_df,
        exclusion_report=args.exclusion_report,
        eligible_export=args.eligible_export,
    )

    print("=" * 72)
    print("HAVELLS CAMPAIGN | EXCLUDE ALREADY REGISTERED")
    print("=" * 72)
    print(f"Mode: {args.mode}")
    print(f"Master rows: {stats['master_total']}")
    print(f"Registered rows: {stats['registered_total']}")
    print(f"Registered unique emails: {stats['registered_unique_emails']}")
    print(f"Registered unique phones: {stats['registered_unique_phones']}")
    print(f"Master invalid emails: {stats['master_invalid_email']}")
    print(f"Excluded as already registered: {stats['excluded_registered']}")
    print(f"Eligible for production send: {stats['eligible_production']}")
    print(f"Exclusion report: {args.exclusion_report}")
    print(f"Eligible export: {args.eligible_export}")

    test_emails = dedupe_preserve_order([e.strip() for e in args.test_emails.split(",")])

    # Load or init tracking for production mode
    tracking_df = None
    if args.mode == "prod":
        tracking_df = load_or_init_tracking(eligible_df, args.eligible_export)
        
        # Load sent emails from batch send log (authoritative source)
        sent_emails = load_sent_emails_from_log(args.log_file)
        
        # Filter out already-sent emails by checking against log
        unsent_mask = ~tracking_df["email_norm"].isin(sent_emails)
        unsent_df = tracking_df[unsent_mask].copy()
        already_sent = len(tracking_df) - len(unsent_df)
        
        # Pair each email with its dataframe index for tracking
        recipients = [(idx, row["email_norm"]) for idx, row in unsent_df.iterrows()]
        print(f"Production recipients (unsent): {len(recipients)}")
        if already_sent > 0:
            print(f"  (Skipped {already_sent} already-sent emails from batch log)")
    else:
        # Test mode: use provided test emails
        recipients = [(None, e) for e in test_emails if is_valid_email(normalize_email(e))]
        print(f"Test recipients ({len(recipients)}): {', '.join([e[1] for e in recipients])}")

    if len(recipients) == 0:
        print("No recipients to send.")
        return

    print(f"Batch size: {args.batch_size}")
    print(f"Estimated batches: {math.ceil(len(recipients) / args.batch_size)}")
    print(f"Log file: {args.log_file}")
    print(f"Dry run: {args.dry_run}")

    context = {
        "name": args.name,
        "id": args.entry_id,
        "qrUrl": args.qr_url,
        "event_datetime": args.event_datetime,
        "venue": args.venue,
        "maps_url": args.maps_url,
        "helpdesk_1": args.helpdesk_1,
        "helpdesk_2": args.helpdesk_2,
    }

    summary = send_batches(
        sender_email=sender_email,
        sender_password=sender_password,
        recipients=recipients,
        mode=args.mode,
        batch_size=args.batch_size,
        subject=args.subject,
        delay_seconds=args.delay_seconds,
        dry_run=args.dry_run,
        log_file=args.log_file,
        html_template_path=args.html_template,
        text_template_path=args.text_template,
        context=context,
        tracking_df=tracking_df if args.mode == "prod" else None,
        eligible_export=args.eligible_export,
    )

    print("-" * 72)
    print("Send summary")
    print(f"Batches attempted: {summary['batches']}")
    print(f"Recipients marked sent: {summary['sent']}")
    print(f"Recipients failed: {summary['failed']}")
    print("=" * 72)


if __name__ == "__main__":
    main()
