#!/usr/bin/env python3
"""
Email scheduler - Sends emails at scheduled time (9am by default).
Keeps running in background and executes campaign at specified time.
"""

import os
import sys
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime, time
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import signal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    exit(1)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(base_dir, 'assets', 'rise-emailer', 'images')
contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts.csv')
log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, 'rise_campaign_scheduled.csv')

os.makedirs(log_dir, exist_ok=True)

if not os.path.exists(contacts_file):
    print(f"ERROR: Contacts file not found at {contacts_file}")
    exit(1)

# Load contacts
df = pd.read_csv(contacts_file)
print(f"✅ Loaded {len(df)} Delhi and New Delhi contacts")

# HTML template
html_template = """<html>
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

subject = "🎵 Rise by Skillboxes - Exclusive Offer!"
BATCH_SIZE = 50

def log_email(emails, status, error=''):
    """Log email sending attempt."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if not os.path.exists(log_file):
        with open(log_file, 'w', newline='', encoding='utf-8') as f:
            f.write('Timestamp,Recipients,Status,Error\n')
    
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        email_list = '; '.join(emails) if isinstance(emails, list) else emails
        error_str = str(error).replace(',', ';')
        f.write(f'{timestamp},"{email_list}",{status},{error_str}\n')

def create_message_with_images():
    """Create email message with attached images."""
    message = MIMEMultipart('related')
    message['From'] = EMAIL_ADDRESS
    message['Subject'] = subject
    
    msg_alternative = MIMEMultipart('alternative')
    message.attach(msg_alternative)
    
    text_part = MIMEText('Rise by Skillboxes - An exclusive event for music artists!', 'plain')
    msg_alternative.attach(text_part)
    
    html_part = MIMEText(html_template, 'html')
    msg_alternative.attach(html_part)
    
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

def send_batch(email_list, batch_num, total_batches):
    """Send email to a batch of recipients."""
    try:
        message = create_message_with_images()
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, email_list, message.as_string())
        server.quit()
        
        log_email(email_list, 'Sent')
        print(f"   [Batch {batch_num}/{total_batches}] ✅ Sent to {len(email_list)} recipients")
        return True
        
    except Exception as e:
        error_msg = str(e)
        log_email(email_list, 'Failed', error_msg)
        print(f"   [Batch {batch_num}/{total_batches}] ❌ Failed: {error_msg}")
        return False

def send_campaign():
    """Send campaign to all contacts in batches."""
    print("\n" + "="*70)
    print(f"⏰ SCHEDULED CAMPAIGN EXECUTION - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    total_batches = (len(df) + BATCH_SIZE - 1) // BATCH_SIZE
    sent_batches = 0
    total_sent = 0
    
    print(f"\n🚀 Sending to {len(df)} contacts in {total_batches} batches...\n")
    
    for batch_num in range(0, len(df), BATCH_SIZE):
        batch_df = df.iloc[batch_num:batch_num + BATCH_SIZE]
        email_list = batch_df['email'].tolist()
        batch_count = (batch_num // BATCH_SIZE) + 1
        
        if send_batch(email_list, batch_count, total_batches):
            sent_batches += 1
            total_sent += len(email_list)
        
        if batch_count < total_batches:
            import time
            time.sleep(1)
    
    print("\n" + "="*70)
    print(f"✅ CAMPAIGN COMPLETE!")
    print(f"   Total sent: {total_sent} contacts")
    print(f"   Successful batches: {sent_batches}")
    print(f"   Log: {log_file}")
    print("="*70 + "\n")

def start_scheduler(hour=9, minute=0):
    """Start the scheduler."""
    scheduler = BackgroundScheduler()
    
    # Schedule to run at specific time daily
    scheduler.add_job(
        send_campaign,
        CronTrigger(hour=hour, minute=minute),
        id='rise_emailer_job',
        name=f'Send Rise Emailer at {hour:02d}:{minute:02d} AM',
        replace_existing=True
    )
    
    scheduler.start()
    
    print("\n" + "="*70)
    print("📅 EMAIL SCHEDULER ACTIVE")
    print("="*70)
    print(f"✅ Scheduler started successfully!")
    print(f"⏰ Campaign will run daily at {hour:02d}:{minute:02d} AM")
    print(f"📊 Recipients: {len(df)} contacts")
    print(f"📂 Log file: {log_file}")
    print(f"\n💡 Keep this window open for scheduled execution.")
    print(f"📝 Press Ctrl+C to stop the scheduler.\n")
    print("="*70 + "\n")
    
    return scheduler

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    print("\n\n⛔ Stopping scheduler...")
    scheduler.shutdown()
    print("✅ Scheduler stopped successfully.")
    sys.exit(0)

if __name__ == '__main__':
    # Start scheduler at 9:00 AM
    scheduler = start_scheduler(hour=9, minute=0)
    
    # Handle graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Keep the scheduler running
    try:
        while True:
            pass
    except KeyboardInterrupt:
        signal_handler(None, None)
