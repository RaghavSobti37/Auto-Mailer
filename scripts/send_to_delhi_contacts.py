#!/usr/bin/env python3
"""
Send Rise Emailer campaign to all Delhi and New Delhi contacts with proper MIME images.
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
contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts.csv')
log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, 'rise_campaign.csv')

os.makedirs(log_dir, exist_ok=True)

if not os.path.exists(contacts_file):
    print(f"ERROR: Contacts file not found at {contacts_file}")
    exit(1)

# Load contacts
df = pd.read_csv(contacts_file)
print(f"Loaded {len(df)} Delhi and New Delhi contacts")

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

def log_email(email, name, status, error=''):
    """Log email sending attempt."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if not os.path.exists(log_file):
        with open(log_file, 'w', newline='', encoding='utf-8') as f:
            f.write('Timestamp,Email,Name,Status,Error\n')
    
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        error_str = error.replace(',', ';')
        f.write(f'{timestamp},{email},{name},{status},{error_str}\n')

def send_email(recipient_email, recipient_name):
    """Send email with proper MIME image attachments."""
    try:
        # Create message with related multipart (for embedded images)
        message = MIMEMultipart('related')
        message['From'] = EMAIL_ADDRESS
        message['To'] = recipient_email
        message['Subject'] = subject
        
        # Multipart alternative for plain text and HTML
        msg_alternative = MIMEMultipart('alternative')
        message.attach(msg_alternative)
        
        # Plain text
        text_part = MIMEText('Rise by Skillboxes - Exclusive event for music artists!', 'plain')
        msg_alternative.attach(text_part)
        
        # HTML
        html_part = MIMEText(html_template, 'html')
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
        
        # Send
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(message)
        server.quit()
        
        log_email(recipient_email, recipient_name, 'Sent')
        return True
        
    except Exception as e:
        error_msg = str(e)
        log_email(recipient_email, recipient_name, 'Failed', error_msg)
        print(f"  ❌ {recipient_email}: {error_msg}")
        return False

def send_to_all():
    """Send emails to all contacts."""
    print("\n" + "="*60)
    print("🎯 SENDING RISE EMAILER TO DELHI CONTACTS")
    print("="*60)
    
    response = input(f"\nAre you sure you want to send to {len(df)} contacts? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Cancelled.")
        return False
    
    sent = 0
    failed = 0
    
    print("\n📧 Starting email campaign...\n")
    
    for idx, row in df.iterrows():
        email = row['email']
        name = row['name']
        
        print(f"[{idx+1}/{len(df)}] Sending to {name}...", end=" ")
        
        if send_email(email, name):
            print("✅")
            sent += 1
        else:
            failed += 1
        
        time.sleep(0.3)  # Rate limiting
    
    print("\n" + "="*60)
    print(f"✅ Campaign Complete!")
    print(f"   Sent: {sent}")
    print(f"   Failed: {failed}")
    print(f"   Log: {log_file}")
    print("="*60)

if __name__ == '__main__':
    send_to_all()
