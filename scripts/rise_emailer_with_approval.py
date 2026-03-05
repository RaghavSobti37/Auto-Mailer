#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RISE EMAILER - Campaign with Test & Approval Workflow
Complete unified template with test-first approval process
- Test emails with your account first
- Review logs and results
- Approve before sending to full database (429 contacts)
"""

import os
import sys
import io
import smtplib
import pandas as pd
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
from dotenv import load_dotenv
import time

# Set UTF-8 encoding for Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ==================== CONFIGURATION ====================
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    exit(1)

# Paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(base_dir, 'assets', 'rise-emailer', 'images')
contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts.csv')
working_contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_and_New_Delhi_Contacts_WORKING.csv')
test_contacts_file = os.path.join(base_dir, 'data', 'exports', 'Delhi_Test_Contacts.csv')
log_dir = os.path.join(base_dir, 'logs')
log_file = os.path.join(log_dir, 'rise_campaign_approval.log')

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
    
    def get_stats(self):
        """Get campaign statistics."""
        total = len(self.df_working)
        sent = len(self.df_working[self.df_working['email_sent'] == True])
        remaining = total - sent
        return {'total': total, 'sent': sent, 'remaining': remaining}


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
            print(f"   [ERROR] Send error: {str(e)}")
            return False


class ApprovalWorkflow:
    """Orchestrates test-and-approval workflow."""
    
    def __init__(self):
        self.db = DatabaseManager(contacts_file, working_contacts_file)
        self.stats = {}
    
    def display_banner(self):
        """Display workflow banner."""
        print("\n" + "="*70)
        print("[WORKFLOW] RISE EMAILER - TEST & APPROVAL CAMPAIGN")
        print("="*70)
        print("Step 1: Test with your emails")
        print("Step 2: Review test results")
        print("Step 3: Get your approval")
        print("Step 4: Send to all 429 Delhi contacts")
        print("="*70 + "\n")
    
    def step_1_test_emails(self):
        """Send test emails to user's test contacts."""
        print("[STEP 1] TESTING WITH YOUR EMAILS")
        print("-" * 70)
        
        if not os.path.exists(test_contacts_file):
            print("[ERROR] Test contacts file not found!")
            return False
        
        df_test = pd.read_csv(test_contacts_file)
        print(f"[INFO] Found {len(df_test)} test contacts:")
        for idx, row in df_test.iterrows():
            print(f"  - {row['name']} ({row['email']})")
        
        print("\n[ACTION] Sending test emails...")
        sent = 0
        failed = 0
        
        for idx, row in df_test.iterrows():
            email = row['email']
            name = row['name']
            
            print(f"  [{idx+1}/{len(df_test)}] Sending to {name}...", end=" ")
            
            batch = EmailBatch(1)
            batch.add(email, idx)
            
            if EmailSender.send(batch):
                print("[OK]")
                sent += 1
            else:
                print("[FAIL]")
                failed += 1
            
            time.sleep(1)
        
        print("\n" + "-" * 70)
        print(f"[RESULT] Test emails: {sent} sent, {failed} failed")
        print(f"[NEXT] Check your emails and review the content")
        print("-" * 70 + "\n")
        
        return True
    
    def step_2_approve(self):
        """Get user approval before full campaign."""
        print("[STEP 2] APPROVAL REQUIRED")
        print("-" * 70)
        
        print("\n[REVIEW] Did the test emails look correct and display properly?")
        print("  - Images visible?")
        print("  - Formatting correct?")
        print("  - All content shows properly?")
        
        self.db.load()
        self.stats = self.db.get_stats()
        
        print("\n[CAMPAIGN DETAILS]")
        print(f"  Target: Delhi & New Delhi")
        print(f"  Total contacts: {self.stats['total']}")
        print(f"  Already sent: {self.stats['sent']}")
        print(f"  Ready to send: {self.stats['remaining']}")
        print(f"  Batch size: {MAX_BATCH_SIZE}")
        print(f"  Estimated batches: {(self.stats['remaining'] + MAX_BATCH_SIZE - 1) // MAX_BATCH_SIZE}")
        
        print("\n[APPROVAL] Type 'yes' to proceed with full campaign")
        print("           Type 'no' to cancel")
        
        response = input("\n>>> ").strip().lower()
        print()
        
        return response == 'yes'
    
    def step_3_send_campaign(self):
        """Send campaign to all unsent contacts."""
        print("[STEP 3] SENDING TO ALL 429 DELHI CONTACTS")
        print("="*70)
        
        batch = EmailBatch(1)
        batch_count = 1
        total_sent = 0
        sent_batches = 0
        
        # Iterate through unsent contacts
        for idx, row in self.db.get_unsent_contacts().iterrows():
            email = row['email']
            
            # Add to batch
            batch.add(email, idx)
            
            # Send when full
            if batch.is_full():
                print(f"[BATCH {batch_count}] Sending {len(batch)} recipients...", end=" ")
                
                if EmailSender.send(batch):
                    self.db.mark_sent(batch.indices)
                    total_sent += len(batch)
                    sent_batches += 1
                    print("[OK]")
                else:
                    print("[FAIL]")
                
                # Start new batch
                batch = EmailBatch(batch_count + 1)
                batch_count += 1
                time.sleep(1)
        
        # Send remaining batch
        if not batch.is_empty():
            print(f"[BATCH {batch_count}] Sending {len(batch)} recipients...", end=" ")
            
            if EmailSender.send(batch):
                self.db.mark_sent(batch.indices)
                total_sent += len(batch)
                sent_batches += 1
                print("[OK]")
            else:
                print("[FAIL]")
        
        final_stats = self.db.get_stats()
        
        print("\n" + "="*70)
        print("[COMPLETE] CAMPAIGN FINISHED!")
        print("="*70)
        print(f"[RESULTS]")
        print(f"  Batches sent: {sent_batches}")
        print(f"  Total recipients: {total_sent}")
        print(f"  Overall progress: {final_stats['sent']}/{final_stats['total']} sent")
        
        if final_stats['remaining'] == 0:
            print(f"\n[SUCCESS] ALL CONTACTS COMPLETED!")
        else:
            print(f"\n[INFO] {final_stats['remaining']} contacts remaining for next run")
        
        print(f"\n[FILES]")
        print(f"  Working copy: {working_contacts_file}")
        print(f"  Log file: {log_file}")
        print("="*70 + "\n")
    
    def run(self):
        """Execute complete approval workflow."""
        self.display_banner()
        
        # Step 1: Test
        if not self.step_1_test_emails():
            print("[ABORT] Test failed. Exiting.")
            return False
        
        input("Press Enter after reviewing test emails...")
        
        # Step 2: Approval
        if not self.step_2_approve():
            print("[CANCELLED] Campaign cancelled by user.")
            return False
        
        # Step 3: Send
        self.step_3_send_campaign()
        
        return True


# ==================== MAIN EXECUTION ====================

def main():
    """Main entry point."""
    try:
        workflow = ApprovalWorkflow()
        workflow.run()
    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Campaign interrupted by user.")
        print(f"Progress saved to: {working_contacts_file}")
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
