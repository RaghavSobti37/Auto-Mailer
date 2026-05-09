
import pandas as pd
import os
import csv
from datetime import datetime

inventory_path = r'c:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\DATA_INVENTORY.csv'
base_dir = r'c:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer'
output_path = r'c:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\ULTIMATE_MASTER_DATA.csv'

def normalize_columns(df, filename):
    cols = df.columns.tolist()
    mapping = {}
    
    # Name mapping
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['name', 'full name', 'first name', 'name (original name)', 'fullname', '\ufeff"name"']:
            mapping[c] = 'Name'
            break
    
    # Email mapping
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['email', 'email address', 'e-mail', 'email_norm']:
            mapping[c] = 'Email'
            break

    # Phone mapping
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['phone', 'mobile', 'contact', 'number', 'phone number', 'phone_norm', 'contact ( phone / whatsapp )']:
            mapping[c] = 'Phone'
            break

    # City mapping
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['city', 'location', 'city & state', 'city/state']:
            mapping[c] = 'City'
            break

    # State mapping
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['state', 'region']:
            mapping[c] = 'State'
            break

    # Media URL mapping
    for c in cols:
        cl = str(c).lower().strip()
        if any(keyword in cl for keyword in ['link', 'url', 'media', 'sample', 'upload', 'reel', 'track']):
            mapping[c] = 'Media_URL'
            break

    # Role mapping
    for c in cols:
        cl = str(c).lower().strip()
        if any(keyword in cl for keyword in ['role', 'talent', 'category', 'genre', 'define']):
            mapping[c] = 'Role'
            break

    # Timestamp
    for c in cols:
        cl = str(c).lower().strip()
        if cl in ['timestamp', 'date', 'booked on', 'created at']:
            mapping[c] = 'Timestamp'
            break

    return mapping

inventory = pd.read_csv(inventory_path)
master_rows = []

for index, row in inventory.iterrows():
    if row['Exists'] != 'YES':
        continue
        
    rel_path = os.path.join(row['Folder'], row['Filename']).replace('/', os.sep)
    full_path = os.path.join(base_dir, rel_path)
    
    print(f"Processing: {row['Filename']}...")
    
    try:
        if row['Filename'].endswith('.csv'):
            try:
                df = pd.read_csv(full_path, encoding='utf-8', on_bad_lines='skip')
            except UnicodeDecodeError:
                df = pd.read_csv(full_path, encoding='latin1', on_bad_lines='skip')
        elif row['Filename'].endswith('.xlsx'):
            df = pd.read_excel(full_path)
        else:
            continue

        # Ensure unique columns before mapping
        df.columns = [str(c).strip() for c in df.columns]
        
        mapping = normalize_columns(df, row['Filename'])
        
        # Take only the standard columns, if multiple match (unlikely with my logic but good to be safe)
        unique_mapping = {}
        for old, new in mapping.items():
            if new not in unique_mapping.values():
                unique_mapping[old] = new
        
        df_final = df[list(unique_mapping.keys())].copy()
        df_final = df_final.rename(columns=unique_mapping)
        
        # Add tags
        df_final['Origin_Source'] = row['Origin / Source']
        df_final['Destination'] = row['Destination / Used For']
        df_final['Campaign'] = row['Campaign']
        df_final['Data_Type'] = row['Data Type']
        df_final['Date_Created_File'] = row['Date Created']
        df_final['Date_Modified_File'] = row['Date Modified']
        df_final['Source_Filename'] = row['Filename']
        
        # Reset index to avoid index-based concat issues
        df_final = df_final.reset_index(drop=True)
        
        master_rows.append(df_final)
        
    except Exception as e:
        print(f"Error processing {row['Filename']}: {e}")

if master_rows:
    print("\nConcatenating all dataframes...")
    ultimate_master = pd.concat(master_rows, ignore_index=True)
    
    # Final cleanup: reorder columns
    final_cols = ['Name', 'Email', 'Phone', 'City', 'State', 'Role', 'Media_URL', 'Timestamp', 
                  'Origin_Source', 'Destination', 'Campaign', 'Data_Type', 
                  'Date_Created_File', 'Date_Modified_File', 'Source_Filename']
    
    # Ensure all columns exist
    for col in final_cols:
        if col not in ultimate_master.columns:
            ultimate_master[col] = ''
            
    ultimate_master = ultimate_master[final_cols]
    
    # Optional: basic data cleaning (strip strings)
    print("Cleaning data...")
    for col in ultimate_master.columns:
        ultimate_master[col] = ultimate_master[col].astype(str).str.strip().replace('nan', '').replace('None', '').replace('<NA>', '')

    # Save
    ultimate_master.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\nSUCCESS! Ultimate master created at: {output_path}")
    print(f"Total records: {len(ultimate_master)}")
else:
    print("No data processed.")
