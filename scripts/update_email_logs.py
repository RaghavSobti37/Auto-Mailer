#!/usr/bin/env python3
"""
Update master_db_cleaned.csv havells_myousic_sent column based on email_log.csv
"""

import pandas as pd

# Read the master database and email log
master_df = pd.read_csv('csv/master_db_cleaned.csv')
email_log_df = pd.read_csv('data/csv/email_log.csv')

print(f"Before update:")
print(f"Total rows in master_db: {len(master_df)}")
print(f"Already marked as sent: {(master_df['havells_myousic_sent'] == True).sum()}")

# Get the set of emails from email_log that were successfully sent
sent_emails = set(email_log_df[email_log_df['Status'] == 'SENT']['EmailID'].str.strip().values)

print(f"\nEmails from log with SENT status: {len(sent_emails)}")

# Update havells_myousic_sent to True for emails that were sent
# Strip whitespace from email column for comparison
master_df['email_clean'] = master_df['email'].str.strip()
master_df.loc[master_df['email_clean'].isin(sent_emails), 'havells_myousic_sent'] = True
master_df = master_df.drop('email_clean', axis=1)

# Save back
master_df.to_csv('csv/master_db_cleaned.csv', index=False)

print(f"\nAfter update:")
print(f"Now marked as sent: {(master_df['havells_myousic_sent'] == True).sum()}")
print(f'\n✓ Updated master_db_cleaned.csv successfully!')
