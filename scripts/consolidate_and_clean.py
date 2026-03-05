"""
This script consolidates and cleans all data from the `data/raw` directory,
updates the master database, and moves processed files to `data/processed`.
"""

import os
import sys
import pandas as pd
import glob
import re

# Add parent directory to path to allow imports from src
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Helper functions (amalgamated from other scripts)

def normalize_column_names(df):
    """Standardize column names to lowercase and stripped."""
    df.columns = [str(c).lower().strip() for c in df.columns]
    return df

def find_column(df, candidates, exclusions=None):
    """Find the first matching column from a list of candidates."""
    if exclusions is None: exclusions = []
    for candidate in candidates:
        if candidate in df.columns:
            return candidate
    for candidate in candidates:
        for col in df.columns:
            if any(ex in col.lower() for ex in exclusions):
                continue
            if len(candidate) > 2 and col.startswith(candidate):
                return col
    for candidate in candidates:
        if len(candidate) < 4: 
            continue
        for col in df.columns:
            if any(ex in col.lower() for ex in exclusions):
                continue
            if candidate in col:
                return col
    return None

def is_valid_email(email):
    """Check if the email is in a valid format."""
    if not isinstance(email, str):
        return False
    regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(regex, email) is not None

def clean_role_entry(text):
    """Cleans the Role column by removing URLs, footer garbage, and separating Bio text."""
    if pd.isna(text) or str(text).strip() == '': return ""
    text = str(text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    garbage_phrases = [
        r'I confirm this is my original work', r'I have read the T&C', r'I understand them',
        r'I agree to the Havells mYOUsic Terms', r'Social Media FALSE', r'Email FALSE', r'Radio FALSE',
        r'through a friend FALSE', r'All of it', r'All of the above', r'Opportunities'
    ]
    for phrase in garbage_phrases:
        text = re.sub(re.escape(phrase), '', text, flags=re.IGNORECASE)
    bio_pattern = r'(\s(I|I\'m|I\'m|My|As a|Growing up)\s|[""])'
    match = re.search(bio_pattern, text)
    if match:
        text = text[:match.start()]
    text = text.strip().strip('.,-')
    if len(text) > 40:
        known_roles = ['Singer', 'Songwriter', 'Composer', 'Lyricist', 'Producer', 'Rapper', 'Guitarist', 'Vocalist', 'Musician']
        found = [role for role in known_roles if role.lower() in text.lower()]
        if found:
            return ", ".join(sorted(list(set(found))))
        else:
            if text.count(' ') > 5:
                return ""
    return text

def remove_problematic_characters(text):
    """Remove problematic characters like quotes that might cause issues."""
    if pd.isna(text) or not isinstance(text, str):
        return text
    # Remove smart quotes, regular quotes, and other problematic characters
    text = text.replace('"', '').replace("'", '').replace('"', '').replace('"', '')
    text = text.replace(''', '').replace(''', '')
    # Clean up excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def detect_country_code(phone_number):
    """Detect country code based on phone number digit count and pattern."""
    if pd.isna(phone_number) or not isinstance(phone_number, str):
        return None
    
    # Remove all non-digits
    digits = re.sub(r'\D', '', phone_number)
    if not digits:
        return None
    
    digit_count = len(digits)
    
    # Country code detection by digit count
    country_map = {
        10: '+91',   # India (10 digits)
        11: '+880',  # Bangladesh (11 digits)
        9: '+94',    # Sri Lanka (9 digits)
        7: '+230',   # Mauritius (7 digits)
        8: '+886',   # Taiwan (8 digits)
        12: '+1',    # USA/Canada extension (12 with +1)
    }
    
    # If the number starts with country code already, extract it
    if digits.startswith('1') and digit_count == 12:
        return '+1'  # USA/Canada with trailing numbers
    
    return country_map.get(digit_count, '+91')  # Default to India

def is_spam_entry(row):
    """Identify spam/garbage entries based on content patterns."""
    spam_patterns = [
        r'all rights reserved',
        r'cybercrimes|terrorist|death',
        r'enjoy in ur home|spare u|royal sex aunty',
        r'http.*?\.com|mediaten.*?\|spotify.*?gif',
        r'making fun of others|never come to ur show',
        r'dont need to play a drama',
        r'we will never meet',
        r'^[a-z0-9]*@[a-z]*\.com$|no.*mail',
        r'hello.*thank.*you.*regards',
    ]
    
    name = str(row.get('name', '')).lower() if 'name' in row else ''
    email_domain = str(row.get('email', '')).lower() if 'email' in row else ''
    city = str(row.get('city', '')).lower() if 'city' in row else ''
    
    # Check name and city combinations
    combined_text = f"{name} {email_domain} {city}".lower()
    
    for pattern in spam_patterns:
        if re.search(pattern, combined_text):
            return True
    
    # Check for suspiciously long names without breaks
    if len(name) > 100 and ' ' not in name[20:60]:
        return True
    
    # Check for gibberish emails
    if email_domain and not re.match(r'^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$', email_domain):
        return True
    
    return False

def parse_multiline_contact_column(df):
    """Identifies and parses columns with contact info embedded in multiline strings."""
    complex_col_signature = ['name', 'phone', 'place']
    target_col = None
    for col in df.columns:
        if all(keyword in col for keyword in complex_col_signature):
            target_col = col
            break
    if not target_col:
        return
    
    def extract_info(cell_content):
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

def consolidate_and_clean(raw_dir, processed_dir, master_db_dir, log_dir):
    """Main function to orchestrate the data pipeline."""
    
    print(f"{'='*60}")
    print("STARTING DATA CONSOLIDATION AND CLEANING PROCESS")
    print(f"{'='*60}")
    
    # Setup logging
    log_file_path = os.path.join(log_dir, 'activity.log')
    def log_message(message):
        with open(log_file_path, 'a', encoding='utf-8') as f:
            f.write(f"{pd.Timestamp.now()}: {message}\n")
        try:
            print(message)
        except UnicodeEncodeError:
            # Handle emoji characters on Windows console
            print(message.encode('utf-8', errors='replace').decode('utf-8'))

    log_message("Scanning for new files...")
    
    files_to_process = glob.glob(os.path.join(raw_dir, '*.csv')) + glob.glob(os.path.join(raw_dir, '*.xlsx'))
    
    if not files_to_process:
        log_message("No new files found in 'data/raw'. Exiting.")
        return

    all_dfs = []
    
    col_mappings = {
        'name': ['name', 'full name', 'participant name', 'candidate name', 'student name', 'artist name', 'your name', 'first name', 'customer name'],
        'email': ['email', 'email id', 'email address', 'e-mail', 'your email', 'username', 'customer email'],
        'phone': ['phone', 'mobile', 'contact', 'whatsapp', 'number', 'mobile number', 'contact no', 'customer phone'],
        'city': ['city', 'location', 'current city', 'state', 'address', 'hometown', 'place', 'residence'],
        'role in music': ['role in music', 'role', 'category', 'instrument', 'talent', 'specialization', 'brief description']
    }
    exclusions_map = {'name': ['email', 'id'], 'email': ['number'], 'phone': ['email']}

    for file_path in files_to_process:
        filename = os.path.basename(file_path)
        log_message(f"📄 Processing: {filename}")
        
        try:
            if filename.endswith('.csv'):
                try:
                    df = pd.read_csv(file_path, dtype=str, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, dtype=str, encoding='latin1')
            else:
                df = pd.read_excel(file_path, dtype=str)

            if df.empty:
                log_message("   ⚠️  Skipping empty file.")
                # Move empty file to processed
                os.rename(file_path, os.path.join(processed_dir, filename))
                continue

            df = normalize_column_names(df)
            parse_multiline_contact_column(df)
            
            new_df = pd.DataFrame()
            for target_col, candidates in col_mappings.items():
                found_col = find_column(df, candidates, exclusions=exclusions_map.get(target_col, []))
                if found_col:
                    new_df[target_col] = df[found_col]
                else:
                    new_df[target_col] = ''
            
            if new_df['name'].eq('').all() and new_df['email'].eq('').all():
                log_message("   ⚠️  Skipping file: No Name or Email columns found.")
                os.rename(file_path, os.path.join(processed_dir, filename))
                continue
            
            all_dfs.append(new_df)
            log_message(f"   -> Staged {len(new_df)} records.")
            os.rename(file_path, os.path.join(processed_dir, filename))
            log_message(f"   -> Moved to '{processed_dir}'")
            
        except Exception as e:
            log_message(f"   ⛔ ERROR reading file: {e}. Skipping.")
            # Optionally move errored files to a separate 'error' directory
            continue

    if not all_dfs:
        log_message("No valid data was found in any of the files. Exiting.")
        return

    # --- Concatenate and Deduplicate New Data ---
    log_message(f"\n{'-'*60}\nMerging and cleaning new data...")
    new_data_df = pd.concat(all_dfs, ignore_index=True)
    new_data_df = new_data_df.fillna('')
    log_message(f"Total new records staged: {len(new_data_df)}")

    # Intelligent Deduplication on new data
    new_data_df['completeness'] = (new_data_df != '').sum(axis=1)
    new_data_df = new_data_df.sort_values(by='completeness', ascending=False)
    with_email = new_data_df[new_data_df['email'] != ''].copy()
    without_email = new_data_df[new_data_df['email'] == ''].copy()
    with_email['email_norm'] = with_email['email'].str.lower().str.strip()
    with_email = with_email.drop_duplicates(subset='email_norm', keep='first')
    new_data_df = pd.concat([with_email, without_email], ignore_index=True).drop(columns=['completeness', 'email_norm'])
    log_message(f"New records after deduplication: {len(new_data_df)}")

    # --- Clean the new data ---
    log_message("Applying data cleaning rules to new records...")
    
    # Remove problematic characters from all text fields
    for col in ['name', 'city', 'role in music']:
        new_data_df[col] = new_data_df[col].astype(str).apply(remove_problematic_characters)
    
    new_data_df['email'] = new_data_df['email'].astype(str).str.strip().str.lower()
    valid_email_mask = new_data_df['email'].apply(is_valid_email)
    new_data_df = new_data_df[valid_email_mask]
    log_message(f"Kept {len(new_data_df)} records with valid emails.")

    new_data_df['name'] = new_data_df['name'].astype(str).str.strip().str.replace(r'\s*\(.*\)\s*', '', regex=True).str.strip()
    new_data_df['name'] = new_data_df['name'].str.replace(r'[^a-zA-Z\s]', '', regex=True).str.strip().str.title()
    new_data_df['name'] = new_data_df['name'].replace('', 'Valued Customer')
    
    # Clean phone numbers: extract 10 digits and convert to string, remove any .0 suffixes
    new_data_df['phone'] = new_data_df['phone'].astype(str).str.replace(r'\D', '', regex=True)
    new_data_df['phone'] = new_data_df['phone'].str.extract(r'(\d{10})')[0]
    new_data_df['phone'] = new_data_df['phone'].fillna('')  # Replace NaN with empty string
    new_data_df['phone'] = new_data_df['phone'].astype(str).str.replace(r'\.0$', '', regex=True)  # Remove .0 suffix
    
    new_data_df['role in music'] = new_data_df['role in music'].apply(clean_role_entry)
    new_data_df['havells promo'] = False # Default for new entries
    
    # Detect and add country codes
    log_message("Detecting country codes from phone numbers...")
    new_data_df['country_code'] = new_data_df['phone'].apply(detect_country_code)
    
    # Remove spam entries
    log_message("Filtering out spam/garbage entries...")
    spam_mask = new_data_df.apply(is_spam_entry, axis=1)
    spam_count = spam_mask.sum()
    new_data_df = new_data_df[~spam_mask]
    log_message(f"Removed {spam_count} spam entries. Remaining: {len(new_data_df)}")

    # --- Update Master Database ---
    log_message(f"\n{'-'*60}\nUpdating Master Database...")
    master_db_path = os.path.join(master_db_dir, 'master_db.csv')
    
    if os.path.exists(master_db_path):
        log_message("Master DB found. Merging new data.")
        # Specify phone as string to avoid float conversion
        dtype_dict = {col: str for col in ['phone', 'name', 'email', 'city', 'role in music', 'country_code']}
        master_df = pd.read_csv(master_db_path, dtype=dtype_dict)
        # Clean up any .0 suffixes from existing data
        master_df['phone'] = master_df['phone'].str.replace(r'\.0$', '', regex=True)
        master_df['phone'] = master_df['phone'].replace('nan', '')
        combined_df = pd.concat([master_df, new_data_df], ignore_index=True)
    else:
        log_message("Master DB not found. Creating a new one.")
        combined_df = new_data_df
        
    log_message(f"Total records before final deduplication: {len(combined_df)}")
    combined_df['email'] = combined_df['email'].astype(str).str.lower().str.strip()
    final_master_df = combined_df.drop_duplicates(subset='email', keep='last').copy()  # Create a proper copy
    log_message(f"Total records after final deduplication: {len(final_master_df)}")
    
    # Ensure phone numbers are clean strings without decimal points
    # For non-empty values, convert to int (removes any float notation), then back to string
    def clean_phone(val):
        if pd.isna(val) or val == '' or val == 'nan' or val == 'None':
            return ''
        # Convert to string, remove .0 suffix if present
        phone_str = str(val).strip().replace('.0', '')
        # Keep only digits
        phone_digits = ''.join(c for c in phone_str if c.isdigit())
        return phone_digits
    
    final_master_df.loc[:, 'phone'] = final_master_df['phone'].apply(clean_phone)
    
    # Save with quoting to ensure phone numbers are preserved as strings
    final_master_df.to_csv(master_db_path, index=False, encoding='utf-8', quoting=1)
    log_message(f"✅ Master DB saved to '{master_db_path}'")

    # --- Create Cleaned Master DB for campaigns ---
    cleaned_db_path = os.path.join(master_db_dir, 'master_db_cleaned.csv')
    final_master_df.to_csv(cleaned_db_path, index=False, encoding='utf-8', quoting=1)
    log_message(f"✅ Cleaned Master DB for campaigns saved to '{cleaned_db_path}'")
    
    # --- Display Summary Details ---
    log_message(f"\n{'='*60}")
    log_message("DATABASE SUMMARY DETAILS")
    log_message(f"{'='*60}")
    
    log_message(f"\n📊 FINAL DATABASE STATISTICS:")
    log_message(f"  • Total Records: {len(final_master_df)}")
    log_message(f"  • Records with Valid Email: {(final_master_df['email'] != '').sum()}")
    log_message(f"  • Records with Phone: {(final_master_df['phone'] != '').sum()}")
    log_message(f"  • Records with City: {(final_master_df['city'] != '').sum()}")
    log_message(f"  • Records with Role Info: {(final_master_df['role in music'] != '').sum()}")
    
    log_message(f"\n🌍 COUNTRY CODE DISTRIBUTION:")
    country_dist = final_master_df['country_code'].value_counts()
    for code, count in country_dist.head(10).items():
        log_message(f"  • {code}: {count} records")
    
    log_message(f"\n🏙️  TOP 15 CITIES:")
    top_cities = final_master_df['city'].value_counts().head(15)
    for city, count in top_cities.items():
        if city and city != '':
            log_message(f"  • {city}: {count} records")
    
    log_message(f"\n🎵 MUSIC ROLES FOUND:")
    roles = final_master_df['role in music'].value_counts()
    if len(roles) > 0:
        for role, count in roles.head(10).items():
            if role and role != '':
                log_message(f"  • {role}: {count} records")
    else:
        log_message("  • No role information available")
    
    log_message(f"\n📧 EMAIL DOMAINS (Top 10):")
    email_domains = final_master_df['email'].str.extract(r'@(.+)$')[0].value_counts().head(10)
    for domain, count in email_domains.items():
        log_message(f"  • {domain}: {count} records")
    
    log_message(f"\n{'='*60}")
    log_message("PROCESS COMPLETED SUCCESSFULLY")
    log_message(f"{'='*60}\n")


if __name__ == '__main__':
    # Define project structure paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'data', 'raw')
    processed_dir = os.path.join(base_dir, 'data', 'processed')
    master_db_dir = os.path.join(base_dir, 'data', 'master_db')
    log_dir = os.path.join(base_dir, 'logs')

    # Ensure directories exist
    for d in [raw_dir, processed_dir, master_db_dir, log_dir]:
        os.makedirs(d, exist_ok=True)
        
    consolidate_and_clean(raw_dir, processed_dir, master_db_dir, log_dir)
