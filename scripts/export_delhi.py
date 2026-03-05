"""
Export Delhi and New Delhi contacts from master database.
"""

import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cleaned_db_path = os.path.join(base_dir, 'data', 'master_db', 'master_db_cleaned.csv')
exports_dir = os.path.join(base_dir, 'data', 'exports')

os.makedirs(exports_dir, exist_ok=True)

# Load the cleaned database
df = pd.read_csv(cleaned_db_path)

# Filter for Delhi and New Delhi (case-insensitive)
delhi_df = df[(df['city'].str.lower() == 'delhi') | (df['city'].str.lower() == 'new delhi')]

print(f'Found {len(delhi_df)} records for Delhi and New Delhi')
print(f'  - Delhi: {len(df[df["city"].str.lower() == "delhi"])}')
print(f'  - New Delhi: {len(df[df["city"].str.lower() == "new delhi"])}')

# Save to exports
output_path = os.path.join(exports_dir, 'Delhi_and_New_Delhi_Contacts.csv')
delhi_df.to_csv(output_path, index=False, encoding='utf-8')

print(f'\n✅ Successfully exported to: data/exports/Delhi_and_New_Delhi_Contacts.csv')
print(f'\nColumns: {list(delhi_df.columns)}')
print(f'\nFirst 5 records:')
print(delhi_df.head())
