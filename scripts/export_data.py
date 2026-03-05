"""
This script allows exporting subsets of the cleaned master database
based on user-defined filters.
"""

import os
import sys
import pandas as pd

def export_data():
    """Main function to handle data export."""
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cleaned_db_path = os.path.join(base_dir, 'data', 'master_db', 'master_db_cleaned.csv')
    exports_dir = os.path.join(base_dir, 'data', 'exports')
    
    os.makedirs(exports_dir, exist_ok=True)
    
    if not os.path.exists(cleaned_db_path):
        print(f"ERROR: Cleaned master database not found at '{cleaned_db_path}'")
        print("Please run the 'consolidate_and_clean.py' script first.")
        return
        
    df = pd.read_csv(cleaned_db_path)
    
    print("
--- DATA EXPORT UTILITY ---")
    print(f"Loaded {len(df)} records from the cleaned master database.")
    
    print("
Available columns for filtering:")
    for col in df.columns:
        print(f"- {col}")
        
    filter_column = input("
Enter the column to filter by (e.g., city): ").strip()
    
    if filter_column not in df.columns:
        print(f"ERROR: Column '{filter_column}' not found in the database.")
        return
        
    filter_value = input(f"Enter the value to filter for in '{filter_column}': ").strip()
    
    # Perform filtering (case-insensitive for string columns)
    if pd.api.types.is_string_dtype(df[filter_column]):
        filtered_df = df[df[filter_column].str.contains(filter_value, case=False, na=False)]
    else:
        # Attempt to convert filter value to the column's type
        try:
            filter_value_coerced = pd.Series(filter_value).astype(df[filter_column].dtype).iloc[0]
            filtered_df = df[df[filter_column] == filter_value_coerced]
        except (ValueError, TypeError):
            print(f"Warning: Could not apply filter value '{filter_value}' to non-string column '{filter_column}'. Trying direct comparison.")
            filtered_df = df[df[filter_column] == filter_value]

    if filtered_df.empty:
        print("
No records found matching your filter criteria.")
        return
        
    print(f"
Found {len(filtered_df)} records matching your criteria.")
    print("Sample of filtered data:")
    print(filtered_df.head())
    
    default_filename = f"export_{filter_column}_{filter_value.replace(' ', '_').lower()}.csv"
    output_filename = input(f"
Enter a filename for the export (default: {default_filename}): ").strip()
    
    if not output_filename:
        output_filename = default_filename
        
    output_path = os.path.join(exports_dir, output_filename)
    
    filtered_df.to_csv(output_path, index=False, encoding='utf-8')
    
    print(f"
✅ Successfully exported {len(filtered_df)} records to '{output_path}'")

if __name__ == '__main__':
    export_data()
