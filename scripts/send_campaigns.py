#!/usr/bin/env python3
"""
Main email campaign execution script.

Allows selection of different email campaigns and sends emails to the target list.
"""

import os
import sys
import pandas as pd
from dotenv import load_dotenv
from PIL import Image
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.email_service import send_emails, log_email_status
from src.templates import (
    get_teaser_template,
    get_html_template,
    get_iml_reminder_template,
    get_final_call_template,
    get_masterclass_template
)
from config.campaigns import (
    TeaserParams,
    MainParams,
    IMLPromoParams,
    IMLReminderParams,
    IMLFinalCallParams,
    MasterclassParams
)

# --- Setup folders ---
# Define project structure paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
log_dir = os.path.join(base_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)
os.makedirs('assets', exist_ok=True)

# --- Logging setup ---
log_file_path = os.path.join(log_dir, 'email_log.csv')
activity_log_path = os.path.join(log_dir, 'activity.log')

def log_message(message):
    with open(activity_log_path, 'a') as f:
        f.write(f"{pd.Timestamp.now()}: {message}\n")
    print(message)

# --- Create pixel.png if not exists (optional) ---
pixel_path = os.path.join('assets', 'pixel.png')
if not os.path.exists(pixel_path):
    img = Image.fromarray(np.zeros((1, 1, 4), dtype=np.uint8))
    img.save(pixel_path, 'PNG')

# --- Email setup ---
load_dotenv()
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    log_message("ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file.")
    log_message("Please create a .env file in the Auto-Mailer directory with the following content:")
    log_message("EMAIL_ADDRESS=your_email@example.com")
    log_message("EMAIL_PASSWORD=your_password")
    exit(1)


def choose_campaign():
    """Let user choose which email campaign to run."""
    log_message("\n--- Select Email Campaign ---")
    log_message("1. Teaser Mail")
    log_message("2. Main Campaign Mail")
    log_message("3. IML Promo Mail")
    log_message("4. IML Submission Reminder")
    log_message("5. IML Final Call")
    log_message("6. Masterclass Ad")
    
    choice = input("\nEnter 1, 2, 3, 4, 5, or 6: ").strip()
    
    campaigns = {
        "1": (TeaserParams(), get_teaser_template, 'havells promo'),
        "2": (MainParams(), get_html_template, 'havells promo'),
        "3": (IMLPromoParams(), get_html_template, 'iml promo'),
        "4": (IMLReminderParams(), get_iml_reminder_template, 'reminder_sent'),
        "5": (IMLFinalCallParams(), get_final_call_template, 'final_call_sent'),
        "6": (MasterclassParams(), get_masterclass_template, 'masterclass_ad_sent'),
    }
    
    if choice not in campaigns:
        log_message("Invalid choice. Exiting.")
        exit(1)
    
    return campaigns[choice]


def confirm_dataset(csv_path, promo_column):
    """
    Load dataset, filter non-promo contacts, and request confirmation.
    """
    try:
        log_message(f"\nLoading dataset from: {csv_path}")
        # Use index_col=False to prevent index inference issues
        try:
            full_df = pd.read_csv(csv_path, index_col=False)
        except pd.errors.ParserError:
            log_message("⚠️ CSV Parsing Error: The file contains rows with extra fields (likely unquoted commas).")
            log_message("   Attempting to read with more lenient settings (engine='python')...")
            full_df = pd.read_csv(csv_path, index_col=False, engine='python', on_bad_lines='warn')
        
        if 'Unnamed: 0' in full_df.columns:
            full_df.drop(columns=['Unnamed: 0'], inplace=True)
            
        # Standardize column names
        full_df.rename(columns={'Email': 'email', 'Name': 'name'}, inplace=True)
        log_message(f"Total records found in the source file: {len(full_df)}")
    except FileNotFoundError:
        log_message(f"ERROR: The file '{csv_path}' was not found.")
        log_message("Please ensure the CSV file exists.")
        exit(1)

    # Filter for non-promo contacts
    if promo_column not in full_df.columns:
        full_df[promo_column] = False
    
    df = full_df[full_df[promo_column].fillna(False) == False].copy()

    if df.empty:
        log_message("\nNo contacts to email after filtering. All contacts were already emailed.")
        exit(0)

    log_message(f"\nTotal emails to be sent (non-promo only): {len(df)}")
    log_message("Sample of contacts to be emailed:")
    log_message(df.head())
    
    confirm = input("\nProceed with this dataset? (y/n): ").strip().lower()
    if confirm != "y":
        log_message("Aborted by user.")
        exit(0)
    
    df.attrs['full_df'] = full_df
    return df


def update_db_from_log(df, log_path, promo_column):
    """
    Update DataFrame based on email log, marking previously sent emails.
    """
    try:
        if not os.path.exists(log_path):
            log_message(f"\nLog file '{log_path}' not found. Skipping log-based update.")
            return df

        log_df = pd.read_csv(log_path)
        sent_emails = log_df[log_df['Status'] == 'SENT']['EmailID'].unique()

        if promo_column not in df.columns:
            df[promo_column] = False
        
        initial_true_count = df[promo_column].sum()
        df.loc[df['email'].isin(sent_emails), promo_column] = True
        final_true_count = df[promo_column].sum()

        log_message(f"\nUpdated {final_true_count - initial_true_count} additional records based on log.")
        return df
    except Exception as e:
        log_message(f"Could not update from log file: {e}")
        return df


if __name__ == '__main__':
    params, template_func, promo_column = choose_campaign()
    
    df_to_send = confirm_dataset(params.CSV_PATH, promo_column)
    full_df = df_to_send.attrs['full_df']
    
    updated_df = send_emails(EMAIL_ADDRESS, EMAIL_PASSWORD, params, template_func, df_to_send, full_df, promo_column, log_file=log_file_path)
    
    # Update from log as final check
    final_df = update_db_from_log(updated_df, log_file_path, promo_column)
    
    # Save updated database
    final_df.to_csv(params.CSV_PATH, index=False)
    log_message(f"\nSuccessfully updated '{params.CSV_PATH}' with new email statuses.")
    log_message("All emails processed.")
