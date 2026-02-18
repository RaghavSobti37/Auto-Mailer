import os
import sys
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
import csv
from dotenv import load_dotenv

# --- Setup Paths ---
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from src.templates import get_html_template

# --- Configuration ---
CSV_PATH = r"C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\data\csv\Artist Contacts for Havells Myousic - Artist Bank.csv"
FORM_LINK = "https://havellsmyousic.com/participate"
SUBJECT = "Turn Up the Volume on Your Dreams"
BANNER_PATH = os.path.join(current_dir, 'assets', 'Havells_banner.jpg')
LOG_FILE = os.path.join(current_dir, 'data', 'csv', 'email_log.csv')
PROMO_COL = 'main_campaign_sent'

# --- Load Credentials ---
load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("❌ Error: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file.")
    sys.exit(1)

def log_status(email, name, status, error=''):
    """Logs email status to the central log file."""
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['Timestamp', 'EmailID', 'Name', 'Status', 'Error'])
        writer.writerow([datetime.now().strftime('%Y-%m-%d %H:%M:%S'), email, name, status, error])

def main():
    print(f"\n📂 Loading Data from: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"❌ File not found: {CSV_PATH}")
        return

    df = pd.read_csv(CSV_PATH)
    
    # Normalize headers to find columns easily
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Identify Name and Email columns
    name_col = next((c for c in df.columns if 'name' in c and 'file' not in c), None)
    email_col = next((c for c in df.columns if 'email' in c), None)
    
    if not name_col or not email_col:
        print(f"❌ Could not automatically identify Name and Email columns.")
        print(f"   Found columns: {list(df.columns)}")
        return
        
    print(f"✅ Mapped Columns: Name='{name_col}', Email='{email_col}'")
    
    # Initialize tracking column if not present
    if PROMO_COL not in df.columns:
        df[PROMO_COL] = False
        
    # Filter for valid emails that haven't been sent yet
    to_send = df[
        (df[email_col].notna()) & 
        (df[email_col].str.contains('@')) & 
        (df[PROMO_COL].fillna(False) == False)
    ].copy()
    
    print(f"📊 Total Records: {len(df)}")
    print(f"📧 Emails to Send: {len(to_send)}")
    
    if to_send.empty:
        print("🎉 No pending emails to send.")
        return

    print("\nPreview of recipients:")
    print(to_send[[name_col, email_col]].head())
    
    if input("\n🚀 Proceed with sending? (y/n): ").lower() != 'y':
        print("Cancelled.")
        return

    # Connect to SMTP
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)

    count = 0
    for idx, row in to_send.iterrows():
        name = row[name_col]
        email = row[email_col]
        
        try:
            # Generate Email Content
            html_body = get_html_template(name=name, FORM_LINK=FORM_LINK)
            
            msg = MIMEMultipart()
            msg['From'] = EMAIL_ADDRESS
            msg['To'] = email
            msg['Subject'] = SUBJECT
            msg.attach(MIMEText(html_body, 'html'))
            
            # Attach Banner
            if os.path.exists(BANNER_PATH):
                with open(BANNER_PATH, 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-ID', '<bannerimage>')
                    img.add_header('Content-Disposition', 'inline', filename='banner.jpg')
                    msg.attach(img)
            
            server.sendmail(EMAIL_ADDRESS, email, msg.as_string())
            print(f"✅ Sent to: {email}")
            log_status(email, name, 'SENT')
            
            # Update DataFrame
            df.at[idx, PROMO_COL] = True
            count += 1
            
        except Exception as e:
            print(f"❌ Failed to send to {email}: {e}")
            log_status(email, name, 'FAILED', str(e))

    server.quit()
    
    # Save updated CSV
    df.to_csv(CSV_PATH, index=False)
    print(f"\n🏁 Campaign Complete. Sent {count} emails.")
    print(f"💾 Updated CSV saved to: {CSV_PATH}")

if __name__ == "__main__":
    main()