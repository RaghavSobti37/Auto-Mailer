#!/usr/bin/env python3
"""
Test Rise Emailer with proper MIME image embedding using Content-ID.
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file")
    exit(1)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(base_dir, 'assets', 'rise-emailer', 'images')

# Create HTML with CID references
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

def send_test_email():
    """Send test email to multiple recipients via BCC (hidden)."""
    try:
        # Test email addresses
        test_emails = [
            'raghavsobti37@gmail.com',
            'harshika@theshakticollective.in',
            'raghavishaan@gmail.com',
            'jrnovagaming@gmail.com'
        ]
        subject = "🎵 Rise by Skillboxes - Exclusive Offer!"
        
        # Create message
        message = MIMEMultipart('related')
        message['From'] = EMAIL_ADDRESS
        message['Subject'] = subject
        # NOTE: Do NOT add 'To' or 'Bcc' headers - keep them completely hidden from recipients
        
        # Alternate part for HTML
        msg_alternative = MIMEMultipart('alternative')
        message.attach(msg_alternative)
        
        # Plain text
        text_part = MIMEText('Rise by Skillboxes - An exclusive event! Check the HTML version.', 'plain')
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
        
        # Send via SMTP - BCC addresses are only passed to server, NOT in message headers
        print(f"📧 Sending test email via BCC to {len(test_emails)} recipients (hidden)...")
        for email in test_emails:
            print(f"   - {email}")
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        # sendmail() takes the BCC addresses but they won't appear in the message
        server.sendmail(EMAIL_ADDRESS, test_emails, message.as_string())
        server.quit()
        
        print(f"\n✅ Test email sent successfully to all recipients!")
        print(f"   Recipients cannot see each other's addresses (BCC is hidden)")
        print(f"\nIf images display correctly in all inboxes, proceed with:")
        print("python scripts/send_delhi_campaign.py")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = send_test_email()
    exit(0 if success else 1)
