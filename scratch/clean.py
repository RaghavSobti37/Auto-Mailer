import pandas as pd
import os

def clean_data(file_path):
    print(f"Reading {file_path}...")
    df = pd.read_csv(file_path, low_memory=False)
    initial_count = len(df)
    
    # Clean phone numbers
    df['Phone'] = df['Phone'].astype(str)
    df['Phone'] = df['Phone'].str.replace(r'\.0$', '', regex=True)
    df['Phone'] = df['Phone'].replace('nan', '')
    
    # Remove test data
    test_mask = (
        df['Email'].fillna('').str.contains('test', case=False, na=False) |
        df['Name'].fillna('').str.contains('test', case=False, na=False)
    )
    df = df[~test_mask]
    
    # Drop empty records
    df = df.dropna(subset=['Email', 'Phone'], how='all')
    
    # Final deduplicate just in case
    df = df.drop_duplicates(subset=['Email', 'Phone'], keep='first')
    
    final_count = len(df)
    print(f"Initial rows: {initial_count}")
    print(f"Final rows: {final_count}")
    print(f"Removed {initial_count - final_count} rows.")
    
    temp_file = file_path + ".temp"
    df.to_csv(temp_file, index=False)
    
    # Try replacing
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(temp_file, file_path)
        print("Done.")
    except Exception as e:
        print(f"Error replacing file: {e}")
        print(f"Cleaned data saved to {temp_file} instead.")

if __name__ == '__main__':
    clean_data('ULTIMATE_MASTER_DATA.csv')
