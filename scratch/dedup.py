import pandas as pd
import sys

def remove_duplicates(file_path):
    print(f"Reading {file_path}...")
    df = pd.read_csv(file_path, low_memory=False)
    initial_count = len(df)
    
    # Drop duplicates based on Email and Phone
    df_dedup = df.drop_duplicates(subset=['Email', 'Phone'], keep='first')
    
    final_count = len(df_dedup)
    print(f"Initial rows: {initial_count}")
    print(f"Final rows: {final_count}")
    print(f"Removed {initial_count - final_count} duplicates.")
    
    df_dedup.to_csv(file_path, index=False)
    print("Done.")

if __name__ == '__main__':
    remove_duplicates('ULTIMATE_MASTER_DATA.csv')
