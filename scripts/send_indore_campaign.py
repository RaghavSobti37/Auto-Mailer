#!/usr/bin/env python3
"""
Send email campaign to all Indore and region contacts using BCC batching.
"""

import os
import sys
import smtplib
import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
from dotenv import load_dotenv
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    exit(1)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(base_dir, 'assets', 'rise-emailer', 'images')
contacts_file = os.path.join(base_dir, 'data', 'exports', 'Indore_and_Region_Contacts_FINAL.csv')
log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, 'indore_campaign.csv')

os.makedirs(log_dir, exist_ok=True)

if not os.path.exists(contacts_file):
    print(f"ERROR: Contacts file not found at {contacts_file}")
    print("Please run: python scripts/export_indore.py")
    exit(1)

# Load contacts
df = pd.read_csv(contacts_file)
print(f"Loaded {len(df)} Indore and region contacts")

# HTML template with CID image references
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
BATCH_SIZE = 50  # Send to 50 recipients per email

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
    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = EMAIL_ADDRESS
    
    # Attach HTML
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    msg_alternative.attach(MIMEText(html_template, 'html'))
    
    # Attach images
    image_files = {
        'header_image': 'header.png',
        'main_image': 'main.png'
    }
    
    for cid, filename in image_files.items():
        image_path = os.path.join(images_dir, filename)
        if os.path.exists(image_path):
            with open(image_path, 'rb') as img_file:
                img = MIMEImage(img_file.read())
                img.add_header('Content-ID', f'<{cid}>')
                img.add_header('Content-Disposition', 'inline', filename=filename)
                msg.attach(img)
    
    return msg

try:
    # Create base message
    base_msg = create_message_with_images()
    
    # Get unique valid emails
    valid_emails = df[df['email'].notna()]['email'].unique()
    total = len(valid_emails)
    
    print(f"\n📧 Preparing to send {total} emails in batches of {BATCH_SIZE}...")
    
    # Connect to Gmail
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    
    sent_count = 0
    failed_count = 0
    
    # Send emails in batches
    for i in range(0, len(valid_emails), BATCH_SIZE):
        batch = valid_emails[i:i+BATCH_SIZE]
        
        try:
            # Create new message for this batch
            msg = create_message_with_images()
            msg['To'] = EMAIL_ADDRESS
            msg['Bcc'] = ', '.join(batch)
            
            # Send
            server.send_message(msg)
            
            sent_count += len(batch)
            log_email(batch, 'SENT')
            
            percentage = (sent_count / total) * 100
            print(f"   ✅ Batch {i//BATCH_SIZE + 1}: {len(batch)} emails sent ({percentage:.1f}%)")
            
            time.sleep(1)  # Rate limiting
            
        except Exception as e:
            failed_count += len(batch)
            log_email(batch, 'FAILED', str(e))
            print(f"   ❌ Batch {i//BATCH_SIZE + 1} FAILED: {str(e)}")
    
    server.quit()
    
    print(f"\n{'='*60}")
    print(f"📊 CAMPAIGN COMPLETE")
    print(f"{'='*60}")
    print(f"   Total Sent:     {sent_count}")
    print(f"   Failed:         {failed_count}")
    print(f"   Success Rate:   {(sent_count/total)*100:.1f}%")
    print(f"   Log saved to:   logs/indore_campaign.csv")
    print(f"{'='*60}\n")
    
except Exception as e:
    print(f"\n❌ Campaign failed: {str(e)}")
    log_email([], 'ERROR', str(e))
    exit(1)
