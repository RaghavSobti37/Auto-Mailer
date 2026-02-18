#!/usr/bin/env python3
"""
Send the new havells_myousic_call_template to test database
"""

import os
import sys
import pandas as pd
from datetime import datetime
import csv
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import smtplib

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.templates import get_havells_myousic_call_template

# --- Setup folders ---
os.makedirs('assets', exist_ok=True)
os.makedirs('data/csv', exist_ok=True)

# --- Email setup ---
load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file.")
    exit(1)

BANNER_PATH = os.path.join('assets', 'Havells_banner.jpg')

def log_email_status(recipient, name, status, error_message=''):
    """Log email send status"""
    log_file = os.path.join('data/csv', 'email_log.csv')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Create file with headers if it doesn't exist
    try:
        with open(log_file, 'x', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Timestamp', 'EmailID', 'Name', 'Status', 'Error'])
    except FileExistsError:
        pass
    
    # Append the log entry
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, recipient, name, status, error_message])

def send_email(email, name, subject, html_body, banner_path=None):
    """Send email with HTML body and optional banner"""
    try:
        msg = MIMEMultipart('related')
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = email.strip()
        msg['Subject'] = subject
        
        # Attach HTML body
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Attach banner if exists
        if banner_path and os.path.exists(banner_path):
            with open(banner_path, 'rb') as attachment:
                img = MIMEImage(attachment.read())
                img.add_header('Content-ID', '<bannerimage>')
                img.add_header('Content-Disposition', 'inline', filename=os.path.basename(banner_path))
                msg.attach(img)
        
        # Send email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        
        return True, None
    except Exception as e:
        return False, str(e)

def send_to_test_db():
    """Send new havells_myousic_call template to test database"""
    
    print("\n" + "=" * 70)
    print("SENDING NEW HAVELLS mYOUsic CALL TEMPLATE TO TEST DATABASE")
    print("=" * 70 + "\n")
    
    # Load test database
    test_csv_path = 'csv/test_leads.csv'
    try:
        test_df = pd.read_csv(test_csv_path)
        print(f"✓ Loaded test database: {len(test_df)} records")
    except FileNotFoundError:
        print(f"ERROR: Test database not found at {test_csv_path}")
        exit(1)
    
    # Ensure havells_myousic_sent column exists
    if 'havells_myousic_sent' not in test_df.columns:
        test_df['havells_myousic_sent'] = False
    
    # Get email template
    subject, html_body = get_havells_myousic_call_template("{name}")
    
    sent_count = 0
    failed_count = 0
    
    print(f"\nSending emails...\n")
    
    for idx, row in test_df.iterrows():
        name = row['name']
        email = row['email'].strip()
        
        # Personalize template with name
        personalized_html = html_body.replace('{name}', name)
        
        # Send email
        success, error = send_email(email, name, subject, personalized_html, BANNER_PATH)
        
        if success:
            print(f"✓ SENT to {name} ({email})")
            test_df.at[idx, 'havells_myousic_sent'] = True
            log_email_status(email, name, 'SENT')
            sent_count += 1
        else:
            print(f"✗ FAILED to {name} ({email}): {error}")
            log_email_status(email, name, 'FAILED', error)
            failed_count += 1
    
    # Save updated test database
    test_df.to_csv(test_csv_path, index=False)
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Successfully Sent:    {sent_count}")
    print(f"Failed:               {failed_count}")
    print(f"Total:                {sent_count + failed_count}")
    print(f"\n✓ Test database updated: {test_csv_path}")
    print("=" * 70 + "\n")

if __name__ == '__main__':
    send_to_test_db()
