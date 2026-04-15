#!/usr/bin/env python3
"""
🚀 AUTO-MAILER UNIFIED EMAIL SENDING SYSTEM
============================================
Single master script for all email campaign needs.
- Smart dataset detection and column mapping
- Interactive dataset & template selection
- Batch processing with resume capability
- Email sending & tracking

Run this script to launch the interactive menu.
"""

import os
import sys
import smtplib
import pandas as pd
import csv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
from dotenv import load_dotenv
import time
from pathlib import Path
from typing import Tuple, Dict, List

# ==================== SETUP ====================
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_EXPORTS_DIR = os.path.join(BASE_DIR, 'data', 'exports')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'assets', 'email_templates')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
PARAMS_DIR = os.path.join(BASE_DIR, 'params')

os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PARAMS_DIR, exist_ok=True)

EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("❌ ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    print("🔧 Please create a .env file in the Auto-Mailer directory with:")
    print("   EMAIL_ADDRESS=your_email@gmail.com")
    print("   EMAIL_PASSWORD=your_app_password")
    sys.exit(1)


# ==================== COLUMN MAPPING ====================
class ColumnMapper:
    """Smart column detection and mapping."""
    
    COMMON_NAME_COLS = ['name', 'Name', 'full_name', 'Full Name', 'contact_name', 'Contact Name', 'recipient']
    COMMON_EMAIL_COLS = ['email', 'Email', 'email_address', 'Email Address', 'email_id', 'Email ID', 'recipient_email']
    COMMON_PHONE_COLS = ['phone', 'Phone', 'phone_number', 'Phone Number', 'mobile', 'Mobile', 'contact_phone']
    COMMON_STATUS_COLS = ['status', 'Status', 'sent', 'Sent', 'email_sent', 'Email Sent', 'is_sent', 'sent_status']

    @classmethod
    def find_best_match(cls, columns: List[str], candidates: List[str]) -> str:
        """Find first matching column from candidates."""
        for candidate in candidates:
            if candidate in columns:
                return candidate
        return None

    @classmethod
    def map_columns(cls, df: pd.DataFrame) -> Dict[str, str]:
        """
        Intelligently map DataFrame columns to standard format.
        Returns dict: {'name': col, 'email': col, 'phone': col, 'status': col}
        """
        columns = list(df.columns)
        mapping = {}

        # Find name column
        name_col = cls.find_best_match(columns, cls.COMMON_NAME_COLS)
        if not name_col:
            print(f"❌ Could not find name column. Available: {columns}")
            return None
        mapping['name'] = name_col

        # Find email column
        email_col = cls.find_best_match(columns, cls.COMMON_EMAIL_COLS)
        if not email_col:
            print(f"❌ Could not find email column. Available: {columns}")
            return None
        mapping['email'] = email_col

        # Find phone column (optional)
        phone_col = cls.find_best_match(columns, cls.COMMON_PHONE_COLS)
        mapping['phone'] = phone_col if phone_col else None

        # Find status column (optional)
        status_col = cls.find_best_match(columns, cls.COMMON_STATUS_COLS)
        mapping['status'] = status_col if status_col else None

        return mapping


# ==================== TEMPLATE LOADER ====================
class TemplateLoader:
    """Load email templates from files."""

    @staticmethod
    def get_available_templates() -> List[Tuple[str, str]]:
        """Return list of (template_name, template_path) tuples."""
        templates = []
        if os.path.exists(TEMPLATES_DIR):
            for file in sorted(os.listdir(TEMPLATES_DIR)):
                if file.endswith('.html'):
                    template_name = file.replace('_template.html', '').replace('_', ' ').title()
                    template_path = os.path.join(TEMPLATES_DIR, file)
                    templates.append((template_name, template_path))

        if not templates:
            # Create a default blank template
            default_template = os.path.join(TEMPLATES_DIR, 'default_template.html')
            os.makedirs(TEMPLATES_DIR, exist_ok=True)
            if not os.path.exists(default_template):
                with open(default_template, 'w') as f:
                    f.write("""<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Hello {name},</h2>
<p>Thank you for your interest in our campaign!</p>
<p>We're excited to connect with you.</p>
<br>
<p>Best regards,<br>The Team</p>
</body>
</html>""")
            templates.append(("Default", default_template))

        return templates

    @staticmethod
    def load_template(template_path: str) -> str:
        """Load HTML template from file."""
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()


# ==================== DATASET LOADER ====================
class DatasetLoader:
    """Load and prepare datasets for sending."""

    @staticmethod
    def get_available_datasets() -> List[Tuple[str, str]]:
        """Return list of (dataset_name, dataset_path) tuples."""
        datasets = []
        if os.path.exists(DATA_EXPORTS_DIR):
            for file in sorted(os.listdir(DATA_EXPORTS_DIR)):
                if file.endswith('.csv'):
                    dataset_name = file.replace('.csv', '')
                    dataset_path = os.path.join(DATA_EXPORTS_DIR, file)
                    datasets.append((dataset_name, dataset_path))
        return datasets

    @staticmethod
    def load_and_map_dataset(dataset_path: str) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """Load dataset and intelligently map columns."""
        print(f"\n📂 Loading dataset: {os.path.basename(dataset_path)}")
        
        try:
            df = pd.read_csv(dataset_path, encoding='utf-8')
        except:
            df = pd.read_csv(dataset_path, encoding='latin-1')

        print(f"   ✅ Loaded {len(df)} rows")
        print(f"   📋 Columns found: {list(df.columns)}")

        # Map columns
        mapping = ColumnMapper.map_columns(df)
        if not mapping:
            return None, None

        print(f"   ✨ Column mapping:")
        print(f"      Name → {mapping['name']}")
        print(f"      Email → {mapping['email']}")
        print(f"      Phone → {mapping['phone'] or '(not found)'}")
        print(f"      Status → {mapping['status'] or '(not found)'}")

        return df, mapping

    @staticmethod
    def prepare_working_dataset(df: pd.DataFrame, mapping: Dict[str, str], original_path: str) -> str:
        """
        Create a working copy with standardized columns: name, email, phone, status (Sent/Failed).
        Returns path to the new working file.
        """
        # Create working dataframe with standard columns
        working_df = pd.DataFrame()
        working_df['name'] = df[mapping['name']].astype(str).fillna('Unknown')
        working_df['email'] = df[mapping['email']].astype(str).str.lower().str.strip()
        working_df['phone'] = df[mapping['phone']].astype(str).fillna('') if mapping['phone'] else ''

        # Initialize Status column
        if mapping['status']:
            # Convert existing status to Sent/Failed
            working_df['Status'] = df[mapping['status']].apply(
                lambda x: 'Sent' if x else 'Pending'
            )
        else:
            working_df['Status'] = 'Pending'

        # Generate working file path
        base_name = os.path.basename(original_path).replace('.csv', '')
        working_path = os.path.join(DATA_EXPORTS_DIR, f'{base_name}_WORKING.csv')

        # Always overwrite with fresh copy
        working_df.to_csv(working_path, index=False, encoding='utf-8')
        print(f"\n📝 Created working dataset: {os.path.basename(working_path)}")

        return working_path


# ==================== DATASET PREVIEW ====================
class DatasetPreview:
    """Display dataset information and preview."""

    @staticmethod
    def show_preview(df: pd.DataFrame, mapping: Dict[str, str]):
        """Display first 5 rows and basic statistics."""
        print("\n" + "=" * 80)
        print("📊 DATASET PREVIEW & STATISTICS")
        print("=" * 80)

        # Basic statistics
        total_rows = len(df)
        pending = (df['Status'] != 'Sent').sum()
        sent = (df['Status'] == 'Sent').sum()

        print(f"\n📈 Statistics:")
        print(f"   Total records: {total_rows}")
        print(f"   Pending (not sent): {pending}")
        print(f"   Already sent: {sent}")
        print(f"\n   Email validation:")
        valid_emails = df['email'].str.contains(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').sum()
        print(f"   Valid email format: {valid_emails}/{total_rows}")

        # Preview
        print(f"\n📋 First 5 rows:")
        print("-" * 80)
        preview_df = df[['name', 'email', 'phone', 'Status']].head(5).copy()
        print(preview_df.to_string(index=False))
        print("-" * 80)

        # Ask for confirmation
        confirm = input("\n✅ Proceed with this dataset? (y/n): ").strip().lower()
        return confirm == 'y'


# ==================== EMAIL SERVICE ====================
class EmailService:
    """Handle email sending and logging."""

    def __init__(self, sender_email: str, sender_password: str, log_file: str):
        self.sender_email = sender_email
        self.sender_password = sender_password
        self.log_file = log_file
        self.server = None

    def connect(self):
        """Establish SMTP connection."""
        print("\n🔐 Connecting to Gmail SMTP...")
        self.server = smtplib.SMTP('smtp.gmail.com', 587)
        self.server.starttls()
        self.server.login(self.sender_email, self.sender_password)
        print("✅ Connected successfully!")

    def disconnect(self):
        """Close SMTP connection."""
        if self.server:
            self.server.quit()

    def send_email(self, recipient_email: str, recipient_name: str, subject: str, html_body: str) -> bool:
        """Send a single email."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = recipient_email
            msg['Subject'] = subject
            msg['X-Priority'] = '1'
            msg.attach(MIMEText(html_body, 'html'))

            self.server.sendmail(self.sender_email, recipient_email, msg.as_string())
            return True
        except Exception as e:
            print(f"   ❌ Error sending to {recipient_email}: {str(e)[:60]}")
            return False

    def log_email(self, email: str, name: str, status: str, error: str = ''):
        """Log email send attempt."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Create log file with headers if needed
        if not os.path.exists(self.log_file):
            with open(self.log_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Timestamp', 'Email', 'Name', 'Status', 'Error'])

        # Append log entry
        with open(self.log_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, email, name, status, error])


# ==================== BATCH SENDER ====================
class BatchEmailSender:
    """Send emails in batches with progress tracking."""

    BATCH_SIZE = 50

    def __init__(self, df: pd.DataFrame, template_html: str, subject: str, log_file: str, 
                 email_service: EmailService):
        self.df = df
        self.template_html = template_html
        self.subject = subject
        self.log_file = log_file
        self.email_service = email_service
        self.sent_count = 0
        self.failed_count = 0

    def process_batches(self):
        """Send emails in batches of 50."""
        pending = self.df[self.df['Status'] == 'Pending'].copy()

        if pending.empty:
            print("\n✅ No pending emails to send!")
            return

        total = len(pending)
        num_batches = (total + self.BATCH_SIZE - 1) // self.BATCH_SIZE

        print(f"\n📧 Preparing to send {total} emails in {num_batches} batches of {self.BATCH_SIZE}")
        print("=" * 80)

        for batch_num in range(num_batches):
            start_idx = batch_num * self.BATCH_SIZE
            end_idx = min(start_idx + self.BATCH_SIZE, total)
            batch = pending.iloc[start_idx:end_idx]

            print(f"\n📦 Batch {batch_num + 1}/{num_batches} ({end_idx}/{total} total)")
            print("-" * 80)

            for idx, row in batch.iterrows():
                email = row['email']
                name = row['name']

                # Replace {name} in template
                html_body = self.template_html.replace('{name}', name)

                # Send email
                success = self.email_service.send_email(email, name, self.subject, html_body)

                if success:
                    print(f"   ✅ {email}")
                    self.df.loc[idx, 'Status'] = 'Sent'
                    self.email_service.log_email(email, name, 'SENT')
                    self.sent_count += 1
                else:
                    print(f"   ❌ {email}")
                    self.df.loc[idx, 'Status'] = 'Failed'
                    self.email_service.log_email(email, name, 'FAILED')
                    self.failed_count += 1

                time.sleep(0.5)  # Rate limiting

            # Save progress after each batch
            print(f"\n💾 Saving progress...")
            self.save_progress()

            if batch_num < num_batches - 1:
                wait = 5
                print(f"⏳ Waiting {wait}s before next batch...")
                time.sleep(wait)

        print("\n" + "=" * 80)
        print("✅ EMAIL SENDING COMPLETE!")
        print(f"   Sent: {self.sent_count}")
        print(f"   Failed: {self.failed_count}")
        print("=" * 80)

    def save_progress(self, working_path: str):
        """Save current progress to CSV."""
        self.df.to_csv(working_path, index=False, encoding='utf-8')


# ==================== INTERACTIVE MENU ====================
class EmailCampaignManager:
    """Main orchestration class."""

    def __init__(self):
        self.df = None
        self.mapping = None
        self.dataset_path = None
        self.working_path = None
        self.template_path = None

    def menu_select_dataset(self) -> bool:
        """Let user select a dataset."""
        datasets = DatasetLoader.get_available_datasets()
        if not datasets:
            print("❌ No datasets found in data/exports/")
            return False

        print("\n" + "=" * 80)
        print("📂 SELECT DATASET")
        print("=" * 80)
        for idx, (name, _) in enumerate(datasets, 1):
            print(f"   {idx}. {name}")

        try:
            choice = int(input(f"\nEnter choice (1-{len(datasets)}): "))
            if 1 <= choice <= len(datasets):
                _, self.dataset_path = datasets[choice - 1]
                self.df, self.mapping = DatasetLoader.load_and_map_dataset(self.dataset_path)
                return self.df is not None
        except ValueError:
            pass

        print("❌ Invalid choice")
        return False

    def menu_select_template(self) -> bool:
        """Let user select an email template."""
        templates = TemplateLoader.get_available_templates()
        if not templates:
            print("❌ No templates found in assets/email_templates/")
            return False

        print("\n" + "=" * 80)
        print("📧 SELECT EMAIL TEMPLATE")
        print("=" * 80)
        for idx, (name, _) in enumerate(templates, 1):
            print(f"   {idx}. {name}")

        try:
            choice = int(input(f"\nEnter choice (1-{len(templates)}): "))
            if 1 <= choice <= len(templates):
                _, self.template_path = templates[choice - 1]
                print(f"✅ Selected: {os.path.basename(self.template_path)}")
                return True
        except ValueError:
            pass

        print("❌ Invalid choice")
        return False

    def menu_preview_and_confirm(self) -> bool:
        """Show dataset preview and get confirmation."""
        return DatasetPreview.show_preview(self.df, self.mapping)

    def menu_send_emails(self) -> bool:
        """Send emails with batch processing."""
        # Prepare working dataset
        self.working_path = DatasetLoader.prepare_working_dataset(
            self.df, self.mapping, self.dataset_path
        )

        # Load template
        template_html = TemplateLoader.load_template(self.template_path)
        template_name = os.path.basename(self.template_path).replace('_template.html', '')
        log_file = os.path.join(LOGS_DIR, f'{template_name}_send.csv')

        # Get subject
        subject = input("\n📝 Enter email subject (or press Enter for default): ").strip()
        if not subject:
            subject = "Important Update"

        print(f"\n📧 Using subject: {subject}")

        # Confirm before sending
        confirm = input("\n⚠️  Ready to send emails? (y/n): ").strip().lower()
        if confirm != 'y':
            print("❌ Cancelled")
            return False

        # Create email service
        email_service = EmailService(EMAIL_ADDRESS, EMAIL_PASSWORD, log_file)

        try:
            email_service.connect()
            sender = BatchEmailSender(self.df, template_html, subject, log_file, email_service)
            sender.process_batches()
            sender.save_progress(self.working_path)
            email_service.disconnect()
            return True
        except Exception as e:
            print(f"❌ Error during sending: {e}")
            email_service.disconnect()
            return False

    def run(self):
        """Main interactive workflow."""
        print("\n" + "=" * 80)
        print("🚀 AUTO-MAILER - UNIFIED EMAIL CAMPAIGN SYSTEM")
        print("=" * 80)

        # Step 1: Select Dataset
        if not self.menu_select_dataset():
            return

        # Step 2: Select Template
        if not self.menu_select_template():
            return

        # Step 3: Preview Dataset
        if not self.menu_preview_and_confirm():
            return

        # Step 4: Send Emails
        self.menu_send_emails()

        print("\n✅ Campaign workflow complete!")


# ==================== MAIN ====================
if __name__ == '__main__':
    manager = EmailCampaignManager()
    manager.run()
