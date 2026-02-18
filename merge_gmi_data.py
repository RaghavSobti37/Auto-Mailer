"""
Script to merge GMI Audition data files.
Handles CSV and Excel files, maps columns intelligently, and deduplicates.
"""

import os
import pandas as pd
import glob

def normalize_column_names(df):
    """Standardize column names to lowercase and stripped."""
    df.columns = [str(c).lower().strip() for c in df.columns]
    return df

def find_column(df, candidates, exclusions=None):
    """Find the first matching column from a list of candidates."""
    if exclusions is None: exclusions = []
    # 1. Exact match
    for candidate in candidates:
        if candidate in df.columns:
            return candidate
            
    # 2. Starts with match (fallback)
    for candidate in candidates:
        for col in df.columns:
            if any(ex in col.lower() for ex in exclusions):
                continue
            if len(candidate) > 2 and col.startswith(candidate):
                return col
                
    # 3. Contains match (Aggressive fallback)
    for candidate in candidates:
        # Skip very short candidates to avoid false positives
        if len(candidate) < 4: 
            continue
        for col in df.columns:
            if any(ex in col.lower() for ex in exclusions):
                continue
            if candidate in col:
                return col
    return None

def merge_gmi_data(data_dir, output_file):
    print(f"\n{'='*60}")
    print(f"MERGE TOOL: Scanning {data_dir}")
    print(f"{'='*60}")
    
    # Files to exclude from merge
    exclude_files = [
        'master_db.csv', 'master_db_cleaned.csv', 'email_log.csv', 
        'whatsapp_db.csv', 'whatsapp_db_cleaned.csv', 
        os.path.basename(output_file)
    ]
    
    all_dfs = []
    
    # Look for both CSV and Excel files
    files = [f for f in os.listdir(data_dir) if f.endswith(('.csv', '.xlsx'))]
    
    for filename in files:
        if filename in exclude_files:
            continue
            
        file_path = os.path.join(data_dir, filename)
        print(f"\n📄 Processing: {filename}")
        
        try:
            # Read file based on extension
            if filename.endswith('.csv'):
                # Try reading with different encodings if default fails
                try:
                    df = pd.read_csv(file_path, dtype=str, encoding='utf-8-sig') # Handles BOM
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, dtype=str, encoding='latin1')
            else:
                df = pd.read_excel(file_path, dtype=str)
            
            if df.empty:
                print("   ⚠️  Skipping empty file.")
                continue

            # Normalize headers
            df = normalize_column_names(df)
            print(f"   Found columns: {list(df.columns)}")
            
            # --- Intelligent Column Mapping ---
            # Define possible names for each target column
            col_mappings = {
                'name': [
                    'name', 'full name', 'participant name', 'candidate name', 'student name', 'artist name',
                    'your name', 'name of the artist', 'name of participant', 'artist / band name',
                    'participant', 'first name', 'customer name'
                ],
                'email': [
                    'email', 'email id', 'email address', 'email_id', 'e-mail', 'your email', 'contact email',
                    'email address (check spelling)', 'username', 'customer email'
                ],
                'phone': [
                    'phone', 'mobile', 'contact', 'whatsapp', 'number', 'mobile number', 'contact number',
                    'phone number', 'your mobile', 'your phone', 'whatsapp number', 'contact no', 'customer phone', 'customer mobile'
                ],
                'city': [
                    'city', 'location', 'current city', 'state', 'address', 'hometown', 'city of residence',
                    'base city', 'place', 'city / town', 'city/town', 'residence'
                ],
                'role in music': [
                    'role in music', 'role', 'category', 'instrument', 'talent', 'specialization',
                    'primary role', 'artistic role', 'what describes you best', 'performance category'
                ]
            }
            
            # Create a new standardized dataframe
            new_df = pd.DataFrame()
            
            # Define exclusions for safer mapping
            exclusions_map = {
                'name': ['number', 'phone', 'mobile', 'email', 'id', 'timestamp', 'whatsapp'],
                'email': ['number', 'phone', 'mobile'],
                'phone': ['email', 'name', 'id'],
                'city': ['email', 'name', 'phone'],
                'role in music': ['email', 'phone']
            }
            
            for target_col, candidates in col_mappings.items():
                exclusions = exclusions_map.get(target_col, [])
                found_col = find_column(df, candidates, exclusions=exclusions)
                if found_col:
                    new_df[target_col] = df[found_col]
                    print(f"   ✅ Mapped '{found_col}' -> '{target_col}'")
                else:
                    new_df[target_col] = ''
                    print(f"   ❌ Missing '{target_col}' column")

            # Check if we have at least name or email
            if new_df['name'].eq('').all() and new_df['email'].eq('').all():
                print("   ⚠️  Skipping file: No Name or Email columns found.")
                continue

            # Filter out rows that are completely empty
            initial_count = len(new_df)
            new_df = new_df.dropna(how='all')
            
            # Basic validation: Check if email is present (but don't drop yet, just warn)
            missing_emails = new_df[new_df['email'] == ''].shape[0]
            if missing_emails > 0:
                print(f"   ⚠️  Warning: {missing_emails} records in this file have no email address.")

            all_dfs.append(new_df)
            print(f"   -> Added {len(new_df)} records.")
            
        except Exception as e:
            print(f"   ⛔ ERROR reading file: {e}")

    if not all_dfs:
        print("\n❌ No data found to merge.")
        return

    # --- Concatenate and Deduplicate ---
    print(f"\n{'-'*60}")
    merged_df = pd.concat(all_dfs, ignore_index=True)
    total_raw = len(merged_df)
    print(f"Total records merged: {total_raw}")
    
    # Deduplication with "keep most data" logic
    print("   Performing intelligent deduplication...")
    
    # 1. Calculate completeness (count of non-empty fields)
    # Fill NaNs with '' to ensure consistent counting
    merged_df = merged_df.fillna('')
    merged_df['completeness'] = (merged_df != '').sum(axis=1)
    
    # 2. Sort by completeness (descending) so rows with more data come first
    merged_df = merged_df.sort_values(by='completeness', ascending=False)
    
    # 3. Deduplicate based on Email (only for rows that have an email)
    # Split data
    with_email = merged_df[merged_df['email'] != ''].copy()
    without_email = merged_df[merged_df['email'] == ''].copy()
    
    # Deduplicate with_email (keep='first' retains the one with higher completeness)
    # Create a normalized column for comparison
    with_email['email_norm'] = with_email['email'].str.lower().str.strip()
    
    initial_count = len(with_email)
    with_email = with_email.drop_duplicates(subset='email_norm', keep='first')
    removed = initial_count - len(with_email)
    
    if removed > 0:
        print(f"   -> Removed {removed} duplicates (kept rows with more data).")
        
    # Cleanup helper columns
    with_email = with_email.drop(columns=['email_norm', 'completeness'])
    without_email = without_email.drop(columns=['completeness'])
    
    # Recombine
    final_df = pd.concat([with_email, without_email], ignore_index=True)
    
    # Save to CSV
    final_df.to_csv(output_file, index=False)
    
    print(f"Final count: {len(final_df)}")
    print(f"✅ Successfully saved to: {output_file}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    # Allow running this script directly for testing
    import sys
    # Default paths if run directly
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if data folder is in current directory (root) or parent (scripts folder)
    if os.path.exists(os.path.join(script_dir, 'data')):
        base_dir = script_dir
    else:
        base_dir = os.path.dirname(script_dir)
        
    data_dir = os.path.join(base_dir, 'data')
    output_file = os.path.join(data_dir, 'Delhi GMI auditions 22nd Feb.csv')
    
    merge_gmi_data(data_dir, output_file)
