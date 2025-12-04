import os
import pandas as pd
from clean_leads import clean_master_db
import re

# Define the standard columns for the master database. This ensures consistency.
MASTER_DB_COLUMNS = ['name', 'email', 'number', 'city', 'gender', 'havells promo']

def _parse_multiline_contact_column(df):
    """
    Identifies and parses columns with contact info embedded in multiline strings.
    It looks for a column with 'name', 'phone', and 'place' in its header.
    If found, it extracts the data into 'name', 'number', and 'city' columns.
    This function modifies the DataFrame in place.
    """
    complex_col_signature = ['name', 'phone', 'place']
    target_col = None

    for col in df.columns:
        if all(keyword in col for keyword in complex_col_signature):
            target_col = col
            break
    
    if not target_col:
        return # No complex column found

    print(f"  -> Found complex contact column: '{target_col}'. Attempting to parse.")

    def extract_info(cell_content):
        """Parses a single cell to extract name, number, and city."""
        if not isinstance(cell_content, str):
            return pd.Series([None, None, None], index=['parsed_name', 'parsed_number', 'parsed_city'])

        lines = [line.strip() for line in cell_content.split('\n')]
        name, number, city = None, None, None

        if lines:
            name = re.sub(r'^(name\s*[:\-])?\s*', '', lines[0], flags=re.IGNORECASE).strip()

        phone_match = re.search(r'\b([7-9]\d{9})\b', cell_content)
        if phone_match:
            number = phone_match.group(1)

        city_match = re.search(r'place\s*[:\-\s]\s*(.*)', cell_content, re.IGNORECASE)
        if city_match:
            city = city_match.group(1).split('\n')[0].strip()

        return pd.Series([name, number, city], index=['parsed_name', 'parsed_number', 'parsed_city'])

    parsed_data = df[target_col].apply(extract_info)

    for col_name in ['name', 'number', 'city']:
        if col_name not in df.columns:
            df[col_name] = pd.NA
        df[col_name].fillna(parsed_data[f'parsed_{col_name}'], inplace=True)
    
    print(f"  -> Successfully parsed and populated 'name', 'number', 'city' from complex column.")

def add_and_clean_new_data(new_source_paths, master_db_path, cleaned_db_path):
    """
    Processes multiple new data sources, appends them to the master DB,
    and then runs the full cleaning process.

    Workflow:
    1.  Iterates through a list of new source files (Excel or CSV).
    2.  For each file, reads the data (combining all sheets in Excel files).
    3.  Standardizes column names and maps them to the master database schema.
    4.  Aggregates all new, standardized data.
    5.  Appends the aggregated new raw data to `master_db.csv`.
    6.  Triggers the `clean_master_db` function to clean the entire `master_db.csv`
        and save the result to `master_db_cleaned.csv`.
    """
    # A more comprehensive and dynamic map for column renaming.
    # It handles various common names for the target columns.
    RENAME_MAP = {
        # Common variations for 'name'
        'name': 'name', 'full name': 'name', 'participant name': 'name', 'student name': 'name',
        # Common variations for 'email'
        'email': 'email', 'email id': 'email', 'email address': 'email', 'e-mail': 'email',
        # Common variations for 'number'
        'number': 'number', 'contact no': 'number', 'contact number': 'number', 'phone': 'number',
        'phone no': 'number', 'phone number': 'number', 'mobile': 'number', 'mobile no': 'number',
        'mobile number': 'number',
        # Common variations for 'city'
        'city': 'city', 'hometown': 'city', 'location': 'city',
    }

    all_new_contacts_dfs = []

    print(f"\n--- Step 1: Reading and Standardizing New Data Sources ---")

    for source_path in new_source_paths:
        if not os.path.exists(source_path):
            print(f"🟡 Warning: Source file not found, skipping: '{source_path}'")
            continue

        print(f"\n-> Processing file: {os.path.basename(source_path)}")

        try:
            if source_path.endswith('.xlsx'):
                # Load all sheets from the Excel file into a dictionary of DataFrames
                all_sheets_dict = pd.read_excel(source_path, sheet_name=None, dtype=str)
                # Combine all sheets into a single DataFrame
                new_df = pd.concat(all_sheets_dict.values(), ignore_index=True)
                print(f"  -> Found and combined {len(all_sheets_dict)} sheets: {list(all_sheets_dict.keys())}")
            else: # Assuming .csv
                new_df = pd.read_csv(source_path, dtype=str)

            initial_count = len(new_df)
            if initial_count == 0:
                print("  -> File is empty. Skipping.")
                continue

            print(f"  -> Found {initial_count} records in the source.")
            print(f"  -> Original columns: {list(new_df.columns)}")

            # Standardize column names (convert to string, lowercase, strip whitespace)
            new_df.columns = [str(col).lower().strip() for col in new_df.columns]
            print(f"  -> Standardized columns: {list(new_df.columns)}")

            # Attempt to parse complex multiline columns before renaming
            _parse_multiline_contact_column(new_df)

            # Apply the flexible rename map
            new_df.rename(columns=RENAME_MAP, inplace=True)
            print(f"  -> Columns after rename: {list(new_df.columns)}")

# After parsing and renaming, check if we have any contact info to proceed
            if 'email' not in new_df.columns and 'number' not in new_df.columns:
                print("  -> ❌ Error: Neither 'email' nor 'number' column found after parsing. Cannot process this file.")
                continue


            # At least one of 'email' or 'number' must be present to process the file.
            if 'email' not in cols_to_keep and 'number' not in cols_to_keep:
                print("  -> ❌ Error: Neither 'email' nor 'number' column found. Cannot process this file.")
                continue

            print(f"  -> Columns identified for extraction: {cols_to_keep}")

            processed_df = new_df[cols_to_keep].copy()
            initial_row_count = len(processed_df)

            # Define the subset of columns to check for missing values.
            # We only want to drop a row if BOTH email and number are missing.
            subset_to_check = [col for col in ['email', 'number'] if col in processed_df.columns]

            if subset_to_check:
                processed_df.dropna(subset=subset_to_check, how='all', inplace=True)

            print(f"  -> Kept {len(processed_df)} of {initial_row_count} rows after filtering for contacts with an email or number.")

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

    # Combine all processed dataframes into one
    contacts_to_add_df = pd.concat(all_new_contacts_dfs, ignore_index=True)
    total_new = len(contacts_to_add_df)
    print(f"  -> Total new records to add from all sources: {total_new}")

    if total_new > 0:
        print("\n--- Sample of aggregated new data ---")
        print(contacts_to_add_df.head())
        print("-------------------------------------\n")

    # Set 'havells promo' to False for all new entries
    contacts_to_add_df['havells promo'] = False

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
    # Use abspath to get a clean, absolute path, which is better for debugging.
    CSV_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'csv'))

    # 1. Define the list of new source files to add.
    # The script will process all files in this list.
    new_source_files = [
        'IDOL 13 - L2 master sheet citywise.xlsx',
        'SINGING DEEWANE COMPILE SHEET - SONALI.xlsx',
        'UPDATED SILENT CITIES COMPILED SHEET DIMPLE.xlsx'
    ]

    # 2. Define the master database files
    master_db_file = 'master_db.csv'
    cleaned_db_file = 'master_db_cleaned.csv'

    # --- Execution ---
    # Create full paths for all source files
    new_source_paths = [os.path.join(CSV_FOLDER, f) for f in new_source_files]
    master_db_path = os.path.join(CSV_FOLDER, master_db_file)
    cleaned_db_path = os.path.join(CSV_FOLDER, cleaned_db_file)

    add_and_clean_new_data(new_source_paths, master_db_path, cleaned_db_path)