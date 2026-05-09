import os
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import argparse
import sys

def send_reminder(mode="test"):
    load_dotenv()
    EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
    EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        print("Error: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env")
        return

    subject = "🔴 REMINDER: TSC Academy Artist Path Meetup is LIVE!"
    zoom_link = "https://us06web.zoom.us/j/86585081023"
    
    # Email content template
    def get_html_body(name):
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #e67e22;">Quick Reminder!</h2>
                <p>Hi <strong>{name}</strong>,</p>
                <p>The <strong>TSC Academy Artist Path Meetup</strong> has started! We are live right now.</p>
                <p style="font-size: 1.1em;">
                    <strong>Live Webinar:</strong><br>
                    <a href="{zoom_link}" style="display: inline-block; padding: 10px 20px; background-color: #e67e22; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">Join Zoom Live Now</a>
                </p>
                <p>
                    <strong>Details:</strong><br>
                    Time: Started at 5:00 PM (IST) Today, 2026-05-09<br>
                    Event: Live Webinar
                </p>
                <p>See you in the session!</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 0.8em; color: #777;">TSC Academy | Artist Path</p>
            </div>
        </body>
        </html>
        """

    def get_text_body(name):
        return f"""
Hi {name},

TSC Academy Artist Path Meetup is starting now!

Join us live for the Webinar:
Zoom Link: {zoom_link}

Started at 5:00 PM (IST) Today, 2026-05-09.

See you there!

TSC Academy
        """

    if mode == "test":
        recipients = [("Raghav Raj Sobti", "raghavsobti37@gmail.com")]
        print(f"Running in TEST mode. Sending to: {recipients[0][1]}")
    else:
        csv_path = "Listing Customers (1).csv"
        if not os.path.exists(csv_path):
            print(f"Error: {csv_path} not found.")
            return
        df = pd.read_csv(csv_path)
        # Assuming column 0 is Name and column 1 is Email based on previous view_file
        recipients = list(zip(df.iloc[:, 0], df.iloc[:, 1]))
        print(f"Running in PROD mode. Total recipients: {len(recipients)}")

    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)

    for name, email in recipients:
        try:
            msg = MIMEMultipart("alternative")
            msg['From'] = EMAIL_ADDRESS
            msg['To'] = email
            msg['Subject'] = subject
            msg['X-Priority'] = '1'
            msg['Importance'] = 'High'

            text_part = MIMEText(get_text_body(name), "plain")
            html_part = MIMEText(get_html_body(name), "html")
            msg.attach(text_part)
            msg.attach(html_part)

            server.sendmail(EMAIL_ADDRESS, email, msg.as_string())
            print(f"Sent to: {email} ({name})")
        except Exception as e:
            print(f"Failed to send to {email}: {e}")

    server.quit()
    print("Process complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["test", "prod"], default="test")
    args = parser.parse_args()
    send_reminder(args.mode)
