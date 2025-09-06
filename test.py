import os
from datetime import datetime
import csv
import pandas as pd
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import smtplib
from PIL import Image
import numpy as np

from params.teaser_template import get_teaser_template
from params.email_template import get_html_template

# --- Setup folders ---
os.makedirs('assets', exist_ok=True)
os.makedirs('csv', exist_ok=True)

# --- Create pixel.png if not exists (optional, can be removed if not needed) ---
pixel_path = os.path.join('assets', 'pixel.png')
if not os.path.exists(pixel_path):
    img = Image.fromarray(np.zeros((1, 1, 4), dtype=np.uint8))
    img.save(pixel_path, 'PNG')

# --- Email sending ---
load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
BANNER_PATH = os.path.join('assets', 'banner.jpg')

def log_email_status(recipient, name, status, error_message=''):
    log_file = os.path.join('csv', 'email_log.csv')
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

def choose_params():
    print("Choose which mail to send:")
    print("1. Teaser Mail")
    print("2. Main Campaign Mail")
    choice = input("Enter 1 or 2: ").strip()
    if choice == "1":
        import params.teaser_params as params
        template_func = get_teaser_template
    elif choice == "2":
        import params.main_params as params
        template_func = get_html_template
    else:
        print("Invalid choice. Exiting.")
        exit(1)
    return params, template_func

def confirm_dataset(csv_path):
    """
    Loads the dataset, filters it to include only non-promo contacts,
    and asks the user for confirmation before proceeding.
    """
    try:
        print(f"\nLoading dataset from: {csv_path}")
        full_df = pd.read_csv(csv_path)
        print(f"Total records found in the source file: {len(full_df)}")
    except FileNotFoundError:
        print(f"ERROR: The file '{csv_path}' was not found.")
        print("Please check the path in your params file and ensure 'master_db.csv' exists.")
        exit(1)

    # --- Filter for non-promo contacts ---
    # This is the key change: it selects only rows where 'havells promo' is False.
    # .fillna(False) ensures that any blank cells in that column are treated as False.
    df = full_df[full_df['havells promo'].fillna(False) == False].copy()

    if df.empty:
        print("\nNo contacts to email after filtering. All contacts were on the promo list or the file is empty.")
        exit(0)

    print(f"\nTotal emails to be sent (non-promo only): {len(df)}")
    print("Sample of contacts to be emailed:")
    print(df.head())
    confirm = input("Proceed with this dataset? (y/n): ").strip().lower()
    if confirm != "y":
        print("Aborted by user.")
        exit(0)
    return df

def send_emails(params, template_func, df_to_send, full_df):
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    for idx, row in df_to_send.iterrows():
        recipient = row['email']
        name = row['name']
        html_body = template_func(name, params.FORM_LINK)
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = recipient
        msg['Subject'] = params.SUBJECT
        msg['X-Priority'] = '1'
        msg['Importance'] = 'High'
        msg.attach(MIMEText(html_body, 'html'))
        # Attach banner image only if INCLUDE_BANNER is True
        if getattr(params, "INCLUDE_BANNER", False):
            with open(BANNER_PATH, 'rb') as f:
                img = MIMEImage(f.read())
                img.add_header('Content-ID', '<bannerimage>')
                img.add_header('Content-Disposition', 'inline', filename='banner.jpg')
                msg.attach(img)
        try:
            server.sendmail(EMAIL_ADDRESS, recipient, msg.as_string())
            print(f"Email sent to {recipient} ({name})")
            log_email_status(recipient, name, 'SENT')
            # --- Update the 'havells promo' status in the main DataFrame ---
            # Use .loc to find the row by index and set the column value
            full_df.loc[idx, 'havells promo'] = True
        except Exception as e:
            print(f"Failed to send email to {recipient}: {e}")
            log_email_status(recipient, name, 'FAILED', str(e))
    server.quit()
    return full_df

if __name__ == '__main__':
    params, template_func = choose_params()
    # Load the full dataset first
    try:
        main_df = pd.read_csv(params.CSV_PATH)
    except FileNotFoundError:
        print(f"ERROR: The file '{params.CSV_PATH}' was not found. Exiting.")
        exit(1)
    df_to_send = confirm_dataset(params.CSV_PATH)
    updated_df = send_emails(params, template_func, df_to_send, main_df)
    updated_df.to_csv(params.CSV_PATH, index=False)
    print(f"\nSuccessfully updated '{params.CSV_PATH}' with the new email statuses.")
    print("All emails processed.")
