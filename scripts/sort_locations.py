"""
Script to sort and count participants from Delhi and NCR regions.
"""
import os
import pandas as pd

def sort_and_count_locations():
    # Define paths
    # Assumes script is in /scripts/ folder, so go up one level to root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    
    # Target file
    input_file = os.path.join(data_dir, 'Delhi GMI auditions 22nd Feb.csv')
    
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        print(f"   Please ensure the merge script has run and created the file.")
        return

    print(f"Reading file: {input_file}")
    try:
        # Use python engine and skip bad lines to handle parsing errors (e.g. extra commas)
        try:
            df = pd.read_csv(input_file, on_bad_lines='warn', engine='python')
        except TypeError:
            df = pd.read_csv(input_file, error_bad_lines=False, engine='python')
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return
    
    # Normalize column names to lowercase for easier searching
    df.columns = [str(c).lower().strip() for c in df.columns]
    
    # Find city column dynamically
    city_col = None
    possible_names = ['city', 'location', 'current city', 'state', 'address', 'hometown']
    for col in df.columns:
        if any(p in col for p in possible_names):
            city_col = col
            break
            
    if not city_col:
        print("❌ Could not find 'City' column in the CSV.")
        print(f"   Available columns: {list(df.columns)}")
        return

    print(f"✅ Using column '{city_col}' for location data.")

    # Define NCR Keywords (Cities around Delhi)
    ncr_keywords = [
        'delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 
        'ghaziabad', 'faridabad', 'greater noida', 'sonipat', 
        'panipat', 'meerut', 'rohtak', 'karnal'
    ]
    
    # Initialize Counters
    ncr_count = 0
    other_count = 0
    unknown_count = 0
    
    # Detailed breakdown for NCR cities
    city_breakdown = {}
    
    print("\nProcessing records...")
    
    for idx, row in df.iterrows():
        val = row[city_col]
        
        # Check for empty values
        if pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '':
            unknown_count += 1
            continue
            
        val_str = str(val).lower()
        
        # Check if location matches any NCR keyword
        is_ncr = False
        matched_keyword = "Other NCR"
        
        for kw in ncr_keywords:
            if kw in val_str:
                is_ncr = True
                matched_keyword = kw.title()
                # Group New Delhi with Delhi
                if matched_keyword == 'New Delhi': matched_keyword = 'Delhi'
                # Group Gurugram with Gurgaon
                if matched_keyword == 'Gurugram': matched_keyword = 'Gurgaon'
                break
        
        if is_ncr:
            ncr_count += 1
            # Add to specific city count
            city_breakdown[matched_keyword] = city_breakdown.get(matched_keyword, 0) + 1
        else:
            other_count += 1

    # --- Generate Report ---
    print("\n" + "="*50)
    print("📍 LOCATION BREAKDOWN REPORT")
    print("="*50)
    print(f"Total Participants: {len(df)}")
    print("-" * 30)
    print(f"{'Region':<25} | {'Count':<5}")
    print("-" * 30)
    print(f"{'Delhi & NCR (Total)':<25} | {ncr_count:<5}")
    print(f"{'Outside NCR':<25} | {other_count:<5}")
    print(f"{'Unknown/Blank':<25} | {unknown_count:<5}")
    print("-" * 30)
    
    if ncr_count > 0:
        print("\n🏙️  NCR City Breakdown:")
        print("-" * 30)
        # Sort by count descending
        for city, count in sorted(city_breakdown.items(), key=lambda x: x[1], reverse=True):
            print(f"{city:<25} | {count:<5}")
        print("-" * 30)

if __name__ == "__main__":
    sort_and_count_locations()
