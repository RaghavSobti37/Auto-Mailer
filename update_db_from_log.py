import pandas as pd
import os

def update_master_db_from_log():
    """
    Updates the master database based on the email log.

    Reads the email_log.csv, gets a list of all emails that were successfully
    sent, and then updates the 'havells promo' column in a copy of the
    master_db.csv to True for those email addresses.
    """
    # Define file paths
    log_file_path = os.path.join('csv', 'email_log.csv')
    master_db_path = os.path.join('csv', 'master_db_cleaned.csv')
    updated_db_path = os.path.join('csv', 'master_db_updated.csv')

    try:
        # 1. Read the log file and get unique emails that were sent successfully
        log_df = pd.read_csv(log_file_path)
        sent_emails = log_df[log_df['Status'] == 'SENT']['EmailID'].unique()
        print(f"Found {len(sent_emails)} unique emails with 'SENT' status in the log.")

        # 2. Read the master database
        master_df = pd.read_csv(master_db_path)
        print(f"Loaded {len(master_df)} records from '{master_db_path}'.")

        # 3. Update the 'havells promo' column based on the sent emails
        # The .isin() method is an efficient way to check for values in a list
        master_df.loc[master_df['email'].isin(sent_emails), 'havells promo'] = True

        # 4. Remove the 'whatsapp havells' column if it exists
        if 'whatsapp havells' in master_df.columns:
            master_df.drop(columns=['whatsapp havells'], inplace=True)
            print("Removed 'whatsapp havells' column.")

        # 5. Save the updated DataFrame to a new file
        master_df.to_csv(updated_db_path, index=False)
        print(f"\nSuccessfully updated the database. The new file is saved at:\n{os.path.abspath(updated_db_path)}")

    except FileNotFoundError as e:
        print(f"ERROR: Could not find a required file. Please check the path.\n{e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    update_master_db_from_log()