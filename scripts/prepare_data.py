#!/usr/bin/env python3
"""
Data preparation and cleaning script.

Workflow:
1. Read new data sources (Excel/CSV)
2. Standardize and validate data
3. Append to master database
4. Run full cleaning process
"""

import os
import sys
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.database import clean_master_db
from src.utils import read_and_standardize_data, prepare_contacts_for_db


def add_and_clean_new_data(new_source_paths, master_db_path, cleaned_db_path):
    """
    Processes multiple new data sources, appends them to the master DB,
    and then runs the full cleaning process.
    """
    MASTER_DB_COLUMNS = ['name', 'email', 'number', 'city', 'gender', 'havells promo']
    all_new_contacts_dfs = []

    print(f"\n--- Step 1: Reading and Standardizing New Data Sources ---")

    for source_path in new_source_paths:
        if not os.path.exists(source_path):
            print(f"🟡 Warning: Source file not found, skipping: '{source_path}'")
            continue

        print(f"\n-> Processing file: {os.path.basename(source_path)}")

        try:
            new_df, initial_count, original_columns = read_and_standardize_data(source_path)
            
            # Prepare for database
            processed_df = prepare_contacts_for_db(new_df)
            
            all_new_contacts_dfs.append(processed_df)
            print(f"  -> ✅ Successfully processed and staged {len(processed_df)} records from this file.")

        except Exception as e:
            print(f"  -> ❌ An error occurred while processing '{os.path.basename(source_path)}': {e}")
            continue

    if not all_new_contacts_dfs:
        print("\n--- No new data was successfully processed. Exiting. ---")
        return

    # --- 2. Aggregate and Append New Data to Master DB ---
    print(f"\n--- Step 2: Aggregating and Appending New Records to Master DB ---")

    contacts_to_add_df = pd.concat(all_new_contacts_dfs, ignore_index=True)
    total_new = len(contacts_to_add_df)
    print(f"  -> Total new records to add from all sources: {total_new}")

    if total_new > 0:
        print("\n--- Sample of aggregated new data ---")
        print(contacts_to_add_df.head())
        print("-------------------------------------\n")

    # Set 'havells promo' to False for all new entries
    contacts_to_add_df['havells promo'] = False

    # Append to master database
    if os.path.exists(master_db_path):
        master_df = pd.read_csv(master_db_path)
        updated_master_df = pd.concat([master_df, contacts_to_add_df], ignore_index=True)
    else:
        print(f"  -> Master DB not found at '{master_db_path}'. A new file will be created.")
        updated_master_df = contacts_to_add_df

    # Ensure final columns are present before saving
    for col in MASTER_DB_COLUMNS:
        if col not in updated_master_df.columns:
            updated_master_df[col] = pd.NA

    # Save the combined raw data
    updated_master_df[MASTER_DB_COLUMNS].to_csv(master_db_path, index=False, encoding='utf-8')
    print(f"✅ Successfully appended data. '{os.path.basename(master_db_path)}' now contains {len(updated_master_df)} total records.")

    # --- 3. Run the Full Cleaning Process ---
    print(f"\n--- Step 3: Running full cleaning process on '{os.path.basename(master_db_path)}' ---")
    clean_master_db(master_db_path, cleaned_db_path)


if __name__ == '__main__':
    # --- Configuration ---
    IMPORT_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'import data'))
    DATA_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'csv'))
    
    # Define the list of new source files to add
    new_source_files = [
        'Artiste First Webflow Data.xlsx',
        'New artist list.xlsx',
        # 'SINGING DEEWANE COMPILE SHEET - SONALI.xlsx',  # Has complex data format issues
        # 'UPDATED SILENT CITIES COMPILED SHEET DIMPLE.xlsx'  # Missing email/phone columns
    ]

    master_db_file = 'master_db.csv'
    cleaned_db_file = 'master_db_cleaned.csv'

    # --- Execution ---
    new_source_paths = [os.path.join(IMPORT_FOLDER, f) for f in new_source_files]
    master_db_path = os.path.join(DATA_FOLDER, master_db_file)
    cleaned_db_path = os.path.join(DATA_FOLDER, cleaned_db_file)

    add_and_clean_new_data(new_source_paths, master_db_path, cleaned_db_path)
