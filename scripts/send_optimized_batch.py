#!/usr/bin/env python3
"""
Optimized Email Campaign with Dynamic Batch Templates
- Creates template with recipient slots
- Fills batch dynamically from database
- Sends when batch reaches capacity
- Tracks progress in separate dataset copy
- Original dataset remains unmodified
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
import shutil

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
working_contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts_WORKING.csv')
log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, 'rise_campaign_optimized.csv')

os.makedirs(log_dir, exist_ok=True)

if not os.path.exists(contacts_file):
    print(f"ERROR: Contacts file not found at {contacts_file}")
    exit(1)

# Load original dataset and create working copy
print("📂 Loading database...")
df_original = pd.read_csv(contacts_file)
print(f"✅ Loaded {len(df_original)} Delhi and New Delhi contacts")

# Create working copy with tracking column
if os.path.exists(working_contacts_file):
    print(f"📂 Loading existing working copy...\n")
    df_working = pd.read_csv(working_contacts_file)
else:
    print(f"📋 Creating working copy of database...\n")
    df_working = df_original.copy()
    df_working['email_sent'] = False
    df_working['sent_timestamp'] = pd.NA
    df_working.to_csv(working_contacts_file, index=False)

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
MAX_BATCH_SIZE = 50  # Maximum recipients per email

class EmailBatch:
    """Represents a batch of email recipients."""
    def __init__(self, batch_id):
        self.batch_id = batch_id
        self.recipients = []
        self.indices = []  # Track indices in original dataframe
    
    def add_recipient(self, email, index):
        """Add recipient to batch."""
        self.recipients.append(email)
        self.indices.append(index)
    
    def is_full(self):
        """Check if batch reached max capacity."""
        return len(self.recipients) >= MAX_BATCH_SIZE
    
    def is_empty(self):
        """Check if batch has no recipients."""
        return len(self.recipients) == 0
    
    def __len__(self):
        return len(self.recipients)

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

def send_batch(batch, batch_num):
    """Send email to a batch of recipients and update tracking."""
    try:
        if batch.is_empty():
            return False
        
        message = create_message_with_images()
        
        print(f"[Batch {batch_num}] Sending to {len(batch)} recipients...", end=" ")
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.sendmail(EMAIL_ADDRESS, batch.recipients, message.as_string())
        server.quit()
        
        # Update tracking in working copy
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for idx in batch.indices:
            df_working.at[idx, 'email_sent'] = True
            df_working.at[idx, 'sent_timestamp'] = timestamp
        
        print(f"✅ ({', '.join([email.split('@')[0] for email in batch.recipients[:3]])}...)")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def run_campaign():
    """Run campaign with dynamic batch filling."""
    print("\n" + "="*70)
    print("🎯 OPTIMIZED BATCH CAMPAIGN")
    print("="*70)
    
    total_to_send = len(df_working[df_working['email_sent'] == False])
    sent_so_far = len(df_working[df_working['email_sent'] == True])
    
    print(f"\n📊 Campaign Status:")
    print(f"   Total contacts: {len(df_working)}")
    print(f"   Already sent: {sent_so_far}")
    print(f"   Remaining: {total_to_send}")
    print(f"   Max batch size: {MAX_BATCH_SIZE}")
    
    response = input(f"\nProceed with sending? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Cancelled.")
        return False
    
    print("\n📧 Starting campaign...\n")
    
    batch = EmailBatch(1)
    batch_count = 1
    total_sent = 0
    sent_batches = 0
    
    # Iterate through contacts
    for idx, row in df_working.iterrows():
        # Skip if already sent
        if df_working.at[idx, 'email_sent'] == True:
            continue
        
        email = row['email']
        
        # Add to batch
        batch.add_recipient(email, idx)
        
        # Send when batch is full
        if batch.is_full():
            if send_batch(batch, batch_count):
                total_sent += len(batch)
                sent_batches += 1
            
            # Save progress
            df_working.to_csv(working_contacts_file, index=False)
            
            # Start new batch
            batch = EmailBatch(batch_count + 1)
            batch_count += 1
            
            import time
            time.sleep(1)  # Rate limiting between batches
    
    # Send remaining batch
    if not batch.is_empty():
        if send_batch(batch, batch_count):
            total_sent += len(batch)
            sent_batches += 1
        
        df_working.to_csv(working_contacts_file, index=False)
    
    print("\n" + "="*70)
    print(f"✅ CAMPAIGN COMPLETE!")
    print(f"   Batches sent: {sent_batches}")
    print(f"   Recipients: {total_sent}")
    print(f"   Working copy: {working_contacts_file}")
    print("="*70)
    
    # Show summary stats
    print("\n📈 Summary:")
    sent_count = len(df_working[df_working['email_sent'] == True])
    print(f"   Total sent: {sent_count}/{len(df_working)}")
    if sent_count == len(df_working):
        print(f"   ✅ ALL CONTACTS COMPLETED!")
    
    return True

if __name__ == '__main__':
    try:
        run_campaign()
    except KeyboardInterrupt:
        print("\n\n⛔ Campaign stopped by user.")
        print(f"Progress saved to: {working_contacts_file}")
