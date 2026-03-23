
import pandas as pd
import numpy as np
import os
import re
from deep_translator import GoogleTranslator

def clean_name(name):
    """
    Cleans the name by removing parenthetical text, common device names, and translating it to English.
    """
    if not isinstance(name, str):
        return ""

    # Translate to English if necessary (and not ASCII)
    if not name.isascii():
        try:
            # Let GoogleTranslator auto-detect the source language
            name = GoogleTranslator(source='auto', target='en').translate(name)
        except Exception as e:
            print(f"Could not translate '{name.encode('utf-8', 'ignore')}': {str(e).encode('utf-8', 'ignore')}")


    # Remove text in parentheses
    cleaned_name = re.sub(r'\(.*\)', '', name).strip()
    
    # Remove common device names and possessives
    device_names = ['iPhone', 'iPad', 'Galaxy', 'Xiaomi', 'Redmi', 'OnePlus', 'vivo', 'Oppo', 'Samsung']
    for device in device_names:
        cleaned_name = re.sub(rf'(\b{device}\b|\'s\s*{device})', '', cleaned_name, flags=re.IGNORECASE).strip()
        
    # Remove "'s" from the end of the name
    cleaned_name = re.sub(r"\'s$", '', cleaned_name).strip()
    
    return cleaned_name

def find_match(name, db_df):
    """
    Finds a match for a given name in the database DataFrame.

    Args:
        name (str): The name to search for.
        db_df (pd.DataFrame): The database DataFrame.

    Returns:
        tuple: A tuple containing the match type, email, and phone number.
    """
    cleaned_name = clean_name(name)

    if not cleaned_name:
        return 'no_match', None, None

    # Exact match
    exact_match = db_df[db_df['name'] == cleaned_name]
    if not exact_match.empty:
        return 'exact', exact_match.iloc[0]['email'], exact_match.iloc[0]['phone']

    # Case-insensitive match
    ci_match = db_df[db_df['name'].str.lower() == cleaned_name.lower()]
    if not ci_match.empty:
        return 'case-insensitive', ci_match.iloc[0]['email'], ci_match.iloc[0]['phone']
    
    # Check if cleaned name is empty or too short
    if len(cleaned_name) <= 2:
        return 'ambiguous_short_name', None, None
        
    # Use word boundaries for partial match, starting at the beginning of the string
    partial_matches = db_df[db_df['name'].str.contains(rf'^{re.escape(cleaned_name)}\b', case=False, regex=True)]
    if not partial_matches.empty:
        return 'partial', None, partial_matches[['name', 'email', 'phone']].to_dict('records')

    return 'no_match', None, None


def fill_missing_data(source_file, db_file, output_file):
    """
    Fills missing email and phone numbers in a source CSV file using a database CSV file.

    Args:
        source_file (str): Path to the source CSV file with missing data.
        db_file (str): Path to the database CSV file.
        output_file (str): Path to save the updated CSV file.
    """
    print(f"Loading source file: {source_file}")
    source_df = pd.read_csv(source_file)
    print(f"Loading database file: {db_file}")
    db_df = pd.read_csv(db_file)

    source_df['match_type'] = 'no_match'
    source_df['potential_matches'] = ''

    total_rows = len(source_df)
    print(f"Processing {total_rows} rows...")
    for index, row in source_df.iterrows():
        if (index + 1) % 100 == 0:
            print(f"Processed {index + 1}/{total_rows} rows...")

        name = row['Name (original name)']
        match_type, email, phone_or_matches = find_match(name, db_df)

        source_df.at[index, 'match_type'] = match_type

        if match_type in ['exact', 'case-insensitive']:
            if pd.isnull(row['Email']):
                source_df.at[index, 'Email'] = email
            if pd.isnull(row['Phone']):
                source_df.at[index, 'Phone'] = phone_or_matches
        elif match_type == 'partial':
            source_df.at[index, 'potential_matches'] = str(phone_or_matches)


    print(f"Saving updated data to: {output_file}")
    source_df.to_csv(output_file, index=False)
    print("Done.")

if __name__ == "__main__":
    # Get the project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Define file paths
    source_csv = os.path.join(project_root, 'data', 'search', 'TSC Academy - SS lead tracker - Attendee Master.csv')
    database_csv = os.path.join(project_root, 'data', 'master_db', 'master_db_cleaned.csv')
    output_csv = os.path.join(project_root, 'data', 'processed', 'TSC Academy - SS lead tracker - Attendee Master_filled.csv')

    # Run the function
    fill_missing_data(source_csv, database_csv, output_csv)
