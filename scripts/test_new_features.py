"""
Test script to demonstrate new features: spam filtering, country code detection, and data cleaning.
"""
import sys
import os
import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from consolidate_and_clean import (
    remove_problematic_characters,
    detect_country_code,
    is_spam_entry
)

def test_problematic_characters():
    """Test removal of problematic characters"""
    print("\n" + "="*60)
    print("TEST 1: REMOVING PROBLEMATIC CHARACTERS")
    print("="*60)
    
    test_cases = [
        'John "Smith" O\'Brien',
        'Apple Inc "All Rights Reserved"',
        'Sarah\'s Music Studio - NYC',
        'Cafe "La" Musique',
    ]
    
    for text in test_cases:
        cleaned = remove_problematic_characters(text)
        print(f"Original: {text}")
        print(f"Cleaned:  {cleaned}\n")


def test_country_code_detection():
    """Test country code detection based on phone digits"""
    print("\n" + "="*60)
    print("TEST 2: COUNTRY CODE DETECTION FROM PHONE NUMBERS")
    print("="*60)
    
    test_numbers = [
        ('9876543210', 'India (10 digits)'),
        ('9123456789', 'India (10 digits)'),
        ('01923456789', 'Bangladesh (11 digits)'),
        ('923004567890', 'Pakistan (11 digits)'),
        ('9412345678', 'Sri Lanka (9 digits)'),
        ('08012345678', 'Taiwan (8 digits)'),
        ('1234567', 'Mauritius (7 digits)'),
        ('', 'Empty number'),
    ]
    
    for number, description in test_numbers:
        code = detect_country_code(number)
        print(f"Number: {number:20} ({description:25}) -> {code}")


def test_spam_detection():
    """Test spam/garbage entry detection"""
    print("\n" + "="*60)
    print("TEST 3: SPAM/GARBAGE ENTRY DETECTION")
    print("="*60)
    
    test_entries = [
        {
            'name': 'John Smith',
            'email': 'john@gmail.com',
            'city': 'Mumbai'
        },
        {
            'name': 'Apple Inc All Rights Reserved',
            'email': 'apple@apple.com',
            'city': 'Mumbai'
        },
        {
            'name': 'If Cybercrimes Increases I Will Never Spare U',
            'email': 'spam@gmail.com',
            'city': 'Terrorist'
        },
        {
            'name': 'Making Fun Of Others Problem',
            'email': 'harrypotterfanonly@gmail.com',
            'city': 'Mumbai'
        },
        {
            'name': 'Httpsmediatenorcomjqekmvbeaaaamspotifylogogif',
            'email': 'uu@glkk.com',
            'city': 'Mumbai'
        },
        {
            'name': 'Jane Doe',
            'email': 'jane.doe@yahoo.com',
            'city': 'Delhi'
        },
        {
            'name': 'Royal Sex Aunty Get Out',
            'email': 'spam2@gmail.com',
            'city': 'Mumbai'
        },
        {
            'name': 'Valid customer from Mumbai',
            'email': 'valid@gmail.com',
            'city': 'Mumbai'
        }
    ]
    
    for i, entry in enumerate(test_entries, 1):
        is_spam = is_spam_entry(entry)
        status = "🚫 SPAM" if is_spam else "✅ VALID"
        print(f"\nEntry {i}: {status}")
        print(f"  Name: {entry['name']}")
        print(f"  Email: {entry['email']}")
        print(f"  City: {entry['city']}")


def test_full_pipeline():
    """Test the full data cleaning pipeline"""
    print("\n" + "="*60)
    print("TEST 4: FULL PIPELINE WITH SAMPLE DATA")
    print("="*60)
    
    # Create sample data with mixed good and bad entries
    data = {
        'name': [
            'John "Smith" O\'Brien',
            'Apple Inc All Rights Reserved',
            'Priya Sharma',
            'Terrorist Out Of India',
            'Valid Artist Name'
        ],
        'email': [
            'john@gmail.com',
            'apple@apple.com',
            'priya@gmail.com',
            'spam@gmail.com',
            'artist@gmail.com'
        ],
        'phone': [
            '9876543210',
            '9123456789',
            '8765432109',
            '7654321098',
            '9012345678'
        ],
        'city': [
            'Mumbai',
            'Cupertino',
            'Delhi',
            'Terrorist Region',
            'Pune'
        ],
        'role in music': [
            'Singer',
            'Apple Employee',
            'Songwriter',
            'Spam Maker',
            'Composer'
        ]
    }
    
    df = pd.DataFrame(data)
    
    print(f"\n📊 BEFORE CLEANING:")
    print(f"  • Total records: {len(df)}")
    print(f"\nData:")
    for idx, row in df.iterrows():
        print(f"  {idx+1}. {row['name']} ({row['email']}) - {row['city']}")
    
    # Apply cleaning
    print(f"\n🧹 APPLYING FILTERS...")
    
    # Remove problematic characters
    for col in ['name', 'city', 'role in music']:
        df[col] = df[col].astype(str).apply(remove_problematic_characters)
    
    # Add country codes
    df['country_code'] = df['phone'].apply(detect_country_code)
    
    # Remove spam
    spam_mask = df.apply(is_spam_entry, axis=1)
    spam_removed = spam_mask.sum()
    df_clean = df[~spam_mask]
    
    print(f"\n📊 AFTER CLEANING:")
    print(f"  • Records removed (spam): {spam_removed}")
    print(f"  • Records remaining: {len(df_clean)}")
    print(f"\nCleaned Data:")
    for idx, row in df_clean.iterrows():
        print(f"  {idx+1}. {row['name']} ({row['email']}) - {row['city']} ({row['country_code']})")
    
    print(f"\n🌍 COUNTRY CODE DISTRIBUTION:")
    for code, count in df_clean['country_code'].value_counts().items():
        print(f"  • {code}: {count} record(s)")


if __name__ == '__main__':
    test_problematic_characters()
    test_country_code_detection()
    test_spam_detection()
    test_full_pipeline()
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED SUCCESSFULLY ✅")
    print("="*60 + "\n")
