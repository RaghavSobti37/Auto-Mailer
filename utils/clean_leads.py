import pandas as pd
import numpy as np
import os
import re

def is_valid_email(email):
    """Check if the email is in a valid format."""
    if not isinstance(email, str):
        return False
    # A standard regex for email validation
    regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(regex, email) is not None

def clean_master_db(input_path, output_path):
    """
    Cleans the master database by validating data types, standardizing formats,
    and removing invalid or duplicate entries.
    """
    try:
        df = pd.read_csv(input_path)
        print(f"Loaded {len(df)} records from '{input_path}'.")
    except FileNotFoundError:
        print(f"ERROR: The file '{input_path}' was not found.")
        return

    initial_rows = len(df)

    # --- 1. Clean 'email' column ---
    # Convert to string and strip whitespace
    df['email'] = df['email'].astype(str).str.strip().str.lower()
    # Remove rows with invalid email formats
    df = df[df['email'].apply(is_valid_email)]
    print(f"Removed {initial_rows - len(df)} rows with invalid email formats.")
    
    # --- 2. Clean 'name' column ---
    # Convert to string to handle potential float/int errors
    df['name'] = df['name'].astype(str)
    # Remove non-alphabetic characters (except spaces) and standardize to Title Case
    df['name'] = df['name'].str.replace(r'[^a-zA-Z\s]', '', regex=True).str.strip()
    df['name'] = df['name'].str.title()
    # Replace empty names with a placeholder
    df['name'].replace('', 'Valued Customer', inplace=True)
    print("Cleaned and standardized the 'name' column.")

    # --- 3. Clean 'number' column ---
    # Convert to string, extract digits, and keep only 10-digit numbers
    df['number'] = df['number'].astype(str).str.extract(r'(\d{10,})').iloc[:, 0]
    df['number'] = df['number'].apply(lambda x: x if isinstance(x, str) and len(x) == 10 else np.nan)
    print("Cleaned and standardized the 'number' column to 10-digit format.")

    # --- 4. Clean 'gender' column ---
    df['gender'] = df['gender'].astype(str).str.strip().str.title()
    gender_map = {
        'Male': 'Male',
        'Female': 'Female',
        'Nan': 'Other' # Handle 'nan' strings
    }
    df['gender'] = df['gender'].map(gender_map).fillna('Other')
    print("Standardized the 'gender' column.")

    # --- 5. Clean 'havells promo' column ---
    # Convert to boolean, treating 'TRUE' as True and everything else as False
    df['havells promo'] = df['havells promo'].astype(str).str.upper() == 'TRUE'
    print("Standardized the 'havells promo' column to boolean.")

    # --- 6. Remove Duplicates ---
    # Drop duplicate emails, keeping the first occurrence
    initial_rows = len(df)
    df.drop_duplicates(subset='email', keep='first', inplace=True)
    print(f"Removed {initial_rows - len(df)} duplicate email records.")

    # --- 7. Save the cleaned DataFrame ---
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"\nSuccessfully cleaned the database.")
        print(f"{len(df)} valid records saved to '{os.path.abspath(output_path)}'.")
    except Exception as e:
        print(f"Error saving the cleaned file: {e}")

if __name__ == '__main__':
    # Define file paths
    master_db_file = os.path.join('csv', 'master_db.csv')
    cleaned_db_file = os.path.join('csv', 'master_db_cleaned.csv')
    
    clean_master_db(master_db_file, cleaned_db_file)
    print("\nCleaning process complete.")

