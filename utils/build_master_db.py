import pandas as pd
import os

def build_master_db():
    """
    Builds the final master database by merging and cleaning all available contact sources.

    This script is the final stage in the data processing pipeline. It assumes that
    raw .eml files have already been processed by `extract_eml_data.py` and
    `consolidate_eml_files.py` to produce `eml_raw_data.csv`.

    Workflow of this script:
    1.  Loads multiple source CSV files defined in the `SOURCES` configuration
        (e.g., `submission_data.csv`, `eml_raw_data.csv`, `test_leads_cleaned.csv`).
    2.  Standardizes column names across all files to a common format
        (e.g., 'Name', 'EmailID' -> 'name', 'email').
    3.  Tags each record with `havells promo` (True/False) based on its source file.
    4.  Merges all data into a single DataFrame.
    5.  Deduplicates records based on the 'email' column, prioritizing promo leads
        if an email exists in multiple lists.
    6.  Saves the final, clean, and unified list to `master_db.csv`.
    """
    
    # --- Configuration ---
    # Define file paths for input and output. This makes it easy to change later.
    CSV_FOLDER = 'csv'
    OUTPUT_FILE = os.path.join(CSV_FOLDER, 'master_db.csv')
    
    # Define all potential source files and their properties.
    # This makes the script more flexible and easier to update.
    SOURCES = {
        'submission_data': {
            'path': os.path.join(CSV_FOLDER, 'submission_data.csv'),
            'is_promo': False,
            'required': True # The script will fail if this file is missing.
        },
        'eml_raw_data': {
            'path': os.path.join(CSV_FOLDER, 'eml_raw_data.csv'),
            'is_promo': False,
            'required': False # The script will only warn if this file is missing.
        },
        'promo_leads': {
            'path': os.path.join(CSV_FOLDER, 'test_leads_cleaned.csv'),
            'is_promo': True,
            'required': True # This file is also required.
        }
    }

    # --- Helper function to find and rename columns ---
    def standardize_columns(df):
        """Standardizes common column names to a consistent format."""
        # This map defines all possible input column names and their standard equivalent.
        rename_map = {
            'Name': 'name',
            'EmailID': 'email',
            'Email': 'email',
            'Mobile': 'number',
            'phone': 'number',
            'City': 'city'
        }
        # Create a map of only the columns that actually exist in the dataframe to avoid errors.
        actual_rename_map = {k: v for k, v in rename_map.items() if k in df.columns}
        df.rename(columns=actual_rename_map, inplace=True)

    try:
        print("Starting the master DB build process...")

        loaded_dfs = []
        
        # --- Load and Process Data ---
        # Loop through defined sources, loading and processing them if they exist.
        for source_name, config in SOURCES.items():
            file_path = config['path']
            is_required = config['required']

            if os.path.exists(file_path):
                try:
                    print(f"Loading data from: {file_path}")
                    df = pd.read_csv(file_path)
                    
                    # Standardize columns for the current DataFrame.
                    standardize_columns(df)
                    
                    # Validate that a standardized 'email' column exists.
                    if 'email' not in df.columns:
                        print(f"Warning: Skipping file '{file_path}' because no 'email' column could be found after standardization.")
                        continue

                    # Clean email column: lowercase and strip whitespace.
                    if pd.api.types.is_string_dtype(df['email']):
                        df['email'] = df['email'].str.lower().str.strip()

                    # Tag data source based on the 'is_promo' flag.
                    df['havells promo'] = config['is_promo']
                    
                    loaded_dfs.append(df)
                except Exception as e:
                    print(f"Warning: Could not load or process file '{file_path}'. Error: {e}")
            elif is_required:
                # If a required file is missing, stop the process.
                print(f"Error: Required source file is missing: {file_path}")
                print("Please make sure all required input files are in the 'csv' folder.")
                return
            else:
                # If an optional file is missing, just print a message and continue.
                print(f"Info: Optional source file not found, skipping: {file_path}")

        if not loaded_dfs:
            print("No data was loaded. Exiting process.")
            return

        # --- Merge, Deduplicate, and Clean ---
        print("Merging dataframes...")
        # Combine all dataframes into one. `ignore_index=True` creates a new clean index.
        combined_df = pd.concat(loaded_dfs, ignore_index=True, sort=False)

        # Sort by 'havells promo' (True comes first). This is key for prioritizing promo leads.
        combined_df.sort_values(by='havells promo', ascending=False, inplace=True)
        
        # Drop duplicate emails. `keep='first'` ensures that if an email is in both promo and non-promo,
        # the promo entry (which is now first due to sorting) is kept.
        master_df = combined_df.drop_duplicates(subset=['email'], keep='first')
        
        # --- Finalize Schema ---
        # Define the exact columns and order for the final CSV file.
        final_columns = ['name', 'email', 'number', 'city', 'gender', 'havells promo']
        
        # Ensure all final columns exist in the dataframe, adding them with empty values if missing.
        # This prevents errors and creates a consistent output file structure.
        for col in final_columns:
            if col not in master_df.columns:
                master_df[col] = pd.NA
        
        # Reorder and select only the final columns
        master_df = master_df[final_columns]
        
        # Sort by the original index to restore a more natural order and reset the index for a clean file.
        master_df = master_df.sort_index().reset_index(drop=True)
        
        print(f"Merge and clean complete. Total records in master DB: {len(master_df)}")

        # --- Save Output ---
        # Save the final, clean dataframe to a CSV file.
        master_df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8')
        print(f"Successfully built and saved master database at: {OUTPUT_FILE}")

    except Exception as e:
        print(f"An unexpected error occurred during the database build: {e}")

if __name__ == "__main__":
    build_master_db()
