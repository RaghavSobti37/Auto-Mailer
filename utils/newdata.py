import os
import pandas as pd
from clean_leads import clean_master_db

# Define the standard columns for the master database. This ensures consistency.
MASTER_DB_COLUMNS = ['name', 'email', 'number', 'city', 'gender', 'havells promo']

def add_and_clean_new_data(new_source_path, master_db_path, cleaned_db_path):
    """
    Appends new data to the master DB and then runs the full cleaning process.

    Workflow:
    1.  Reads the new source file (Excel or CSV).
    2.  Standardizes column names to match the master database schema.
    3.  Appends the new raw data to `master_db.csv`.
    4.  Triggers the `clean_master_db` function to clean the entire `master_db.csv`
        and save the result to `master_db_cleaned.csv`.
    """
    # --- 1. Load and Standardize New Source Data ---
    if not os.path.exists(new_source_path):
        print(f"❌ Error: New source file not found at '{new_source_path}'.")
        return

    print(f"\n--- Step 1: Reading New Data Source ---")
    print(f"Reading data from: {os.path.basename(new_source_path)}")

    try:
        if new_source_path.endswith('.xlsx'):
            # Load all sheets from the Excel file into a dictionary of DataFrames
            all_sheets_dict = pd.read_excel(new_source_path, sheet_name=None)
            # Combine all sheets into a single DataFrame
            new_df = pd.concat(all_sheets_dict.values(), ignore_index=True)
            print(f"  -> Found and combined {len(all_sheets_dict)} sheets: {list(all_sheets_dict.keys())}")
        else:
            new_df = pd.read_csv(new_source_path)

        initial_count = len(new_df)
        print(f"  -> Found {initial_count} records in the new source.")
        print(f"  -> Original columns: {list(new_df.columns)}")

        # Standardize column names
        new_df.columns = [col.lower().strip() for col in new_df.columns]
        print(f"  -> Standardized (lowercase, stripped) columns: {list(new_df.columns)}")

        rename_map = {
            # This map is flexible. It will only rename columns that exist.
            'email id': 'email',
            'contact no': 'number',
            'hometown': 'city',
            'name': 'name' # Add a direct mapping for 'name' just in case.
        }
        new_df.rename(columns=rename_map, inplace=True)
        print(f"  -> Columns after applying rename map: {list(new_df.columns)}")

        # Filter for only the columns we need to append
        cols_to_keep = [col for col in ['name', 'email', 'number', 'city'] if col in new_df.columns]
        if 'email' not in cols_to_keep:
            print("  -> ❌ Error: 'email' column not found after standardization. Cannot proceed.")
            return # Stop if there's no email column, as it's essential.
        
        print(f"  -> Columns identified for extraction: {cols_to_keep}")
        print("\n--- Sample of extracted data before appending ---")
        # Print a sample of the data being extracted for debugging
        sample_rows = new_df[cols_to_keep].head(5) # Show first 5 rows
        if not sample_rows.empty:
            for index, row in sample_rows.iterrows():
                print(f"    Row {index}:")
                for col in cols_to_keep:
                    print(f"      {col}: {row.get(col, 'N/A')}")
        else:
            print("    No data to sample after initial column processing.")
        print("--------------------------------------------------\n")

        contacts_to_add_df = new_df[cols_to_keep].copy()

        # Set 'havells promo' to False for all new entries
        contacts_to_add_df['havells promo'] = False

    except Exception as e:
        print(f"  -> ❌ An error occurred while processing the new source file: {e}")
        return

    # --- 2. Append New Data to Master DB ---
    print(f"\n--- Step 2: Appending {len(contacts_to_add_df)} new records to Master DB ---")

    # Use pandas to append, which handles mismatched columns gracefully
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
    CSV_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'csv')

    # 1. Define the new source file to add
    new_source_file = 'IDOL 13 - L2 master sheet citywise.xlsx'

    # 2. Define the master database files
    master_db_file = 'master_db.csv'
    cleaned_db_file = 'master_db_cleaned.csv'

    # --- Execution ---
    new_source_path = os.path.join(CSV_FOLDER, new_source_file)
    master_db_path = os.path.join(CSV_FOLDER, master_db_file)
    cleaned_db_path = os.path.join(CSV_FOLDER, cleaned_db_file)

    add_and_clean_new_data(new_source_path, master_db_path, cleaned_db_path)