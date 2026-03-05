"""
Script to process specific new entries from 19th Feb and merge them into the main GMI database.
Replicates logic from merge_gmi_data.py.
"""

import os
import pandas as pd
import re
import sys

# --- Helper Functions (Replicated from merge_gmi_data.py) ---

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
        if len(candidate) < 4: 
            continue
        for col in df.columns:
            if any(ex in col.lower() for ex in exclusions):
                continue
            if candidate in col:
                return col
    return None

KNOWN_ROLES = [
    'Singer', 'Songwriter', 'Composer', 'Lyricist', 'Producer', 'Rapper', 
    'Guitarist', 'Vocalist', 'Musician', 'Instrumentalist', 'Drummer', 
    'Pianist', 'Bassist', 'Artist', 'Performer', 'Music Producer'
]

def clean_role_entry(text):
    if pd.isna(text) or str(text).strip() == '': return ""
    text = str(text)
    
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    # Remove garbage phrases
    garbage_phrases = [
        r'I confirm this is my original work', r'I have read the T&C', r'I understand them',
        r'I agree to the Havells mYOUsic Terms', r'Social Media FALSE', r'Email FALSE',
        r'Radio FALSE', r'through a friend FALSE', r'All of it', r'All of the above',
        r'Opportunities', r'The Dots. I Am Filling This Form On Behalf Of Us.',
        r'I Can Create Song Posters. I Am Graphic Designer.',
        r'I Could Provide Any Type Of  Song In Hindi'
    ]
    for phrase in garbage_phrases:
        text = re.sub(re.escape(phrase), '', text, flags=re.IGNORECASE)
        
    # Truncate at Bio start
    bio_pattern = r'(\s(I|I\'m|I’m|My|As a|Growing up)\s|["“])'
    match = re.search(bio_pattern, text)
    if match:
        text = text[:match.start()]
        
    text = text.strip().strip('.,-')
    
    if len(text) > 40:
        found = []
        for role in KNOWN_ROLES:
            if role.lower() in text.lower():
                found.append(role)
        if found:
            return ", ".join(sorted(list(set(found))))
        else:
            if text.count(' ') > 5:
                return "" 
    return text

def process_files(file_paths):
    all_dfs = []
    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"⚠️ File not found: {file_path}")
            continue
            
        print(f"📄 Processing: {os.path.basename(file_path)}")
        try:
            if file_path.endswith('.csv'):
                try:
                    df = pd.read_csv(file_path, dtype=str, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, dtype=str, encoding='latin1')
            else:
                df = pd.read_excel(file_path, dtype=str)
                
            df = normalize_column_names(df)
            
            col_mappings = {
                'name': ['name', 'full name', 'participant name', 'candidate name'],
                'email': ['email', 'email id', 'email address'],
                'phone': ['phone', 'mobile', 'contact', 'whatsapp', 'number', 'phone number'],
                'city': ['city', 'location', 'current city', 'state'],
                'role in music': ['role in music', 'role', 'category', 'brief description', 'what describes you best']
            }
            
            new_df = pd.DataFrame()
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
                else:
                    new_df[target_col] = ''
            
            if not new_df.empty:
                all_dfs.append(new_df)
                print(f"   -> Extracted {len(new_df)} records.")
                
        except Exception as e:
            print(f"   ⛔ Error processing {file_path}: {e}")
            
    if not all_dfs:
        return pd.DataFrame()
        
    return pd.concat(all_dfs, ignore_index=True)

def main():
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    import_dir = os.path.join(base_dir, 'import data')
    data_dir = os.path.join(base_dir, 'data')
    
    input_files = [
        os.path.join(import_dir, 'Listing Customers (16).csv'),
        os.path.join(import_dir, 'Participant_List_2026-02-19.xlsx')
    ]
    
    new_entries_file = os.path.join(data_dir, 'new entries 19th feb.csv')
    master_file = os.path.join(data_dir, 'Delhi GMI auditions 22nd Feb.csv')
    
    print(f"\n{'='*60}")
    print("PROCESSING NEW ENTRIES (19th Feb)")
    print(f"{'='*60}")

    # 1. Process new files
    new_df = process_files(input_files)
    
    if new_df.empty:
        print("❌ No new data found in the specified files.")
        return

    # 2. Clean role
    if 'role in music' in new_df.columns:
        new_df['role in music'] = new_df['role in music'].apply(clean_role_entry)
        
    # 3. Save new entries to separate file
    new_df.to_csv(new_entries_file, index=False)
    print(f"\n✅ Saved {len(new_df)} new entries to: {new_entries_file}")
    
    # 4. Merge with master
    print(f"\nMerging into: {os.path.basename(master_file)}...")
    
    if os.path.exists(master_file):
        try:
            master_df = pd.read_csv(master_file, dtype=str)
        except UnicodeDecodeError:
            master_df = pd.read_csv(master_file, dtype=str, encoding='latin1')
        combined_df = pd.concat([master_df, new_df], ignore_index=True)
    else:
        print(f"   Master file not found. Creating new one.")
        combined_df = new_df
        
    # 5. Deduplicate
    print("   Deduplicating records...")
    combined_df = combined_df.fillna('')
    combined_df['completeness'] = (combined_df != '').sum(axis=1)
    combined_df = combined_df.sort_values(by='completeness', ascending=False)
    
    with_email = combined_df[combined_df['email'] != ''].copy()
    without_email = combined_df[combined_df['email'] == ''].copy()
    
    with_email['email_norm'] = with_email['email'].str.lower().str.strip()
    initial_count = len(with_email)
    with_email = with_email.drop_duplicates(subset='email_norm', keep='first')
    removed = initial_count - len(with_email)
    
    if removed > 0:
        print(f"   -> Removed {removed} duplicates.")
    
    with_email = with_email.drop(columns=['email_norm', 'completeness'])
    without_email = without_email.drop(columns=['completeness'])
    
    final_df = pd.concat([with_email, without_email], ignore_index=True)
    
    # 6. Save Master
    final_df.to_csv(master_file, index=False)
    print(f"✅ Successfully updated {os.path.basename(master_file)}")
    print(f"   Total records: {len(final_df)}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()