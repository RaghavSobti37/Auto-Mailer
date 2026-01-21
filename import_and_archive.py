"""
Unified Import and Archive System for AutoMailer

This script:
1. Scans the 'import data' folder for CSV and Excel files
2. Handles various data formats and maps them to master_db columns
3. Cleans and processes the data
4. Moves processed files to 'import data/archive' folder
5. Appends cleaned data to master_db_cleaned.csv

This replaces the need to manually manage raw data files after import.
"""

import os
import pandas as pd
import shutil
import re
from datetime import datetime

# --- Configuration ---
IMPORT_FOLDER = os.path.join(os.path.dirname(__file__), 'import data')
ARCHIVE_FOLDER = os.path.join(IMPORT_FOLDER, 'archive')
CSV_FOLDER = os.path.join(os.path.dirname(__file__), 'csv')
CLEANED_DB_PATH = os.path.join(CSV_FOLDER, 'master_db_cleaned.csv')

# Standard columns for the master database
MASTER_DB_COLUMNS = ['name', 'email', 'number', 'city', 'gender', 'havells promo', 'masterclass_ad_sent']

# Comprehensive column mapping to handle different data formats
COLUMN_RENAME_MAP = {
    # Common variations for 'name'
    'name': 'name',
    'full name': 'name',
    'full_name': 'name',
    'participant name': 'name',
    'student name': 'name',
    'artist name': 'name',
    'artist_name': 'name',
    'first name': 'name',
    'first_name': 'name',
    'firstname': 'name',
    'last name': 'name',  # Will be handled with first name separately
    'lastname': 'name',
    'name 2': 'name',
    'name 3': 'name',
    
    # Common variations for 'email'
    'email': 'email',
    'email id': 'email',
    'email_id': 'email',
    'email address': 'email',
    'email_address': 'email',
    'e-mail': 'email',
    'e_mail': 'email',
    'emailid': 'email',
    'email_address': 'email',
    
    # Common variations for 'number'
    'number': 'number',
    'contact no': 'number',
    'contact_no': 'number',
    'contact number': 'number',
    'contact_number': 'number',
    'phone': 'number',
    'phone no': 'number',
    'phone_no': 'number',
    'phone number': 'number',
    'phone_number': 'number',
    'phonenumber': 'number',
    'mobile': 'number',
    'mobile no': 'number',
    'mobile_no': 'number',
    'mobile number': 'number',
    'mobile_number': 'number',
    'mobilenumber': 'number',
    'whatsapp': 'number',
    'whatsapp no': 'number',
    'whatsapp number': 'number',
    'contact': 'number',
    'telephone': 'number',
    
    # Common variations for 'city'
    'city': 'city',
    'hometown': 'city',
    'location': 'city',
    'place': 'city',
    'state': 'city',
    'city/state': 'city',
    'city/location': 'city',
    
    # Common variations for 'gender'
    'gender': 'gender',
    'sex': 'gender',
    'male/female': 'gender',
}


def is_valid_email(email):
    """Check if email is in a valid format."""
    if not isinstance(email, str) or email.lower() == 'nan':
        return False
    email = email.strip()
    if not email:
        return False
    regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(regex, email) is not None


def clean_email(email):
    """Clean and validate email."""
    if not isinstance(email, str):
        return None
    email = email.strip()
    if email.lower() in ['nan', '', 'none']:
        return None
    email = email.lower()
    if is_valid_email(email):
        return email
    return None


def clean_name(name):
    """Clean and standardize name."""
    if not isinstance(name, str):
        return 'Valued Customer'
    name = name.strip()
    if name.lower() in ['nan', '', 'none']:
        return 'Valued Customer'
    # Remove text in parentheses
    name = re.sub(r'\s*\(.*\)\s*', '', name).strip()
    # Remove non-alphabetic characters except spaces
    name = re.sub(r'[^a-zA-Z\s]', '', name).strip()
    name = name.title()
    return name if name else 'Valued Customer'


def clean_number(number):
    """Clean and standardize phone number to 10 digits."""
    if not isinstance(number, str):
        return None
    number = number.strip()
    if number.lower() in ['nan', '', 'none']:
        return None
    # Remove all non-digit characters
    number = re.sub(r'\D', '', number)
    # Extract first 10-digit number
    match = re.search(r'\d{10}', number)
    return match.group(0) if match else None


def clean_gender(gender):
    """Clean and standardize gender."""
    if not isinstance(gender, str):
        return 'Other'
    gender = gender.strip()
    if gender.lower() in ['nan', '', 'none']:
        return 'Other'
    gender = gender.upper()
    if gender in ['MALE', 'M']:
        return 'Male'
    elif gender in ['FEMALE', 'F', 'WOMAN']:
        return 'Female'
    return 'Other'


def combine_first_last_name(first_name, last_name):
    """Combine first and last names if both exist."""
    first = str(first_name).strip() if isinstance(first_name, str) and first_name.lower() != 'nan' else ''
    last = str(last_name).strip() if isinstance(last_name, str) and last_name.lower() != 'nan' else ''
    
    if first and last:
        return f"{first} {last}"
    elif first:
        return first
    elif last:
        return last
    return None


def process_import_file(file_path):
    """
    Process a single import file and return a cleaned DataFrame with standard columns.
    
    Args:
        file_path: Path to CSV or Excel file
        
    Returns:
        DataFrame with standard columns or None if processing fails
    """
    try:
        print(f"\n  Processing: {os.path.basename(file_path)}")
        
        # Read file based on extension
        if file_path.endswith('.xlsx'):
            # Read all sheets and combine
            all_sheets = pd.read_excel(file_path, sheet_name=None, dtype=str)
            df = pd.concat(all_sheets.values(), ignore_index=True)
            print(f"    - Read {len(all_sheets)} sheet(s) from Excel file")
        else:  # CSV
            df = pd.read_csv(file_path, dtype=str)
        
        initial_rows = len(df)
        print(f"    - Found {initial_rows} records")
        
        if initial_rows == 0:
            print(f"    - File is empty, skipping")
            return None
        
        # Remove duplicate column names by keeping first occurrence
        df = df.loc[:, ~df.columns.duplicated(keep='first')]
        
        # Standardize column names
        df.columns = [str(col).lower().strip() for col in df.columns]
        
        # Handle first name + last name combination BEFORE rename map
        if ('first name' in df.columns or 'firstname' in df.columns) and ('last name' in df.columns or 'lastname' in df.columns):
            first_col = 'first name' if 'first name' in df.columns else 'firstname'
            last_col = 'last name' if 'last name' in df.columns else 'lastname'
            combined_names = []
            for idx, row in df.iterrows():
                first_val = row.get(first_col) if first_col in row.index else None
                last_val = row.get(last_col) if last_col in row.index else None
                combined = combine_first_last_name(first_val, last_val)
                combined_names.append(combined if combined else 'Valued Customer')
            df['name'] = combined_names
            # Drop the first/last name columns to avoid conflicts
            df = df.drop(columns=[first_col, last_col], errors='ignore')
        
        # Apply rename map
        df.rename(columns=COLUMN_RENAME_MAP, inplace=True)
        
        # Select only columns we need
        available_cols = [col for col in MASTER_DB_COLUMNS if col in df.columns or col in ['name', 'email', 'number', 'city', 'gender']]
        cols_to_keep = [col for col in available_cols if col in df.columns]
        
        # Check if we have at least email or number
        if 'email' not in cols_to_keep and 'number' not in cols_to_keep:
            print(f"    - [!] No email or phone number column found, skipping file")
            return None
        
        df = df[cols_to_keep].copy()
        
        # Add missing columns with defaults
        if 'name' not in df.columns:
            df['name'] = 'Valued Customer'
        if 'email' not in df.columns:
            df['email'] = None
        if 'number' not in df.columns:
            df['number'] = None
        if 'city' not in df.columns:
            df['city'] = None
        if 'gender' not in df.columns:
            df['gender'] = 'Other'
        if 'havells promo' not in df.columns:
            df['havells promo'] = False
        if 'masterclass_ad_sent' not in df.columns:
            df['masterclass_ad_sent'] = False
        
        # Clean data
        # Handle name column specially - it might be from combined first/last names or regular name
        if 'name' in df.columns:
            # If name is still a Series (not already processed), clean it
            if not isinstance(df['name'].iloc[0] if len(df) > 0 else None, str) or df['name'].isna().all():
                df['name'] = df['name'].astype(str).apply(clean_name)
            else:
                # Already has values, just ensure it's clean
                df['name'] = df['name'].apply(lambda x: clean_name(x) if isinstance(x, str) else clean_name(str(x)))
        else:
            df['name'] = 'Valued Customer'
        
        df['email'] = df['email'].astype(str).apply(clean_email)
        df['number'] = df['number'].astype(str).apply(clean_number)
        df['city'] = df['city'].fillna('').astype(str)
        df['city'] = df['city'].apply(lambda x: x.strip() if isinstance(x, str) and x.lower() != 'nan' else 'Unknown')
        df['gender'] = df['gender'].astype(str).apply(clean_gender)
        df['havells promo'] = df['havells promo'].astype(str).apply(lambda x: x.upper() == 'TRUE' if isinstance(x, str) else False)
        df['masterclass_ad_sent'] = df['masterclass_ad_sent'].astype(str).apply(lambda x: x.upper() == 'TRUE' if isinstance(x, str) else False)
        
        # Remove rows where both email and number are missing
        df = df.dropna(subset=['email', 'number'], how='all')
        
        # Remove duplicate emails
        df = df.drop_duplicates(subset=['email'], keep='first')
        
        final_rows = len(df)
        valid_rows = df[df['email'].notna()].shape[0]
        
        print(f"    - After cleaning: {final_rows} rows ({valid_rows} with valid emails)")
        
        # Return only the standard columns, ensuring proper structure
        try:
            # Build records row by row to avoid pandas Series issues
            df_records = []
            for idx, row in df.iterrows():
                record = {}
                for col in MASTER_DB_COLUMNS:
                    if col in df.columns:
                        val = row[col]
                    else:
                        val = False if col in ['havells promo', 'masterclass_ad_sent'] else ('Valued Customer' if col == 'name' else '')
                    
                    # Handle Series values (shouldn't happen, but just in case)
                    if isinstance(val, pd.Series):
                        val = val.iloc[0] if len(val) > 0 else ''
                    # Flatten any array/list values
                    elif isinstance(val, (list, tuple)):
                        val = val[0] if len(val) > 0 else ''
                    # Handle NaN/None
                    elif val is None or (isinstance(val, float) and pd.isna(val)):
                        val = False if col in ['havells promo', 'masterclass_ad_sent'] else ('Valued Customer' if col == 'name' else '')
                    
                    record[col] = val
                df_records.append(record)
            
            result = pd.DataFrame(df_records)
            return result
        except Exception as e:
            print(f"    - [ERROR] Error creating result dataframe: {e}")
            return None
        
    except Exception as e:
        print(f"    - [ERROR] Error processing file: {e}")
        return None
def archive_file(file_path):
    """
    Move a file to the archive folder with timestamp.
    
    Args:
        file_path: Path to file to archive
    """
    try:
        filename = os.path.basename(file_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create filename with timestamp
        name, ext = os.path.splitext(filename)
        archived_filename = f"{name}_{timestamp}{ext}"
        archived_path = os.path.join(ARCHIVE_FOLDER, archived_filename)
        
        # Move file to archive
        shutil.move(file_path, archived_path)
        print(f"    - [✓] Archived to: {archived_filename}")
        return True
    except Exception as e:
        print(f"    - [!] Could not archive file: {e}")
        return False


def import_and_archive():
    """
    Main function to import data, clean it, archive source files,
    and update the master cleaned database.
    """
    print("\n" + "="*70)
    print("AutoMailer - Unified Import and Archive System")
    print("="*70)
    
    # Check if import folder exists
    if not os.path.exists(IMPORT_FOLDER):
        print(f"❌ Import folder not found: {IMPORT_FOLDER}")
        return
    
    # Create archive folder if it doesn't exist
    os.makedirs(ARCHIVE_FOLDER, exist_ok=True)
    
    # Find all CSV and Excel files in import folder (excluding archive)
    import_files = []
    for file in os.listdir(IMPORT_FOLDER):
        file_path = os.path.join(IMPORT_FOLDER, file)
        # Skip directories and archive folder
        if os.path.isdir(file_path):
            continue
        if file.endswith(('.csv', '.xlsx')):
            import_files.append(file_path)
    
    if not import_files:
        print(f"\n[✓] No new files to import in '{IMPORT_FOLDER}'")
        return
    
    print(f"\n[FILES] Found {len(import_files)} file(s) to import:")
    print("-" * 70)
    
    # Process all import files
    all_processed_dfs = []
    successful_files = []
    
    for file_path in import_files:
        processed_df = process_import_file(file_path)
        if processed_df is not None and len(processed_df) > 0:
            all_processed_dfs.append(processed_df)
            successful_files.append(file_path)
    
    if not all_processed_dfs:
        print(f"\n[!] No valid data was extracted from any file.")
        return
    
    # Combine all processed data
    print(f"\n" + "-" * 70)
    print("Combining and updating database...")
    
    combined_df = pd.concat(all_processed_dfs, ignore_index=True)
    print(f"  - Total records to add: {len(combined_df)}")
    
    # Load existing cleaned database
    if os.path.exists(CLEANED_DB_PATH):
        existing_df = pd.read_csv(CLEANED_DB_PATH, dtype=str)
        print(f"  - Existing records in database: {len(existing_df)}")
        
        # Combine with existing data
        combined_df = pd.concat([existing_df, combined_df], ignore_index=True)
        print(f"  - Total after merge: {len(combined_df)}")
        
        # Remove duplicates (keep first occurrence)
        combined_df = combined_df.drop_duplicates(subset=['email'], keep='first')
        print(f"  - After deduplication: {len(combined_df)}")
    else:
        print(f"  - Creating new database")
    
    # Save updated database
    try:
        os.makedirs(CSV_FOLDER, exist_ok=True)
        combined_df[MASTER_DB_COLUMNS].to_csv(CLEANED_DB_PATH, index=False, encoding='utf-8')
        print(f"  - [✓] Database updated: {CLEANED_DB_PATH}")
    except Exception as e:
        print(f"  - [!] Error saving database: {e}")
        return
    
    # Archive processed files
    print(f"\n" + "-" * 70)
    print("Archiving processed files...")
    archived_count = 0
    for file_path in successful_files:
        if archive_file(file_path):
            archived_count += 1
    
    # Summary
    print(f"\n" + "="*70)
    print("Import and Archive Complete!")
    print(f"  - Files processed: {archived_count}/{len(successful_files)}")
    print(f"  - Total records now in database: {len(combined_df)}")
    print(f"  - Database location: {CLEANED_DB_PATH}")
    print("="*70 + "\n")


if __name__ == '__main__':
    import_and_archive()
