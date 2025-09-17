import pandas as pd
import os
from datetime import datetime

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DB_PATH = os.path.join(BASE_DIR, 'csv', 'master_db_updated.csv')
EMAIL_LOG_PATH = os.path.join(BASE_DIR, 'csv', 'email_log.csv')
CAMPAIGN_COLUMN = 'havells promo'

def show_email_campaign_progress():
    """
    Reads the master database and email log to generate a consolidated
    progress report for the email campaign.
    """
    print("\n--- Email Campaign Progress Report ---")

    # --- 1. Load Master Database ---
    if not os.path.exists(MASTER_DB_PATH):
        print(f"\n❌ Error: Master data file not found at '{MASTER_DB_PATH}'")
        print("Please ensure the cleaned master database exists to generate a report.")
        return

    try:
        df_master = pd.read_csv(MASTER_DB_PATH)
        total_contacts = len(df_master)
        if total_contacts == 0:
            print("\n🟡 Master database is empty. No progress to report.")
            return
    except Exception as e:
        print(f"\n❌ Error reading master data file: {e}")
        return

    # --- 2. Load and Process Email Log ---
    sent_emails = set()
    failed_emails = set()
    daily_counts = {}
    total_sent_from_log = 0
    total_failed_from_log = 0

    if os.path.exists(EMAIL_LOG_PATH):
        try:
            df_log = pd.read_csv(EMAIL_LOG_PATH)
            if 'Timestamp' in df_log.columns and 'Status' in df_log.columns and 'EmailID' in df_log.columns:
                # Filter for SENT and FAILED statuses, dropping duplicates to count unique emails
                sent_df = df_log[df_log['Status'].str.upper() == 'SENT'].drop_duplicates(subset=['EmailID'])
                failed_df = df_log[df_log['Status'].str.upper() == 'FAILED'].drop_duplicates(subset=['EmailID'])

                sent_emails = set(sent_df['EmailID'])
                # Exclude emails that were successfully sent later from the failed set
                failed_emails = set(failed_df['EmailID']) - sent_emails

                total_sent_from_log = len(sent_emails)
                total_failed_from_log = len(failed_emails)

                # Calculate daily breakdown
                sent_df['send_date'] = pd.to_datetime(sent_df['Timestamp']).dt.date
                daily_counts = sent_df.groupby('send_date').size()
            else:
                print(f"\n🟡 Warning: Log file '{os.path.basename(EMAIL_LOG_PATH)}' is missing required columns ('Timestamp', 'Status', 'EmailID').")
        except Exception as e:
            print(f"\n🟡 Warning: Could not process email log file: {e}")
    else:
        print(f"\n🟡 Info: Email log file not found at '{EMAIL_LOG_PATH}'. Stats will be based on the master file only.")


    # --- 3. Generate and Display Report ---
    remaining_to_send = total_contacts - total_sent_from_log

    print(f"\n📊 Overall Campaign Stats (based on '{os.path.basename(MASTER_DB_PATH)}' and logs):\n")
    print(f"  - Total Contacts in Master List: {total_contacts}")
    print(f"  - Unique Emails Sent Successfully: {total_sent_from_log} ✅")
    print(f"  - Unique Emails Failed:          {total_failed_from_log} ❌")
    print(f"  - Remaining to Send:             {remaining_to_send} ⏳")

    # --- Progress Bar ---
    if total_contacts > 0:
        percentage_complete = (total_sent_from_log / total_contacts) * 100
        print(f"\n  - Campaign Completion:           {percentage_complete:.2f}%")
        
        bar_length = 30
        filled_length = int(bar_length * total_sent_from_log // total_contacts)
        bar = '█' * filled_length + '-' * (bar_length - filled_length)
        print(f"    [{bar}]")

    # --- Daily Breakdown ---
    if not daily_counts.empty:
        print("\n\n📈 Daily Send Breakdown (most recent first):")
        for date, count in daily_counts.sort_index(ascending=False).items():
            print(f"  - {date.strftime('%Y-%m-%d')}:  {count} emails")

    print("\n-------------------------------------------")


if __name__ == "__main__":
    show_email_campaign_progress()

