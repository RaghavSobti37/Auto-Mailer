import pandas as pd
import os
import re

def generate_whatsapp_db(cleaned_db_path, whatsapp_db_path):
    """
    Creates a WhatsApp-specific database from the cleaned master database.

    Workflow:
    1. Reads the master_db_cleaned.csv file.
    2. Filters for rows that have a valid phone number.
    3. Extracts only the 'name', 'number', and 'city' columns.
    4. Saves the result to whatsapp_db.csv.
    """
    # --- 1. Check for source file ---
    if not os.path.exists(cleaned_db_path):
        print(f"❌ Error: Cleaned master DB not found at '{cleaned_db_path}'.")
        print("Please run the 'newdata.py' or 'clean_db.py' script first to generate it.")
        return

    print(f"\n--- Step 1: Reading Cleaned Master Database ---")
    print(f"Reading data from: {os.path.basename(cleaned_db_path)}")

    try:
        # --- 2. Load and Process Data ---
        df = pd.read_csv(cleaned_db_path, dtype=str)
        initial_count = len(df)
        print(f"  -> Found {initial_count} total records in the cleaned master DB.")

        # Drop rows where the 'number' column is missing (NaN). This is the primary filter.
        df.dropna(subset=['number'], inplace=True)

        # As a secondary check, ensure the 'number' column is a string and remove any
        # rows that might have become empty strings or just whitespace.
        df['number'] = df['number'].astype(str)
        df = df[df['number'].str.strip() != '']

        valid_phone_count = len(df)
        print(f"  -> Found {valid_phone_count} records with a phone number.")

        if valid_phone_count == 0:
            print("  -> No records with phone numbers found. Exiting.")
            return

        # --- 3. Select and Prepare Columns ---
        whatsapp_cols = ['name', 'number', 'city']
        whatsapp_df = df[whatsapp_cols].copy()

        print(f"\n--- Step 2: Saving Raw WhatsApp Database ---")
        print(f"  -> Saving {len(whatsapp_df)} records to '{os.path.basename(whatsapp_db_path)}'.")

        # --- 4. Save the new CSV ---
        whatsapp_df.to_csv(whatsapp_db_path, index=False, encoding='utf-8')

        print(f"✅ Successfully created '{os.path.basename(whatsapp_db_path)}'.")
        print("\n--- Sample of Raw WhatsApp DB ---")
        print(whatsapp_df.head())
        print("-----------------------------\n")

    except Exception as e:
        print(f"❌ An error occurred: {e}")


def clean_whatsapp_db(whatsapp_db_path, cleaned_whatsapp_db_path):
    """
    Cleans the generated WhatsApp DB for formatting consistency.

    Workflow:
    1. Reads whatsapp_db.csv.
    2. Formats phone numbers to a standard 10-digit format.
    3. Cleans the city column to contain only the primary city name.
    4. Saves the result to whatsapp_db_cleaned.csv.
    """
    if not os.path.exists(whatsapp_db_path):
        print(f"❌ Error: Raw WhatsApp DB not found at '{whatsapp_db_path}'.")
        print("   -> Please ensure the first part of the script ran successfully.")
        return

    print(f"--- Step 3: Cleaning WhatsApp Database ---")
    df = pd.read_csv(whatsapp_db_path, dtype=str)
    print(f"  -> Read {len(df)} records from '{os.path.basename(whatsapp_db_path)}'.")

    # --- Clean 'number' column ---
    def format_phone_number(num):
        if pd.isna(num):
            return None
        # Keep only digits
        num_str = re.sub(r'\D', '', str(num))
        
        # Standardize to 10 digits for common Indian formats
        if len(num_str) == 12 and num_str.startswith('91'):
            return num_str[2:]  # Remove '91' prefix
        elif len(num_str) == 11 and num_str.startswith('0'):
            return num_str[1:]   # Remove leading '0'
        elif len(num_str) == 10:
            return num_str       # Already in correct format
        else:
            return num_str       # Return cleaned number even if length is unusual

    df['number'] = df['number'].apply(format_phone_number)
    print("  -> Standardized phone numbers.")

    # --- Clean 'city' column ---
    # Takes the first part of a comma/hyphen/slash-separated string and title-cases it
    df['city'] = df['city'].astype(str).str.split(r'[,/-]').str[0].str.strip().str.title()
    print("  -> Cleaned city names.")

    # Drop rows that are invalid after cleaning
    df.dropna(subset=['name', 'number', 'city'], how='any', inplace=True)
    # Ensure number is not an empty string and is at least 10 digits
    df = df[df['number'].str.strip().str.len() >= 10]

    print(f"\n--- Step 4: Saving Cleaned WhatsApp Database ---")
    print(f"  -> Saving {len(df)} cleaned records to '{os.path.basename(cleaned_whatsapp_db_path)}'.")

    df.to_csv(cleaned_whatsapp_db_path, index=False, encoding='utf-8')

    print(f"✅ Successfully created '{os.path.basename(cleaned_whatsapp_db_path)}'.")
    print("\n--- Sample of Cleaned WhatsApp DB ---")
    print(df.head())
    print("-------------------------------------\n")

if __name__ == '__main__':
    # --- Configuration ---
    CSV_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'csv'))

    # Define the source and destination file paths
    cleaned_db_file = 'master_db_cleaned.csv'
    whatsapp_db_file = 'whatsapp_db.csv'
    cleaned_whatsapp_db_file = 'whatsapp_db_cleaned.csv'

    cleaned_db_path = os.path.join(CSV_FOLDER, cleaned_db_file)
    whatsapp_db_path = os.path.join(CSV_FOLDER, whatsapp_db_file)
    cleaned_whatsapp_db_path = os.path.join(CSV_FOLDER, cleaned_whatsapp_db_file)

    # --- Execution ---
    # Step 1: Generate the raw WhatsApp DB from the master cleaned list
    generate_whatsapp_db(cleaned_db_path, whatsapp_db_path)

    # Step 2: Clean the raw WhatsApp DB to create a final, formatted version
    clean_whatsapp_db(whatsapp_db_path, cleaned_whatsapp_db_path)