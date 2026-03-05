import os
import pandas as pd
import re

def clean_phone(val):
    """
    Normalizes phone number to 10 digits.
    Handles scientific notation, +91 prefix, spaces, etc.
    """
    if pd.isna(val):
        return None
    
    s_val = str(val).strip()
    
    # Handle scientific notation if it occurs (e.g. from Excel CSV save)
    try:
        f_val = float(s_val)
        s_val = str(int(f_val))
    except ValueError:
        pass
        
    # Remove non-digits
    digits = re.sub(r'\D', '', s_val)
    
    # Take last 10 digits
    if len(digits) >= 10:
        return digits[-10:]
    
    return None

def main():
    # Setup paths
    # Assuming this script is in Auto-Mailer/scripts/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    
    source_path = os.path.join(data_dir, 'Delhi GMI auditions 22nd Feb.csv')
    filter_path = os.path.join(data_dir, 'Havells mYOUsic confirmation2 FAILED AUDIENCE FAILED AUDIENCE.csv')
    output_path = os.path.join(data_dir, 'failed complete data.csv')
    
    print(f"Source: {source_path}")
    print(f"Filter: {filter_path}")
    
    if not os.path.exists(source_path):
        print("❌ Source file not found.")
        return
    if not os.path.exists(filter_path):
        print("❌ Filter file not found.")
        return
        
    # Read files
    print("Reading files...")
    try:
        df_source = pd.read_csv(source_path, dtype=str)
        df_filter = pd.read_csv(filter_path, dtype=str)
    except Exception as e:
        print(f"❌ Error reading CSVs: {e}")
        return
        
    print(f"Source records: {len(df_source)}")
    print(f"Filter records: {len(df_filter)}")
    
    # Identify phone columns
    # Source usually has 'phone', Filter usually has 'Mobile Number'
    source_phone_col = next((col for col in df_source.columns if 'phone' in col.lower() or 'number' in col.lower() or 'mobile' in col.lower()), None)
    filter_phone_col = next((col for col in df_filter.columns if 'phone' in col.lower() or 'number' in col.lower() or 'mobile' in col.lower()), None)
    
    if not source_phone_col or not filter_phone_col:
        print(f"❌ Could not identify phone columns.\n   Source candidates: {list(df_source.columns)}\n   Filter candidates: {list(df_filter.columns)}")
        return
        
    print(f"Matching on Source['{source_phone_col}'] and Filter['{filter_phone_col}']")
    
    # Normalize and Match
    source_phones = df_source[source_phone_col].apply(clean_phone)
    filter_phones = set(df_filter[filter_phone_col].apply(clean_phone).dropna())
    
    df_matched = df_source[source_phones.isin(filter_phones)].copy()
    
    print(f"✅ Matched {len(df_matched)} records.")
    df_matched.to_csv(output_path, index=False)
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    main()