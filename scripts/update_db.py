#!/usr/bin/env python3
"""
Database update script based on email log.

Updates the master database with email sending status from the log.
"""

import os
import argparse
import pandas as pd

DATA_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'csv')


def update_master_db_from_log(campaign_column: str = 'havells promo'):
    """
    Update the master database based on the email log.

    Marks emails as sent in the specified `campaign_column` if they appear
    in the log with `Status == 'SENT'`.

    Args:
        campaign_column: Column name to set to True for sent emails.
    """
    log_file_path = os.path.join(DATA_FOLDER, 'email_log.csv')
    master_db_path = os.path.join(DATA_FOLDER, 'master_db_cleaned.csv')
    updated_db_path = os.path.join(DATA_FOLDER, 'master_db_updated.csv')

    try:
        # Read the log file
        log_df = pd.read_csv(log_file_path)
        if 'Status' not in log_df.columns or 'EmailID' not in log_df.columns:
            print(f"Log file '{log_file_path}' missing required columns ('Status','EmailID'). Aborting.")
            return

        sent_emails = log_df[log_df['Status'].str.upper() == 'SENT']['EmailID'].unique()
        print(f"Found {len(sent_emails)} unique emails with 'SENT' status in the log.")

        # Read the master database
        master_df = pd.read_csv(master_db_path)
        print(f"Loaded {len(master_df)} records from '{master_db_path}'.")

        # Ensure campaign column exists and is boolean-like
        if campaign_column not in master_df.columns:
            master_df[campaign_column] = False

        # Update the campaign column for all sent emails
        before_count = master_df[campaign_column].sum()
        master_df.loc[master_df['email'].isin(sent_emails), campaign_column] = True
        after_count = master_df[campaign_column].sum()
        print(f"Updated {after_count - before_count} records setting '{campaign_column}'=True.")

        # Remove unnecessary columns if they exist
        if 'whatsapp havells' in master_df.columns:
            master_df.drop(columns=['whatsapp havells'], inplace=True)
            print("Removed 'whatsapp havells' column.")

        # Save the updated database
        master_df.to_csv(updated_db_path, index=False)
        print(f"\nSuccessfully updated the database.")
        print(f"Saved to: {os.path.abspath(updated_db_path)}")

    except FileNotFoundError as e:
        print(f"ERROR: Could not find a required file.\n{e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Update master DB from email log')
    parser.add_argument('--column', '-c', help="Campaign column to update (default: 'havells promo')", default='havells promo')
    args = parser.parse_args()
    update_master_db_from_log(campaign_column=args.column)
