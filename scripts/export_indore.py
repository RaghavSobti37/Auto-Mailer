#!/usr/bin/env python3
"""
Export Indore and surrounding region contacts from master database.
Includes: Indore, Dhar, Ujjain, Mandsaur, Dewas, Burhanpur, Shahdol, Pithampur, Barwani
"""

import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cleaned_db_path = os.path.join(base_dir, 'data', 'master_db', 'master_db_cleaned.csv')
exports_dir = os.path.join(base_dir, 'data', 'exports')

os.makedirs(exports_dir, exist_ok=True)

# Load the cleaned database
df = pd.read_csv(cleaned_db_path)

# Cities in and around Indore region
indore_region_cities = [
    'indore', 'dhar', 'ujjain', 'mandsaur', 'dewas', 
    'burhanpur', 'shahdol', 'pithampur', 'barwani'
]

# Filter for Indore region cities (case-insensitive, substring matching for variations)
indore_df = df[df['city'].str.lower().isin(indore_region_cities) | 
                df['city'].str.lower().str.contains('indore', na=False)]

# Count by city
city_counts = indore_df['city'].value_counts()

print(f'Found {len(indore_df)} records for Indore and surrounding regions')
print(f'\n📍 City-wise breakdown:')
for city, count in city_counts.items():
    print(f'  - {city}: {count}')

# Save to exports
output_path = os.path.join(exports_dir, 'Indore_and_Region_Contacts.csv')
indore_df.to_csv(output_path, index=False, encoding='utf-8')

print(f'\n✅ Successfully exported to: data/exports/Indore_and_Region_Contacts.csv')
print(f'\nColumns: {list(indore_df.columns)}')
print(f'\nFirst 5 records:')
print(indore_df.head())
