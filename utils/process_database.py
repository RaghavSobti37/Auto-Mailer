import os
import re
import pandas as pd

def clean_text(text):
    """Removes emojis, non-ASCII characters, and extra whitespace from a string."""
    if not isinstance(text, str):
        return text
    
    # A simple and effective way to remove strange characters and emojis
    # It keeps only standard ASCII characters.
    text = text.encode('ascii', 'ignore').decode('ascii')

    # Replace multiple spaces/newlines with a single space and strip whitespace
    return re.sub(r'\s+', ' ', text).strip()

def clean_database(input_path, output_path):
    """
    Cleans a CSV database by:
    1. Standardizing column names.
    2. Cleaning text fields to remove special characters.
    3. Removing rows with invalid or missing email addresses.
    4. Deduplicating based on the 'Email' column.
    """
    if not os.path.exists(input_path):
        print(f"[ERROR] Input database '{input_path}' not found. Exiting.")
        return

    print(f"Processing and cleaning database: {input_path}")
    try:
        df = pd.read_csv(input_path, encoding='utf-8')
        print(f"  -> Initial records: {len(df)}")
    except Exception as e:
        print(f"[ERROR] Could not read input file '{input_path}': {e}")
        return

    # Standardize column names to lowercase for consistency
    df.columns = [col.lower().strip() for col in df.columns]
    
    # Rename common variations to a standard format
    rename_map = {
        'ypur mobile': 'mobile'
    }
    df.rename(columns=rename_map, inplace=True)

    # Clean all text-based columns
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(clean_text)

    # Data Quality: Remove rows with no email or invalid email format
    df.dropna(subset=['email'], inplace=True)
    df = df[df['email'].str.contains('@', na=False)]
    print(f"  -> Records after removing missing/invalid emails: {len(df)}")

    # Deduplicate based on the 'email' column, keeping the first entry
    df.drop_duplicates(subset=['email'], keep='first', inplace=True)
    print(f"  -> Records after deduplication: {len(df)}")

    # Ensure required columns exist
    final_columns = ['name', 'email', 'mobile', 'city']
    for col in final_columns:
        if col not in df.columns:
            df[col] = '' # Add missing columns with empty values
    
    # Select and reorder columns for a clean output
    df = df[final_columns]

    # Write the fully processed data to the output file
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"\nWriting {len(df)} cleaned rows to: {output_path}")
    print("\n--- Database Cleaning Complete ---")

if __name__ == '__main__':
    # Dynamically determine the project's base directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir) # Go up one level from 'utils'

    # This script now takes the raw submission data and cleans it.
    input_db = os.path.join(base_dir, 'csv', 'submission_data.csv')
    output_db = os.path.join(base_dir, 'csv', 'submission_data_processed.csv')
    clean_database(input_db, output_db)