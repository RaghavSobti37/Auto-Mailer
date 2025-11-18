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

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file.")
    print("Please create a .env file in the Auto-Mailer directory with the following content:")
    print("EMAIL_ADDRESS=your_email@example.com")
    print("EMAIL_PASSWORD=your_password")
    exit(1)

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
    print("3. IML Promo Mail")
    choice = input("Enter 1, 2, or 3: ").strip()
    if choice == "1":
        import params.teaser_params as params
        from params.teaser_template import get_teaser_template
        template_func = get_teaser_template
        promo_column = 'havells promo'
    elif choice == "2":
        import params.main_params as params
        import importlib
        template_module = importlib.import_module(f"params.{params.TEMPLATE_MODULE}")
        template_func = getattr(template_module, params.TEMPLATE_FUNC)
        promo_column = 'havells promo'
    elif choice == "3":
        import params.main_params as params
        import importlib
        template_module = importlib.import_module(f"params.{params.TEMPLATE_MODULE}")
        template_func = getattr(template_module, params.TEMPLATE_FUNC)
        promo_column = 'iml promo'
    else:
        print("Invalid choice. Exiting.")
        exit(1)
    return params, template_func, promo_column

def confirm_dataset(csv_path, promo_column):
    """
    Loads the dataset, filters it to include only non-promo contacts,
    and asks the user for confirmation before proceeding.
    Attaches the full dataframe to the filtered dataframe for later use.
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
    # This is the key change: it selects only rows where the specified promo column is False.
    # .fillna(False) ensures that any blank cells in that column are treated as False.
    if promo_column not in full_df.columns:
        full_df[promo_column] = False
    df = full_df[full_df[promo_column].fillna(False) == False].copy()

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
    
    # Attach the full dataframe to the filtered one for easy access later
    df.attrs['full_df'] = full_df
    return df

def send_emails(params, template_func, df_to_send, full_df, promo_column):
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    for idx, row in df_to_send.iterrows():
        recipient = row['email']
        name = row['name']
        
        # Check if the template function requires FORM_LINK
        import inspect
        sig = inspect.signature(template_func)
        if 'FORM_LINK' in sig.parameters:
            html_body = template_func(name, params.FORM_LINK)
        else:
            html_body = template_func(name)

        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = recipient
        msg['Subject'] = params.SUBJECT
        msg['X-Priority'] = '1'
        msg['Importance'] = 'High'
        msg.attach(MIMEText(html_body, 'html'))
        # Attach banner image only if INCLUDE_BANNER is True
        if getattr(params, "INCLUDE_BANNER", False):
            banner_path = getattr(params, "BANNER_PATH", BANNER_PATH)
            with open(banner_path, 'rb') as f:
                img = MIMEImage(f.read())
                img.add_header('Content-ID', '<bannerimage>')
                img.add_header('Content-Disposition', 'inline', filename='banner.jpg')
                msg.attach(img)
        try:
            server.sendmail(EMAIL_ADDRESS, recipient, msg.as_string())
            print(f"Email sent to {recipient} ({name})")
            log_email_status(recipient, name, 'SENT')
            # --- Update the promo status in the main DataFrame ---
            # Use .loc to find the row by index and set the column value
            full_df.loc[idx, promo_column] = True
        except Exception as e:
            print(f"Failed to send email to {recipient}: {e}")
            log_email_status(recipient, name, 'FAILED', str(e))
    server.quit()
    return full_df

def update_db_from_log(df, log_path, promo_column):
    """
    Retroactively updates the DataFrame based on the email log.
    This ensures any previously sent emails are marked as promo=True.
    """
    try:
        if not os.path.exists(log_path):
            print(f"\nLog file '{log_path}' not found. Skipping log-based update.")
            return df

        log_df = pd.read_csv(log_path)
        # Get unique emails that were successfully sent
        sent_emails = log_df[log_df['Status'] == 'SENT']['EmailID'].unique()

        # Update the specified promo column for emails found in the log
        if promo_column not in df.columns:
            df[promo_column] = False
        initial_true_count = df[promo_column].sum()
        df.loc[df['email'].isin(sent_emails), promo_column] = True
        final_true_count = df[promo_column].sum()

        print(f"\nUpdated {final_true_count - initial_true_count} additional records based on '{log_path}'.")
        return df
    except Exception as e:
        print(f"Could not update from log file due to an error: {e}")
        return df

if __name__ == '__main__':
    params, template_func, promo_column = choose_params()
    
    df_to_send = confirm_dataset(params.CSV_PATH, promo_column)
    # The confirm_dataset function now returns the full dataframe and the filtered one
    full_df = df_to_send.attrs['full_df']
    
    updated_df = send_emails(params, template_func, df_to_send, full_df, promo_column)
    
    # Now, run the update from the log file as a final check
    log_file_path = os.path.join('csv', 'email_log.csv')
    final_df = update_db_from_log(updated_df, log_file_path, promo_column)
    
    # Save the final, fully updated dataframe
    final_df.to_csv(params.CSV_PATH, index=False)
    print(f"\nSuccessfully updated '{params.CSV_PATH}' with the new email statuses.")
    print("All emails processed.")
