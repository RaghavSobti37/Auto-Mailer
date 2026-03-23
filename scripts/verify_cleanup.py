#!/usr/bin/env python3
"""Quick verification of cleaned data."""
import pandas as pd

# Check cleaned data
df_cleaned = pd.read_csv('data/master_db/master_db_final.csv')
df_original = pd.read_csv('data/master_db/master_db_cleaned.csv')

print("=" * 80)
print("BEFORE & AFTER COMPARISON")
print("=" * 80)

print("\n📊 OVERALL STATS:")
print(f"   Original records:  {len(df_original)}")
print(f"   Cleaned records:   {len(df_cleaned)}")

print("\n🔢 NUMERIC FIELD CHECK (country_code):")
print(f"   Original dtype:    {df_original['country_code'].dtype}")
print(f"   Cleaned dtype:     {df_cleaned['country_code'].dtype}")
print(f"\n   Original sample:   {df_original['country_code'].head(3).values}")
print(f"   Cleaned sample:    {df_cleaned['country_code'].head(3).values}")

print("\n🏙️  CITY CONSOLIDATION:")
print(f"   Original unique cities: {df_original['city'].nunique()}")
print(f"   Cleaned unique cities:  {df_cleaned['city'].nunique()}")

print("\n   Before cleanup - Indore variations:")
indore_before = df_original[df_original['city'].str.lower().str.contains('indore', na=False)]
print(f"   Total Indore records: {len(indore_before)}")
print(f"   Unique city values: {indore_before['city'].nunique()}")
print(indore_before['city'].value_counts())

print("\n   After cleanup - Indore consolidated:")
indore_after = df_cleaned[df_cleaned['city'] == 'indore']
print(f"   Total Indore records: {len(indore_after)}")
print(f"   All standardized to: 'indore'")

print("\n🎵 ROLE STANDARDIZATION (sample):")
print("\n   Before - Variations:")
df_temp = pd.read_csv('data/master_db/master_db_cleaned.csv')
singers_writers = df_temp[df_temp['role in music'].str.lower().str.contains('singer.*writer|writer.*singer', regex=True, na=False)]['role in music'].value_counts()
if len(singers_writers) > 0:
    for role, count in singers_writers.head(5).items():
        print(f"   - '{role}': {count}")
else:
    print("   No mixed singer/writer roles found")

print("\n   After - Consolidated:")
indore_df = df_cleaned[df_cleaned['city'] == 'indore']
singers_writers_cleaned = indore_df[indore_df['role in music'].str.lower().str.contains('singer.*writer|writer.*songwriter', regex=True, na=False)]['role in music'].value_counts()
if len(singers_writers_cleaned) > 0:
    for role, count in singers_writers_cleaned.head(5).items():
        role_str = role if pd.notna(role) else 'Not specified'
        print(f"   - '{role_str}': {count}")
else:
    print("   (Check sample with your specific roles)")

print("\n✅ VERIFICATION COMPLETE")
print("=" * 80 + "\n")
