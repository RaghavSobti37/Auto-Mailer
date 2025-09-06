import pandas as pd
import os

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Use the cleaned master database for the Email report
Email_CSV_PATH = os.path.join(BASE_DIR, 'csv', 'master_db_cleaned.csv')
EMAIL_LOG_PATH = os.path.join(BASE_DIR, 'csv', 'email_log.csv')
CAMPAIGN_COLUMN = 'havells promo'

def show_campaign_progress():
    """
    Reads the campaign CSVs and prints the progress statistics to the terminal.
    """
    # --- Email Progress ---
    print("\n--- Havells Email Campaign Progress ---")

    if not os.path.exists(Email_CSV_PATH):
        print(f"\n❌ Error: Email data file not found at '{Email_CSV_PATH}'")
        print("Please ensure the cleaned master database exists.")
    else:
        try:
            # Read the CSV, ensuring the campaign column is treated as a string
            # to correctly handle 'True'/'False' text values.
            df_Email = pd.read_csv(Email_CSV_PATH, dtype={CAMPAIGN_COLUMN: str})

            if CAMPAIGN_COLUMN not in df_Email.columns:
                print(f"\n❌ Error: Campaign tracking column '{CAMPAIGN_COLUMN}' not found in the CSV.")
            else:
                total_contacts = len(df_Email)
                
                # Count 'sent' by checking for the string 'True' (case-insensitive).
                # This is robust against how pandas might read boolean-like strings.
                sent_count = df_Email[CAMPAIGN_COLUMN].str.lower().eq('true').sum()
                
                left_to_send = total_contacts - sent_count

                print(f"\n📊 Email Stats for '{os.path.basename(Email_CSV_PATH)}':\n")
                print(f"  - Total Contacts:      {total_contacts}")
                print(f"  - Messages Sent:       {sent_count}  ✅")
                print(f"  - Remaining to Send:   {left_to_send}  ⏳")
                
                # Calculate and display percentage with a progress bar
                if total_contacts > 0:
                    percentage_complete = (sent_count / total_contacts) * 100
                    print(f"\n  - Progress:            {percentage_complete:.2f}% complete")
                    
                    bar_length = 30
                    filled_length = int(bar_length * sent_count // total_contacts)
                    bar = '█' * filled_length + '-' * (bar_length - filled_length)
                    print(f"    [{bar}]")
        except Exception as e:
            print(f"\nAn unexpected error occurred while reading Email data: {e}")

    # --- Email Progress ---
    print("\n--- Email Campaign Daily Report ---")
    if not os.path.exists(EMAIL_LOG_PATH):
        print(f"\n🟡 Info: Email log file not found at '{EMAIL_LOG_PATH}'.")
    else:
        try:
            df_email = pd.read_csv(EMAIL_LOG_PATH)
            
            if 'Timestamp' not in df_email.columns or 'Status' not in df_email.columns:
                 print(f"\n❌ Error: 'Timestamp' or 'Status' column missing in '{os.path.basename(EMAIL_LOG_PATH)}'.")
            else:
                df_sent = df_email[df_email['Status'].str.upper() == 'SENT'].copy()
                
                if df_sent.empty:
                    print("\nNo emails have been marked as 'SENT' in the log file yet.")
                else:
                    df_sent['send_date'] = pd.to_datetime(df_sent['Timestamp']).dt.date
                    daily_counts = df_sent.groupby('send_date').size()
                    total_sent = daily_counts.sum()

                    print(f"\n📧 Email Stats from '{os.path.basename(EMAIL_LOG_PATH)}':\n")
                    print(f"  - Total Emails Sent:   {total_sent}  ✅\n")
                    print("  Daily Breakdown (most recent first):")
                    for date, count in daily_counts.sort_index(ascending=False).items():
                        print(f"  - {date.strftime('%Y-%m-%d')}:  {count} emails")
        except Exception as e:
            print(f"\nAn unexpected error occurred while reading email log: {e}")

    print("\n-----------------------------------------------")

if __name__ == "__main__":
    show_campaign_progress()