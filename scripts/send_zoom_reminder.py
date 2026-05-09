import os
import sys
import pandas as pd
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Add parent directory to path for imports if needed
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def send_zoom_reminder(recipient_email, recipient_name, smtp_user, smtp_pass):
    """Sends the Zoom reminder email to a single recipient."""
    
    # Read the template
    template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 'assets', 'email_templates', 'zoom_reminder.html')
    
    with open(template_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Replace placeholders
    html_content = html_content.replace('{{name}}', recipient_name)
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = f"The Shakti Collective <{smtp_user}>"
    msg['To'] = recipient_email
    msg['Subject'] = "Join Zoom Meeting: Artist Path & Journey Session"
    msg['X-Priority'] = '1'
    msg['Importance'] = 'High'
    
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        # Using Gmail SMTP as per existing codebase logic
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, recipient_email, msg.as_string())
        server.quit()
        print(f"Success: Email sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"Error sending to {recipient_email}: {e}")
        return False

def main():
    load_dotenv()
    smtp_user = os.getenv('EMAIL_ADDRESS')
    smtp_pass = os.getenv('EMAIL_PASSWORD')
    
    if not smtp_user or not smtp_pass:
        print("Error: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env")
        return

    # Check for command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == '--all':
        # Send to everyone in the CSV
        csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                'data', 'Listing Customers.csv')
        
        print(f"Reading dataset from {csv_path}...")
        try:
            df = pd.read_csv(csv_path)
            # Filter rows where Name and Email are present
            df = df.dropna(subset=['Name', 'Email'])
            
            # Deduplicate by Email to avoid spamming
            initial_count = len(df)
            df = df.drop_duplicates(subset=['Email'])
            dedup_count = len(df)
            
            if initial_count != dedup_count:
                print(f"Removed {initial_count - dedup_count} duplicate emails.")
            
            total = len(df)
            print(f"Found {total} unique recipients. Starting broadcast...")
            
            confirm = input(f"Are you sure you want to send to {total} people? (y/n): ")
            if confirm.lower() != 'y':
                print("Aborted.")
                return
            
            success_count = 0
            for idx, row in df.iterrows():
                if send_zoom_reminder(row['Email'], row['Name'], smtp_user, smtp_pass):
                    success_count += 1
            
            print(f"\nBroadcast complete. {success_count}/{total} emails sent successfully.")
            
        except Exception as e:
            print(f"Error reading CSV: {e}")
    else:
        # Default: Send test email
        test_email = "raghavsobti37@gmail.com"
        test_name = "Raghav"
        print(f"Sending test email to {test_email}...")
        send_zoom_reminder(test_email, test_name, smtp_user, smtp_pass)
        print("\nTo send to the full dataset, run: python scripts/send_zoom_reminder.py --all")

if __name__ == "__main__":
    main()
