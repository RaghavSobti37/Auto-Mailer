"""Utility functions for data processing."""

import pandas as pd
import os
import re


def parse_multiline_contact_column(df):
    """
    Identifies and parses columns with contact info embedded in multiline strings.
    It looks for a column with 'name', 'phone', and 'place' in its header.
    If found, it extracts the data into 'name', 'number', and 'city' columns.
    This function modifies the DataFrame in place.
    """
    complex_col_signature = ['name', 'phone', 'place']
    target_col = None

    for col in df.columns:
        if all(keyword in col for keyword in complex_col_signature):
            target_col = col
            break
    
    if not target_col:
        return  # No complex column found

    print(f"  -> Found complex contact column: '{target_col}'. Attempting to parse.")

    def extract_info(cell_content):
        """Parses a single cell to extract name, number, and city."""
        if not isinstance(cell_content, str):
            return pd.Series([None, None, None], index=['parsed_name', 'parsed_number', 'parsed_city'])

        lines = [line.strip() for line in cell_content.split('\n')]
        name, number, city = None, None, None

        if lines:
            name = re.sub(r'^(name\s*[:\-])?\s*', '', lines[0], flags=re.IGNORECASE).strip()

        phone_match = re.search(r'\b([7-9]\d{9})\b', cell_content)
        if phone_match:
            number = phone_match.group(1)

        city_match = re.search(r'place\s*[:\-\s]\s*(.*)', cell_content, re.IGNORECASE)
        if city_match:
            city = city_match.group(1).split('\n')[0].strip()

        return pd.Series([name, number, city], index=['parsed_name', 'parsed_number', 'parsed_city'])

    parsed_data = df[target_col].apply(extract_info)

    for col_name in ['name', 'number', 'city']:
        if col_name not in df.columns:
            df[col_name] = pd.NA
        df[col_name].fillna(parsed_data[f'parsed_{col_name}'], inplace=True)
    
    print(f"  -> Successfully parsed and populated 'name', 'number', 'city' from complex column.")


def read_and_standardize_data(source_path):
    """
    Reads a data source (Excel or CSV) and standardizes column names.
    
    Args:
        source_path: Path to the source file
    
    Returns:
        Tuple of (DataFrame, number of records, list of original columns)
    """
    # Comprehensive column name mapping
    RENAME_MAP = {
        # Common variations for 'name'
        'name': 'name', 'full name': 'name', 'participant name': 'name', 'student name': 'name',
        # Common variations for 'email'
        'email': 'email', 'email id': 'email', 'email address': 'email', 'e-mail': 'email',
        # Common variations for 'number'
        'number': 'number', 'contact no': 'number', 'contact number': 'number', 'phone': 'number',
        'phone no': 'number', 'phone number': 'number', 'mobile': 'number', 'mobile no': 'number',
        'mobile number': 'number',
        # Common variations for 'city'
        'city': 'city', 'hometown': 'city', 'location': 'city',
    }

    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source file not found: '{source_path}'")

    try:
        if source_path.endswith('.xlsx'):
            # Load all sheets from the Excel file into a dictionary of DataFrames
            all_sheets_dict = pd.read_excel(source_path, sheet_name=None, dtype=str)
            # Combine all sheets into a single DataFrame
            df = pd.concat(all_sheets_dict.values(), ignore_index=True)
            print(f"  -> Found and combined {len(all_sheets_dict)} sheets: {list(all_sheets_dict.keys())}")
        else:  # Assuming .csv
            df = pd.read_csv(source_path, dtype=str)

        initial_count = len(df)
        if initial_count == 0:
            raise ValueError("File is empty")

        print(f"  -> Found {initial_count} records in the source.")
        original_columns = list(df.columns)
        print(f"  -> Original columns: {original_columns}")

        # Standardize column names (convert to string, lowercase, strip whitespace)
        df.columns = [str(col).lower().strip() for col in df.columns]
        print(f"  -> Standardized columns: {list(df.columns)}")

        # Attempt to parse complex multiline columns before renaming
        parse_multiline_contact_column(df)

        # Apply the flexible rename map
        df.rename(columns=RENAME_MAP, inplace=True)
        print(f"  -> Columns after rename: {list(df.columns)}")

        return df, initial_count, original_columns

    except Exception as e:
        print(f"  -> ERROR reading file: {e}")
        raise


def prepare_contacts_for_db(df, required_columns=['name', 'email', 'number', 'city', 'gender']):
    """
    Prepares a DataFrame for addition to the master database.
    
    Args:
        df: Input DataFrame
        required_columns: Columns to extract/validate
    
    Returns:
        Processed DataFrame with only required columns
    """
    # Remove duplicate columns (keep first occurrence)
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated(keep='first')]
    
    # Determine which columns are actually present
    cols_to_keep = [col for col in required_columns if col in df.columns]

    if 'email' not in cols_to_keep and 'number' not in cols_to_keep:
        raise ValueError("Neither 'email' nor 'number' column found. Cannot process this file.")

    print(f"  -> Columns identified for extraction: {cols_to_keep}")

    processed_df = df[cols_to_keep].copy()
    initial_row_count = len(processed_df)

    # Define the subset of columns to check for missing values
    subset_to_check = [col for col in ['email', 'number'] if col in processed_df.columns]

    if subset_to_check:
        processed_df.dropna(subset=subset_to_check, how='all', inplace=True)

    print(f"  -> Kept {len(processed_df)} of {initial_row_count} rows after filtering for contacts with an email or number.")

    return processed_df
