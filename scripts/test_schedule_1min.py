#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TEST SCHEDULER - 1 Minute Later
Tests scheduling functionality with 1-minute delay
"""

import os
import sys
import io

# Set UTF-8 encoding for Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import smtplib
import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime, timedelta
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
import time
import signal

# ==================== CONFIGURATION ====================
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    exit(1)

# ==================== DATABASE SELECTION ====================
# IMPORTANT: By default, this script uses the TEST database (4 contacts)
# This is a safety measure to prevent accidental mass sending
# 
# TO USE THE ACTUAL PRODUCTION DATABASE (429 contacts):
# Change "TEST" to "PRODUCTION" on the line below, then run the script
# 
# contacts_mode = "PRODUCTION"  # <-- Change this to send to all 429 contacts
#
# ==================== DO NOT MODIFY BELOW THIS LINE ====================

contacts_mode = "TEST"  # Options: "TEST" (4 contacts) or "PRODUCTION" (429 contacts)

# Paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(base_dir, 'assets', 'rise-emailer', 'images')

# Select database based on mode
if contacts_mode == "TEST":
    contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_Test_Contacts.csv')
    working_contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_Test_Contacts_WORKING.csv')
    log_file_name = 'test_schedule.log'
elif contacts_mode == "PRODUCTION":
    contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts.csv')
    working_contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts_WORKING.csv')
    log_file_name = 'test_schedule_PRODUCTION.log'
else:
    raise ValueError(f"Invalid contacts_mode: {contacts_mode}. Use 'TEST' or 'PRODUCTION'")

log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, log_file_name)

os.makedirs(log_dir, exist_ok=True)

# Campaign Settings
MAX_BATCH_SIZE = 50
SUBJECT = "🎵 Rise by Skillboxes - Exclusive Offer!"

# HTML Template
EMAIL_HTML_TEMPLATE = """<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media (max-width: 600px) {
    table[class="container"] { width: 100% !important; }
    img[class="responsive-image"] { width: 100% !important; height: auto !important; }
  }
</style>
</head>
<body style="width:100%;margin:0;padding:0;background-color:#f0f1f5;font-family:Arial,sans-serif">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5" style="margin:0;padding:0">
<tbody>
<tr><td style="background-color:#f0f1f5;padding:0">
<table align="center" width="600" border="0" cellpadding="0" cellspacing="0" class="container" style="background-color:#ffffff;max-width:100%;margin:0 auto">
<tbody>
<tr><td style="width:100%;padding:0;text-align:center;display:block">
<img src="cid:header_image" width="600" height="150" class="responsive-image" style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto">
</td></tr>
<tr><td style="padding:20px;text-align:center;display:block">
<img src="cid:main_image" width="600" height="436" class="responsive-image" style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto">
</td></tr>
<tr><td style="padding:20px;text-align:center;font-size:16px">
<strong>To avail, use 'TSC20' at checkout.</strong>
</td></tr>
<tr><td style="padding:20px;text-align:center">
<a href="https://www.skillboxes.com/events/rise-del-1" style="background-color:#303030;color:#ffffff;padding:15px 40px;text-decoration:none;display:inline-block;border-radius:25px;font-weight:bold">
GRAB YOUR PASSES!
</a>
</td></tr>
</tbody>
</table>
</td></tr>
</tbody>
</table>
</body>
</html>"""

# ==================== CLASSES ====================

class DatabaseManager:
    """Manages contact database and working copies."""
    
    def __init__(self, original_path, working_path):
        self.original_path = original_path
        self.working_path = working_path
        self.df_original = None
        self.df_working = None
    
    def load(self):
        """Load original and working databases."""
        if not os.path.exists(self.original_path):
            raise FileNotFoundError(f"Original database not found: {self.original_path}")
        
        self.df_original = pd.read_csv(self.original_path)
        
        if os.path.exists(self.working_path):
            self.df_working = pd.read_csv(self.working_path)
            self.df_working['email_sent'] = self.df_working['email_sent'].astype(bool)
        else:
            self.df_working = self.df_original.copy()
            self.df_working['email_sent'] = False
            self.df_working['sent_timestamp'] = pd.NA
            self.save()
        
        return self.df_working
    
    def save(self):
        """Save working copy to disk."""
        if self.df_working is not None:
            self.df_working.to_csv(self.working_path, index=False)
    
    def get_unsent_contacts(self):
        """Get all contacts that haven't been sent yet."""
        return self.df_working[self.df_working['email_sent'] == False]
    
    def mark_sent(self, indices):
        """Mark contacts as sent."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for idx in indices:
            self.df_working.at[idx, 'email_sent'] = True
            self.df_working.at[idx, 'sent_timestamp'] = timestamp
        self.save()


class EmailBatch:
    """Represents a batch of email recipients."""
    
    def __init__(self, batch_id):
        self.batch_id = batch_id
        self.recipients = []
        self.indices = []
    
    def add(self, email, index):
        """Add recipient to batch."""
        self.recipients.append(email)
        self.indices.append(index)
    
    def is_full(self):
        """Check if batch is at max capacity."""
        return len(self.recipients) >= MAX_BATCH_SIZE
    
    def is_empty(self):
        """Check if batch is empty."""
        return len(self.recipients) == 0
    
    def __len__(self):
        return len(self.recipients)


class EmailSender:
    """Handles email message creation and sending."""
    
    @staticmethod
    def create_message():
        """Create email message with all attachments."""
        message = MIMEMultipart('related')
        message['From'] = EMAIL_ADDRESS
        message['Subject'] = SUBJECT
        
        # Alternative part for plain text and HTML
        msg_alternative = MIMEMultipart('alternative')
        message.attach(msg_alternative)
        
        # Plain text version
        text_part = MIMEText(
            'Rise by Skillboxes - An exclusive event for music artists!',
            'plain'
        )
        msg_alternative.attach(text_part)
        
        # HTML version
        html_part = MIMEText(EMAIL_HTML_TEMPLATE, 'html')
        msg_alternative.attach(html_part)
        
        # Attach images
        image_files = {
            'ae12e36b91688b355213498243f60b7c.png': 'header_image',
            'b8a2058b2d44ff4969e210545b21647a.png': 'main_image'
        }
        
        for filename, cid in image_files.items():
            image_path = os.path.join(images_dir, filename)
            if os.path.exists(image_path):
                with open(image_path, 'rb') as img_file:
                    img = MIMEImage(img_file.read(), name=filename)
                    img.add_header('Content-ID', f'<{cid}>')
                    img.add_header('Content-Disposition', 'inline', filename=filename)
                    message.attach(img)
        
        return message
    
    @staticmethod
    def send(batch):
        """Send email to batch of recipients."""
        if batch.is_empty():
            return False
        
        try:
            message = EmailSender.create_message()
            
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, batch.recipients, message.as_string())
            server.quit()
            
            return True
        except Exception as e:
            log_message(f"Send error: {str(e)}")
            return False


def log_message(msg):
    """Write message to both console and log file."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    full_msg = f"[{timestamp}] {msg}"
    print(full_msg)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(full_msg + '\n')


def run_campaign():
    """Execute the campaign when scheduled."""
    log_message("="*70)
    log_message("[EXECUTE] SCHEDULED CAMPAIGN STARTED")
    log_message("="*70)
    
    try:
        db = DatabaseManager(contacts_file, working_contacts_file)
        db.load()
        
        stats = {
            'total': len(db.df_working),
            'sent': len(db.df_working[db.df_working['email_sent'] == True]),
            'remaining': len(db.get_unsent_contacts())
        }
        
        log_message(f"[STATUS] {stats['remaining']} unsent / {stats['total']} total")
        
        batch = EmailBatch(1)
        batch_count = 1
        total_sent = 0
        sent_batches = 0
        
        # Iterate through unsent contacts
        for idx, row in db.get_unsent_contacts().iterrows():
            email = row['email']
            batch.add(email, idx)
            
            if batch.is_full():
                log_message(f"[BATCH {batch_count}] Sending to {len(batch)} recipients...")
                
                if EmailSender.send(batch):
                    db.mark_sent(batch.indices)
                    total_sent += len(batch)
                    sent_batches += 1
                    log_message(f"   [OK] Batch sent successfully")
                else:
                    log_message(f"   [ERROR] Batch send failed")
                
                batch = EmailBatch(batch_count + 1)
                batch_count += 1
                time.sleep(1)
        
        # Send remaining batch
        if not batch.is_empty():
            log_message(f"[BATCH {batch_count}] Sending to {len(batch)} recipients...")
            
            if EmailSender.send(batch):
                db.mark_sent(batch.indices)
                total_sent += len(batch)
                sent_batches += 1
                log_message(f"   [OK] Batch sent successfully")
            else:
                log_message(f"   [ERROR] Batch send failed")
        
        log_message("="*70)
        log_message(f"[COMPLETE] {sent_batches} batches, {total_sent} emails sent")
        log_message("="*70)
        
    except Exception as e:
        log_message(f"[ERROR] Campaign error: {str(e)}")
        import traceback
        log_message(traceback.format_exc())


def main():
    """Main entry point."""
    # Clear log file
    open(log_file, 'w', encoding='utf-8').close()
    
    log_message("[INFO] ================================================================")
    log_message("[INFO] DATABASE MODE: " + contacts_mode.upper())
    if contacts_mode == "TEST":
        log_message("[INFO] Running in TEST mode (4 test contacts)")
        log_message("[INFO] To switch to PRODUCTION: Change contacts_mode = 'PRODUCTION'")
    elif contacts_mode == "PRODUCTION":
        log_message("[WARNING] Running in PRODUCTION mode (429 contacts) - MAKE SURE THIS IS INTENTIONAL!")
    log_message("[INFO] ================================================================")
    
    log_message("[TEST] TEST SCHEDULER - 1 Minute Delay Test")
    log_message("="*70)
    
    # Calculate run time
    run_time = datetime.now() + timedelta(minutes=1)
    
    log_message(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log_message(f"Scheduled for: {run_time.strftime('%Y-%m-%d %H:%M:%S')}")
    log_message(f"Campaign will start in ~1 minute...")
    log_message("="*70)
    
    # Create scheduler
    scheduler = BackgroundScheduler()
    trigger = DateTrigger(run_date=run_time)
    scheduler.add_job(run_campaign, trigger=trigger, id='test_campaign')
    scheduler.start()
    
    log_message("[INFO] Scheduler started. Waiting for execution...")
    log_message("[INFO] Press Ctrl+C to cancel.")
    
    try:
        # Keep scheduler running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log_message("[CANCELLED] Scheduler interrupted by user.")
        scheduler.shutdown()


if __name__ == '__main__':
    main()
