import pandas as pd
import os

def create_pending_databases(registered_path, submitted_path, pending_email_path, pending_whatsapp_path):
    """
    Finds users who have registered but not submitted and creates separate CSV files
    for pending emails and WhatsApp numbers.

    Args:
        registered_path (str): Path to the registered users CSV file.
        submitted_path (str): Path to the submitted users CSV file.
        pending_email_path (str): Path to save the pending email users CSV file.
        pending_whatsapp_path (str): Path to save the pending WhatsApp users CSV file.
    """
    try:
        # Load the datasets
        registered_df = pd.read_csv(registered_path)
        print(f"Loaded {len(registered_df)} records from '{registered_path}'.")
        
        submitted_df = pd.read_csv(submitted_path)
        print(f"Loaded {len(submitted_df)} records from '{submitted_path}'.")

    except FileNotFoundError as e:
        print(f"ERROR: File not found - {e}. Please ensure both input files exist.")
        return

    # Ensure email columns are of the same type and format
    registered_df['Email'] = registered_df['Email'].str.lower().str.strip()
    submitted_df['Email'] = submitted_df['Email'].str.lower().str.strip()

    # Find emails that are in the registered set but not in the submitted set
    submitted_emails = set(submitted_df['Email'])
    pending_df = registered_df[~registered_df['Email'].isin(submitted_emails)].copy()

    print(f"\nFound {len(pending_df)} pending users (registered but not submitted).")

    # --- Create and save Pending Email Database ---
    if not pending_df.empty:
        # Select relevant columns for the email database
        pending_email_df = pending_df[['Name', 'Email']].copy()
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(pending_email_path), exist_ok=True)
        
        # Save the pending email database
        pending_email_df.to_csv(pending_email_path, index=False)
        print(f"Successfully saved {len(pending_email_df)} records to '{pending_email_path}'.")

        # --- Create and save Pending WhatsApp Database ---
        # Ensure the 'number' column exists
        if 'Phone Number' in pending_df.columns:
            # Select relevant columns and drop rows with no valid number
            pending_whatsapp_df = pending_df[['Name', 'Phone Number']].copy()
            pending_whatsapp_df.dropna(subset=['Phone Number'], inplace=True)
            
            # Clean the 'Phone Number' column
            pending_whatsapp_df['Phone Number'] = pending_whatsapp_df['Phone Number'].astype(str).str.replace(r'\D', '', regex=True)
            pending_whatsapp_df.dropna(subset=['Phone Number'], inplace=True)
            # Also remove empty strings that may have resulted from cleaning
            pending_whatsapp_df = pending_whatsapp_df[pending_whatsapp_df['Phone Number'] != '']
            pending_whatsapp_df = pending_whatsapp_df[pending_whatsapp_df['Phone Number'].str.len() >= 10]

            # Ensure numbers are integers (if they were loaded as floats)
            if not pending_whatsapp_df.empty:
                pending_whatsapp_df['Phone Number'] = pd.to_numeric(pending_whatsapp_df['Phone Number'], errors='coerce')
                pending_whatsapp_df.dropna(subset=['Phone Number'], inplace=True)
                if not pending_whatsapp_df.empty:
                    pending_whatsapp_df['Phone Number'] = pending_whatsapp_df['Phone Number'].astype('Int64')

            if not pending_whatsapp_df.empty:
                # Ensure the output directory exists
                os.makedirs(os.path.dirname(pending_whatsapp_path), exist_ok=True)
                
                # Save the pending WhatsApp database
                pending_whatsapp_df.to_csv(pending_whatsapp_path, index=False)
                print(f"Successfully saved {len(pending_whatsapp_df)} records to '{pending_whatsapp_path}'.")
            else:
                print("No valid WhatsApp numbers found in the pending users list.")
        else:
            print("WARNING: 'Phone Number' column not found in the registered users file. Cannot create WhatsApp database.")
    else:
        print("No pending users to process.")

if __name__ == '__main__':
    # Define base directory for CSV files
    csv_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'csv')

    # Define file paths
    registered_file = os.path.join(csv_dir, 'Listing Customers (1).csv')
    submitted_file = os.path.join(csv_dir, 'Listing Customers.csv')
    pending_email_file = os.path.join(csv_dir, 'pending_email_db.csv')
    pending_whatsapp_file = os.path.join(csv_dir, 'pending_whatsapp_db.csv')

    # Run the function
    create_pending_databases(registered_file, submitted_file, pending_email_file, pending_whatsapp_file)
    print("\nProcess complete.")