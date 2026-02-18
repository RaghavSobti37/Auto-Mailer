"""
Script to extract and clean data from the Contact Information CSV.
"""
import os
import pandas as pd
import re

def extract_clean_data():
    # Determine paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Check if we are in scripts/ or root
    if os.path.basename(script_dir) == 'scripts':
        base_dir = os.path.dirname(script_dir)
    else:
        base_dir = script_dir
        
    data_dir = os.path.join(base_dir, 'data')
    
    print(f"Scanning directory: {data_dir}")
    
    # Find the specific file (fuzzy match)
    target_file = None
    original_filename = ""
    
    for f in os.listdir(data_dir):
        # Look for the file mentioned by user
        if "Contact Information" in f and f.endswith(".csv") and "Cleaned" not in f:
            target_file = os.path.join(data_dir, f)
            original_filename = f
            break
            
    if not target_file:
        print("❌ Could not find the 'Contact Information' CSV file in the data folder.")
        return

    print(f"📂 Found file: {original_filename}")
    
    try:
        # Try reading with utf-8-sig to handle BOM
        df = pd.read_csv(target_file, encoding='utf-8-sig', dtype=str)
    except:
        print("⚠️ UTF-8 failed, trying latin1 encoding...")
        df = pd.read_csv(target_file, encoding='latin1', dtype=str)
        
    print(f"   Columns found: {list(df.columns)}")
    
    # Strip whitespace from column names to fix "Name " vs "Name" issues
    df.columns = [str(c).strip() for c in df.columns]
    
    # DEBUG: Dump headers to file
    with open(os.path.join(data_dir, "debug_headers.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(df.columns))
    print(f"   -> Saved headers to debug_headers.txt")
    
    # DEBUG: Dump raw data preview
    debug_data_path = os.path.join(data_dir, "debug_raw_data.csv")
    df.head(10).to_csv(debug_data_path, index=False)
    print(f"   -> Saved raw data preview to debug_raw_data.csv")
    
    # Create new clean dataframe
    new_df = pd.DataFrame()
    
    def validate_col(col, col_type):
        if not col_type: return True
        
        # Get non-empty values for sampling
        sample = df[col].dropna().astype(str)
        sample = sample[sample != ''].head(20).tolist()
        
        if not sample:
            print(f"      ⚠️  Skipping '{col}': Column appears empty")
            return False
            
        if col_type == 'name':
            # Check if looks like phone numbers (mostly digits after stripping symbols)
            # Removes spaces, dashes, pluses, parens
            digit_count = sum(1 for x in sample if re.sub(r'[\s\-\+\(\)]', '', x).isdigit())
            if digit_count > len(sample) * 0.5:
                print(f"      ⚠️  Skipping '{col}': Looks like phone numbers (Sample: {sample[:3]})")
                return False
            # Check if looks like email
            email_count = sum(1 for x in sample if '@' in x)
            if email_count > len(sample) * 0.5:
                print(f"      ⚠️  Skipping '{col}': Looks like emails")
                return False
                
        elif col_type == 'email':
            # Check if looks like email
            email_count = sum(1 for x in sample if '@' in x)
            if email_count < len(sample) * 0.5:
                print(f"      ⚠️  Skipping '{col}': Does not look like emails (Sample: {sample[:3]})")
                return False
                
        return True

    # Helper to find columns
    def get_col(keywords, exclusions=None, col_type=None):
        if exclusions is None: exclusions = []
        print(f"\n   🔎 DEBUG: Searching for {keywords}")
        print(f"      Exclusions: {exclusions}")
        
        # 1. Exact match
        for k in keywords:
            if k in df.columns:
                if validate_col(k, col_type):
                    print(f"      -> Found EXACT match: '{k}'")
                    return k
        # 2. Case insensitive
        for k in keywords:
            for col in df.columns:
                if k.lower() == col.lower():
                    if validate_col(col, col_type):
                        print(f"      -> Found CASE INSENSITIVE match: '{col}'")
                        return col
        # 3. Partial match with exclusions
        for k in keywords:
            for col in df.columns:
                # Check exclusions
                is_excluded = False
                for ex in exclusions:
                    if ex in col.lower():
                        print(f"      -> Skipping '{col}' because it contains exclusion '{ex}'")
                        is_excluded = True
                        break
                if is_excluded:
                    continue
                
                if k.lower() in col.lower():
                    if validate_col(col, col_type):
                        print(f"      -> Found PARTIAL match: '{col}' (contains '{k}')")
                        return col
        return None

    # Map columns
    mappings = {
        'name': (
            ['Name of the Artist', 'Name', 'Full Name', 'Participant Name', 'Your Name', 'Artist Name'],
            ['number', 'phone', 'mobile', 'email', 'timestamp', 'date', 'id', 'whatsapp']
        ),
        'email': (
            ['Email Address', 'Email', 'Email Id', 'Username', 'E-mail'],
            ['number', 'phone', 'mobile']
        )
    }
    
    print("\nMapping columns:")
    for target, (keywords, exclusions) in mappings.items():
        found = get_col(keywords, exclusions, col_type=target)
        if found:
            new_df[target] = df[found]
            print(f"   ✅ {target.ljust(15)} <- {found}")
            print(f"      Sample data: {df[found].head(3).tolist()}")
            
            if target == 'name':
                debug_path = os.path.join(data_dir, "debug_name_column.csv")
                df[[found]].to_csv(debug_path, index=False)
                print(f"      -> Exported name column to: {debug_path}")
        else:
            new_df[target] = ''
            print(f"   ❌ {target.ljust(15)} <- Not Found")

    # Save to new file
    output_filename = "Cleaned_Contact_Info_Manual.csv"
    output_path = os.path.join(data_dir, output_filename)
    new_df.to_csv(output_path, index=False)
    
    print(f"\n✨ Created cleaned file: {output_filename}")
    print(f"   Records: {len(new_df)}")
    print("\n👉 Now run 'test.py' (Option 5) again.")
    print(f"⚠️  IMPORTANT: Please MOVE or RENAME '{original_filename}' to something not ending in .csv")
    print("    (e.g. change extension to .bak) so it doesn't get merged twice!")

if __name__ == "__main__":
    extract_clean_data()