#!/usr/bin/env python3
"""
WhatsApp database generation and cleaning script.

Creates a WhatsApp-specific database from the master database,
filtering for valid phone numbers and formatting them appropriately.
"""

import os
import pandas as pd
import re

DATA_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'csv')


def generate_whatsapp_db(cleaned_db_path, whatsapp_db_path):
    """
    Create WhatsApp database from cleaned master database.
    
    Filters for rows with valid phone numbers and extracts
    name, number, and city columns.
    """
    if not os.path.exists(cleaned_db_path):
        print(f"❌ Error: Cleaned master DB not found at '{cleaned_db_path}'.")
        return

    print(f"\n--- Step 1: Reading Cleaned Master Database ---")
    print(f"Reading data from: {os.path.basename(cleaned_db_path)}")

    try:
        df = pd.read_csv(cleaned_db_path, dtype=str)
        initial_count = len(df)
        print(f"  -> Found {initial_count} total records in the cleaned master DB.")

        # Drop rows where 'number' column is missing
        df.dropna(subset=['number'], inplace=True)

        # Ensure 'number' is string and not empty
        df['number'] = df['number'].astype(str)
        df = df[df['number'].str.strip() != '']

        valid_phone_count = len(df)
        print(f"  -> Found {valid_phone_count} records with a phone number.")

        if valid_phone_count == 0:
            print("  -> No records with phone numbers found. Exiting.")
            return

        # Select columns for WhatsApp database
        whatsapp_cols = ['name', 'number', 'city']
        whatsapp_df = df[whatsapp_cols].copy()

        print(f"\n--- Step 2: Saving Raw WhatsApp Database ---")
        print(f"  -> Saving {len(whatsapp_df)} records to '{os.path.basename(whatsapp_db_path)}'.")

        whatsapp_df.to_csv(whatsapp_db_path, index=False, encoding='utf-8')

        print(f"✅ Successfully created '{os.path.basename(whatsapp_db_path)}'.")
        print("\n--- Sample of Raw WhatsApp DB ---")
        print(whatsapp_df.head())
        print("-----------------------------\n")

    except Exception as e:
        print(f"❌ An error occurred: {e}")


def clean_whatsapp_db(whatsapp_db_path, cleaned_whatsapp_db_path):
    """
    Clean and format the WhatsApp database.
    
    Standardizes phone numbers to 10-digit format and
    cleans city names.
    """
    if not os.path.exists(whatsapp_db_path):
        print(f"❌ Error: Raw WhatsApp DB not found at '{whatsapp_db_path}'.")
        return

    print(f"--- Step 3: Cleaning WhatsApp Database ---")
    df = pd.read_csv(whatsapp_db_path, dtype=str)
    print(f"  -> Read {len(df)} records from '{os.path.basename(whatsapp_db_path)}'.")

    # Clean phone numbers
    def format_phone_number(num):
        if pd.isna(num):
            return None
        num_str = re.sub(r'\D', '', str(num))
        
        if len(num_str) == 12 and num_str.startswith('91'):
            return num_str[2:]  # Remove '91' prefix
        elif len(num_str) == 11 and num_str.startswith('0'):
            return num_str[1:]  # Remove leading '0'
        elif len(num_str) == 10:
            return num_str  # Already correct
        else:
            return num_str

    df['number'] = df['number'].apply(format_phone_number)
    print("  -> Standardized phone numbers.")

    # Clean city names
    df['city'] = df['city'].astype(str).str.split(r'[,/-]').str[0].str.strip().str.title()
    print("  -> Cleaned city names.")

    # Remove invalid rows
    df.dropna(subset=['name', 'number', 'city'], how='any', inplace=True)
    df = df[df['number'].str.strip().str.len() >= 10]

    print(f"\n--- Step 4: Saving Cleaned WhatsApp Database ---")
    print(f"  -> Saving {len(df)} cleaned records to '{os.path.basename(cleaned_whatsapp_db_path)}'.")

    df.to_csv(cleaned_whatsapp_db_path, index=False, encoding='utf-8')

    print(f"✅ Successfully created '{os.path.basename(cleaned_whatsapp_db_path)}'.")
    print("\n--- Sample of Cleaned WhatsApp DB ---")
    print(df.head())
    print("-------------------------------------\n")


if __name__ == '__main__':
    cleaned_db_file = 'master_db_cleaned.csv'
    whatsapp_db_file = 'whatsapp_db.csv'
    cleaned_whatsapp_db_file = 'whatsapp_db_cleaned.csv'

    cleaned_db_path = os.path.join(DATA_FOLDER, cleaned_db_file)
    whatsapp_db_path = os.path.join(DATA_FOLDER, whatsapp_db_file)
    cleaned_whatsapp_db_path = os.path.join(DATA_FOLDER, cleaned_whatsapp_db_file)

    # Generate and clean WhatsApp database
    generate_whatsapp_db(cleaned_db_path, whatsapp_db_path)
    clean_whatsapp_db(whatsapp_db_path, cleaned_whatsapp_db_path)
