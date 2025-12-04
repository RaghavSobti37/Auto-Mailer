import os
import csv

def merge_csv_files(file_paths, output_path):
    """
    Merges multiple CSV files into a single file.
    It combines headers from all files and handles missing columns in rows
    by leaving them blank.
    """
    all_rows = []

    # Define a mapping for common column names to a standard name.
    # This will merge 'name' and 'Name' into a single 'Name' column, etc.
    header_map = {
        'name': 'Name',
        'email': 'Email',
        'number': 'Mobile',
        'mobile': 'Mobile',
        'city': 'City',
        'gender': 'Gender'
    }

    print("Starting merge process...")

    # 1. Read all files and collect rows and headers
    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"  [WARN] File not found, skipping: {file_path}")
            continue
        
        print(f"  -> Reading data from: {file_path}")
        try:
            with open(file_path, 'r', newline='', encoding='utf-8-sig') as infile: # 'utf-8-sig' handles BOM
                reader = csv.DictReader(infile)
                headers = reader.fieldnames
                if not headers:
                    print(f"  [WARN] File is empty or has no headers, skipping: {file_path}")
                    continue
                
                for row in reader:
                    processed_row = {}
                    for key, value in row.items():
                        if key is None: continue # Skip columns with no header
                        # Normalize the key and map it to the standard header
                        standard_key = header_map.get(key.lower().strip(), key)
                        processed_row[standard_key] = value
                    all_rows.append(processed_row)
        except Exception as e:
            print(f"  [ERROR] Could not read {file_path}: {e}")

    if not all_rows:
        print("\nNo data was found to merge. Exiting.")
        return

    # Determine the final, ordered set of headers from all processed rows
    all_headers_set = set()
    for row in all_rows:
        all_headers_set.update(row.keys())
    
    preferred_order = ['Name', 'Email', 'Mobile', 'City', 'Gender']
    final_headers = [h for h in preferred_order if h in all_headers_set]
    other_headers = sorted([h for h in all_headers_set if h not in preferred_order])
    final_headers.extend(other_headers)

    # 2. Write the combined data to the output file
    print(f"\nWriting combined data to: {output_path}")
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=final_headers, restval='')
            writer.writeheader()
            writer.writerows(all_rows)
        
        print("\n--- Merge Complete ---")
        print(f"Successfully merged {len(all_rows)} rows into '{output_path}'.")
        print(f"Final columns are: {', '.join(final_headers)}")

    except IOError as e:
        print(f"  [ERROR] Could not write to output file '{output_path}': {e}")

if __name__ == '__main__':
    # --- Configuration ---
    # Dynamically determine the project's base directory
    # This avoids hardcoding paths and makes the script portable
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir) # Go up one level from 'utils'

    # List of CSV files to merge. Add more files here if needed.
    input_files = [
        os.path.join(base_dir, 'csv', 'test_leads_cleaned.csv'),
        os.path.join(base_dir, 'csv', 'submission_data.csv')
    ]

    # The final, merged database file
    output_file = os.path.join(base_dir, 'csv', 'Shakti DB.csv')
    # --- End Configuration ---

    merge_csv_files(input_files, output_file)
