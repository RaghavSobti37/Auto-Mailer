#!/usr/bin/env python3
"""
Robust data cleaner for master database.
Standardizes:
- City names (lowercase, remove state suffixes)
- Roles in music (sort alphabetically, normalize)
- Numeric fields (remove .0, convert to int)
- Whitespace and capitalization
"""

import os
import pandas as pd
import re
import numpy as np

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
input_file = os.path.join(base_dir, 'data', 'master_db', 'master_db_cleaned.csv')
output_file = os.path.join(base_dir, 'data', 'master_db', 'master_db_final.csv')

print("=" * 80)
print("MASTER DATABASE CLEANER")
print("=" * 80)

# Load data
print("\n📂 Loading data...")
df = pd.read_csv(input_file)
original_count = len(df)
print(f"   ✓ Loaded {original_count} records")

# ============================================================================
# 1. CLEAN CITY NAMES
# ============================================================================
def clean_city(city):
    """
    Clean and standardize city names.
    - Remove state suffixes (MP, Madhya Pradesh, M.P., etc.)
    - Convert to lowercase
    - Strip whitespace
    - Handle empty values
    """
    if pd.isna(city) or city == '':
        return np.nan
    
    city_str = str(city).strip()
    
    # Remove common state/region suffixes (case-insensitive)
    suffixes = [
        r',?\s*madhya\s*pradesh\s*$',
        r',?\s*m\.p\.?\s*$',
        r',?\s*mp\s*$',
        r',?\s*m\.p\s*$',
        r',?\s*\(m\.p\.?\)\s*$',
        r',?\s*\(mp\)\s*$',
        r',?\s*madhyapradesh\s*$',
        r'\s+district\s+.*$',  # Remove "district xxx"
        r',?\s*pithampur\s*$',  # If it starts with city name followed by pithampur
    ]
    
    for suffix in suffixes:
        city_str = re.sub(suffix, '', city_str, flags=re.IGNORECASE)
    
    # Clean up
    city_str = city_str.strip().lower()
    
    # Remove extra whitespace
    city_str = re.sub(r'\s+', ' ', city_str)
    
    return city_str if city_str else np.nan

print("\n🏙️  Cleaning city names...")
df['city'] = df['city'].apply(clean_city)

# Show city cleaning results
print("\n   City cleanup results:")
city_counts = df['city'].value_counts()
for city, count in city_counts.head(10).items():
    print(f"   - {city}: {count}")

# ============================================================================
# 2. CLEAN ROLES IN MUSIC
# ============================================================================
def clean_role(role):
    """
    Clean and standardize roles in music.
    - Split by comma
    - Sort alphabetically
    - Remove duplicates
    - Handle whitespace
    """
    if pd.isna(role) or role == '':
        return np.nan
    
    role_str = str(role).strip()
    
    # Split by comma
    roles = [r.strip().lower() for r in role_str.split(',')]
    
    # Remove empty strings
    roles = [r for r in roles if r]
    
    # Remove duplicates while preserving order (set loses order, so use dict)
    roles = list(dict.fromkeys(roles))
    
    # Sort alphabetically
    roles.sort()
    
    # Join back with proper capitalization
    return ', '.join(roles) if roles else np.nan

print("\n🎵 Cleaning roles in music...")
if 'role in music' in df.columns:
    df['role in music'] = df['role in music'].apply(clean_role)
    
    # Show role cleaning results
    print("\n   Role cleanup results (top 15):")
    role_counts = df['role in music'].value_counts()
    for role, count in role_counts.head(15).items():
        role_display = role if pd.notna(role) else 'Not Specified'
        print(f"   - {role_display}: {count}")

# ============================================================================
# 3. CLEAN NUMERIC FIELDS
# ============================================================================
def clean_numeric_field(col):
    """Remove .0 from numeric fields, convert to int if applicable."""
    if col.dtype in ['float64', 'float32']:
        # Check if all non-null values are whole numbers
        valid_values = col.dropna()
        if len(valid_values) > 0 and all(val == int(val) for val in valid_values):
            # Use nullable Int64 type to handle NaN values properly
            return col.astype('Int64')
    return col

print("\n🔢 Cleaning numeric fields...")
numeric_columns = df.select_dtypes(include=['float64', 'float32']).columns
for col in numeric_columns:
    original_dtype = df[col].dtype
    df[col] = clean_numeric_field(df[col])
    if df[col].dtype != original_dtype:
        print(f"   ✓ Converted {col}: {original_dtype} → {df[col].dtype}")

# ============================================================================
# 4. CLEAN STRING FIELDS (whitespace, trim)
# ============================================================================
print("\n📝 Cleaning string fields...")
string_columns = df.select_dtypes(include=['object']).columns
for col in string_columns:
    if col not in ['role in music', 'city']:  # Already handled
        df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) else x)

# ============================================================================
# 5. REMOVE COMPLETE DUPLICATES
# ============================================================================
print("\n🔄 Removing duplicate records...")
duplicates_before = len(df[df.duplicated()])
df = df.drop_duplicates()
print(f"   ✓ Removed {duplicates_before} duplicate records")

# ============================================================================
# SAVE
# ============================================================================
print("\n💾 Saving cleaned data...")
df.to_csv(output_file, index=False, encoding='utf-8')

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("CLEANUP SUMMARY")
print("=" * 80)

print(f"\n📊 RECORDS:")
print(f"   Original:       {original_count}")
print(f"   After cleanup:  {len(df)}")
print(f"   Removed:        {original_count - len(df)}")

print(f"\n📧 COLUMNS:")
print(f"   Total: {len(df.columns)}")
print(f"   - {list(df.columns)}")

print(f"\n✅ CLEANED DATA STATS:")
print(f"   Valid Emails:     {df['email'].notna().sum()}")
print(f"   Valid Cities:     {df['city'].notna().sum()}")
print(f"   Valid Roles:      {df['role in music'].notna().sum() if 'role in music' in df.columns else 'N/A'}")
print(f"   Valid Phones:     {df['phone'].notna().sum() if 'phone' in df.columns else 'N/A'}")

print(f"\n📍 TOP CITIES:")
city_counts = df['city'].value_counts()
for city, count in city_counts.head(10).items():
    print(f"   {city:<30} {count:>5}")

if 'role in music' in df.columns:
    print(f"\n🎵 TOP ROLES:")
    role_counts = df['role in music'].value_counts()
    for role, count in role_counts.head(10).items():
        role_display = role if pd.notna(role) else 'Not Specified'
        print(f"   {role_display:<50} {count:>5}")

print(f"\n💾 OUTPUT:")
print(f"   Saved to: data/master_db/master_db_final.csv")
print(f"   Records: {len(df)}")
print(f"   Size: {os.path.getsize(output_file) / 1024:.2f} KB")

print("\n" + "=" * 80 + "\n")
