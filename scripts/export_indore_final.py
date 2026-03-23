#!/usr/bin/env python3
"""
"""

import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cleaned_db_path = os.path.join(base_dir, 'data', 'master_db', 'master_db_final.csv')
exports_dir = os.path.join(base_dir, 'data', 'exports')

os.makedirs(exports_dir, exist_ok=True)

# Load the FINAL cleaned database
df = pd.read_csv(cleaned_db_path)


"""
Export Madhya Pradesh and surrounding states contacts from CLEANED master database.
Uses master_db_final.csv with standardized city names and roles.
Focuses on: Madhya Pradesh (MP) and neighboring states
"""

# Mapping of cities to states for MP and surrounding regions
city_to_state = {
    # Madhya Pradesh
    'indore': 'MP', 'ujjain': 'MP', 'dhar': 'MP', 'dewas': 'MP', 
    'mandsaur': 'MP', 'shahdol': 'MP', 'pithampur': 'MP', 'barwani': 'MP',
    'bhopal': 'MP', 'jabalpur': 'MP', 'gwalior': 'MP', 'itarsi': 'MP',
    'narmadapuram': 'MP', 'burhanpur': 'MP', 'khandwa': 'MP', 'khargone': 'MP',
    'ratlam': 'MP', 'neemuch': 'MP', 'rajgarh': 'MP', 'raisen': 'MP',
    'sehore': 'MP', 'vidisha': 'MP', 'betul': 'MP', 'hoshangabad': 'MP',
    'damoh': 'MP', 'datia': 'MP', 'guna': 'MP', 'ashoknagar': 'MP',
    'chhatarpur': 'MP', 'seoni': 'MP', 'mandla': 'MP', 'dindori': 'MP',
    'anuppur': 'MP', 'umaria': 'MP', 'shivpuri': 'MP', 'tikamgarh': 'MP',
    'sagar': 'MP', 'rewa': 'MP', 'satna': 'MP', 'sidhi': 'MP',
    'singrauli': 'MP', 'panna': 'MP', 'chhindwara': 'MP', 'balaghat': 'MP',
    
    # Neighboring states - nearby regions
    'burhanpur': 'MP', 'nandurbar': 'Maharashtra', 'dhule': 'Maharashtra',
    'dahod': 'Gujarat', 'bodeli': 'Gujarat', 'godhra': 'Gujarat',
    'kota': 'Rajasthan', 'baran': 'Rajasthan', 'jhalawar': 'Rajasthan',
    'bilaspur': 'Chhattisgarh', 'raigarh': 'Chhattisgarh', 'korba': 'Chhattisgarh',
}

# Filter for MP and surrounding regions
indore_df = df[df['city'].isin(city_to_state.keys())].copy()

# Add state information for reference
indore_df['state'] = indore_df['city'].map(city_to_state)

# Convert numeric columns to int (removing .0) for display in CSV
# For columns with NaN, we'll leave them as is (they'll show as empty)
numeric_cols = ['phone', 'country_code']
for col in numeric_cols:
    if col in indore_df.columns:
        # Convert series to object, fill NaN with empty string, convert non-NaN to int
        indore_df[col] = indore_df[col].apply(lambda x: '' if pd.isna(x) else int(x))

# Count by state
state_counts = indore_df['state'].value_counts()
city_counts = indore_df['city'].value_counts()

print(f'Found {len(indore_df)} records for Madhya Pradesh and surrounding regions')
print(f'\n📍 State-wise breakdown:')
for state, count in state_counts.items():
    print(f'  - {state}: {count}')

print(f'\n📍 City-wise breakdown (top cities):')
for city, count in city_counts.head(15).items():
    print(f'  - {city}: {count}')

# Save to exports with state information
output_path = os.path.join(exports_dir, 'Madhya_Pradesh_and_Region_Contacts_FINAL.csv')
indore_df.to_csv(output_path, index=False, encoding='utf-8')

print(f'\n✅ Successfully exported cleaned contacts to: data/exports/Madhya_Pradesh_and_Region_Contacts_FINAL.csv')
print(f'\nColumns: {list(indore_df.columns)}')
print(f'\nSample records (standardized cities, no .0 decimals):')
print(indore_df[['name', 'city', 'state', 'country_code', 'phone']].head(10))
