#!/usr/bin/env python3
"""
Cross-check havells_myousic_sent column against actual email logs
"""

import pandas as pd

# Load both files
log_df = pd.read_csv('data/csv/email_log.csv')
master_df = pd.read_csv('csv/master_db_cleaned.csv')

print('Email Log Stats:')
print(f'Total log entries: {len(log_df)}')
print(f'SENT emails: {len(log_df[log_df["Status"] == "SENT"])}')
print(f'FAILED emails: {len(log_df[log_df["Status"] == "FAILED"])}')

print('\nSample log entries:')
print(log_df[['EmailID', 'Name', 'Status']].head(5))

print('\n\nCross-check with master_db:')
# Strip whitespace from email IDs in the log
sent_emails = set(log_df[log_df['Status'] == 'SENT']['EmailID'].str.strip().values)
print(f'Unique SENT email IDs in log: {len(sent_emails)}')

# Check which sent emails exist in master_db
matched = master_df[master_df['email'].isin(sent_emails)]
print(f'Emails from log that exist in master_db: {len(matched)}')
print(f'Currently marked as havells_myousic_sent=True in matched: {(matched["havells_myousic_sent"] == True).sum()}')

print('\n\nUpdating havells_myousic_sent to match exact log entries...')
# Reset all to False first
master_df['havells_myousic_sent'] = False

# Set only the emails from the SENT log to True
master_df.loc[master_df['email'].isin(sent_emails), 'havells_myousic_sent'] = True

# Save
master_df.to_csv('csv/master_db_cleaned.csv', index=False)

print(f'Total updated: {(master_df["havells_myousic_sent"] == True).sum()}')
print('✓ master_db_cleaned.csv updated successfully')
