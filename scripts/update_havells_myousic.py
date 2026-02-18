#!/usr/bin/env python3
"""
Update master_db_cleaned.csv with havells_myousic_sent status based on email_log.csv
"""

import pandas as pd

# Read the master database and email log
master_df = pd.read_csv('csv/master_db_cleaned.csv')
email_log_df = pd.read_csv('csv/email_log.csv')

# Add the havells_myousic_sent column if it doesn't exist
if 'havells_myousic_sent' not in master_df.columns:
    master_df['havells_myousic_sent'] = False

# Get the set of emails from email_log that were successfully sent
sent_emails = set(email_log_df[email_log_df['Status'] == 'SENT']['EmailID'].values)

# Update havells_myousic_sent to True for emails that were sent
master_df.loc[master_df['email'].isin(sent_emails), 'havells_myousic_sent'] = True

# Save back
master_df.to_csv('csv/master_db_cleaned.csv', index=False)

print(f'Updated master_db_cleaned.csv')
print(f'Total sent emails: {len(sent_emails)}')
print(f'Rows updated: {(master_df["havells_myousic_sent"] == True).sum()}')
print(f'Total rows: {len(master_df)}')
