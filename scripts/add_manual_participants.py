"""
Script to parse manual participant data dump and merge it into the GMI database.
"""
import os
import sys
import pandas as pd
import re
from collections import Counter

# Add parent directory to path to import merge_gmi_data
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)

try:
    from merge_gmi_data import merge_gmi_data
except ImportError:
    # Fallback if running from root
    sys.path.append(os.path.join(parent_dir, 'scripts'))
    from merge_gmi_data import merge_gmi_data

# Raw data provided by user
RAW_DATA = """
16/02/2026 19:19:44 Arjan Dev Singh 23/09/1990 Jaipur, Rajasthan 8094744997 arjan2390@gmail.com Singer, Lyricist, Composer, Songwriter I’m Arjan Singh — an architect turned singer-songwriter from Jaipur, who now designs music. I craft songs that are honest and born out of my life experiences. For me, lyrics are the soul of every song I write. As a storyteller, I weave my original poetry and songs into a narrative during my live performances. My semi-acoustic percussive guitar style creates warm melodies that flow seamlessly with my vocals, making each performance deeply personal and immersive. "As an indie Hindi artist, my dream is simple — I want to make music that truly feels something. Songs that sound like late-night thoughts, unfinished conversations, and emotions people don’t always say out loud. I’ve always been drawn to honest storytelling in Hindi — lyrics that stay with you, melodies that feel like memories.

With Havells mYOUsic, I’m hoping to grow — not just technically, but creatively. I would love mentorship that helps me understand my strengths better and push my songwriting to a deeper level. I want to learn how to shape my raw ideas into songs that are both intimate and impactful.

Performance opportunities really matter to me because indie music is about connection. There’s something powerful about singing a line you’ve written and seeing someone in the audience relate to it. I also look forward to collaborating with other artists and producers — exploring new sounds while staying true to my voice.

More than anything, I hope Havells mYOUsic helps me evolve into an artist who makes honest, lasting music — the kind people return to when they need comfort, clarity, or just a feeling they can’t explain." https://on.soundcloud.com/TLJIAFXwRvuihXJwQs I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. Social Media FALSE 16/02/2026 22:21:46 Shubham Kabra 06/04/1996 Mumbai/Maharastra 8450935512 officialshubhamkabra@gmail.com Singer, Lyricist, Composer, Songwriter "I come from humble beginnings, and music has always been my way of understanding the world. It wasn’t just something I did it was something that slowly shaped who I am. Growing up surrounded by the rich culture of India, I found myself deeply drawn to stories, melodies, and emotions that felt honest and raw. That’s where my sound comes from a blend of soul and indie folk, rooted in where I’m from and inspired by what I feel. Every song I write carries a piece of my journey the mountains I’ve stood on, the quiet battles I’ve fought, the love I’ve experienced, and the healing I’ve searched for. I don’t just want to make music that sounds good. I want to make music that feels like home to someone. I believe music can heal. It can unite. It can remind us that we’re not alone even in a world that sometimes feels divided. With every note I sing and every word I write, I’m trying to leave the world a little softer, a little kinder one song at a time." All of it https://youtu.be/F0ng8UXjdC0 I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. Email FALSE 17/02/2026 12:39:43 Prince 25/07/2012 Karnal 9896706156 chanchalkhurana251@gmail.com Singer "I love music and i am learning classical music And i can play harmonium, guitar. In future, i want music in my career." Opportunities https://www.instagram.com/reel/DUvm3Iskxpq/?igsh=MTRzdGM2Y3B2emhydA== I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. Social Media FALSE 17/02/2026 18:25:28 Himanshu Shrivastava 31/01/1994 Gwalior, Madhya Pradesh 9588121161 3101himanshu@gmail.com Singer, Lyricist, Rapper I am an independent RAP artist who also works as a Data consultant which helps me to see the real world and write about it. So i am not that typical rapper who just flex about materialism or abuse people down. in past 6 years I have touched multiple emotions(Love, Motivation, self talk/doubts) and society issues(social media trolls, society it self, Mob lynching) by crafting My songs. I made a swachhta Anthem RAP for municipal corporation Gwalior. Whatever I can learn and grow myself along with full filing the soul purpose of havells mYOUsic. https://youtu.be/4qeOcjp63eA?si=QaKsVFEkpjd4z6ng I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. through a friend FALSE 17/02/2026 18:35:38 Shikhar Mishra 15/01/1995 Lucknow, Uttar Pradesh 9198799555 shikhar.mishra.95@gmail.com Songwriter, Music Producer A Lucknow based Music Producer, dedicated to fusing the timeless beauty of Indian music with modern electronic music. I began my musical journey at a very young age and later received formal training at prestigious institutions like Gandharva Mahavidyalaya and the Delhi School Of Music. Exposure, collaborations and mentorship. https://on.soundcloud.com/EOt87cnqY3vZA6MVzx I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. Radio FALSE 18/02/2026 08:36:44 Ansh Batra 21/09/2000 Delhi 8178085995 anshbatra710200@gmail.com Singer, Lyricist I’m a hip-hop artist from New Delhi carving my own lane in rage rap. A core member of We Are Apex, I started in 2020, building a sound rooted in hunger, rebellion, and wordplay. I draw inspiration from Clipse, Tyler, The Creator, Kendrick Lamar, and Indian icons like Ikka, Raftaar, DIVINE, Seedhe Maut, and Prabh Deep. Known for sharp lyricism with double and triple entendres, I blend old-school grit with experimental production, collaborating closely with Oyee Dehliwal and LTG. My latest project, And Now We Eat, captures my raw hunger to claim my space. All of the above https://youtu.be/BZTEvIH5RXY?si=hkNB_RuBqYVrgYeL I confirm this is my original work. I have read the T&C and i understand them, I agree to the Havells mYOUsic Terms & Conditions. Social Media FALSE
"""

KNOWN_ROLES = [
    'Singer', 'Songwriter', 'Composer', 'Lyricist', 'Producer', 'Rapper', 
    'Guitarist', 'Vocalist', 'Musician', 'Instrumentalist', 'Drummer', 
    'Pianist', 'Bassist', 'Artist', 'Performer', 'Music Producer'
]

def clean_role_entry(text):
    """
    Cleans the Role column by removing URLs, footer garbage, and separating Bio text.
    """
    if pd.isna(text) or str(text).strip() == '': return ""
    text = str(text)
    
    # 1. Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    # 2. Remove specific footer phrases (case insensitive)
    garbage_phrases = [
        r'I confirm this is my original work',
        r'I have read the T&C',
        r'I understand them',
        r'I agree to the Havells mYOUsic Terms',
        r'Social Media FALSE',
        r'Email FALSE',
        r'Radio FALSE',
        r'through a friend FALSE',
        r'All of it',
        r'All of the above',
        r'Opportunities',
        r'The Dots. I Am Filling This Form On Behalf Of Us.',
        r'I Can Create Song Posters. I Am Graphic Designer.',
        r'I Could Provide Any Type Of  Song In Hindi'
    ]
    for phrase in garbage_phrases:
        text = re.sub(re.escape(phrase), '', text, flags=re.IGNORECASE)
        
    # 3. Truncate at Bio start
    # Look for " I " or " I'm " or " My " or " As a " or quote
    bio_pattern = r'(\s(I|I\'m|I’m|My|As a|Growing up)\s|["“])'
    match = re.search(bio_pattern, text)
    if match:
        text = text[:match.start()]
        
    # 4. Clean up punctuation
    text = text.strip().strip('.,-')
    
    # 5. Post-truncation check for long text
    if len(text) > 40:
        # Check for known roles
        found = []
        for role in KNOWN_ROLES:
            if role.lower() in text.lower():
                found.append(role)
        
        if found:
            # Return only the found roles to strip the surrounding bio text
            # Use a set to deduplicate (Singer, Singer -> Singer)
            return ", ".join(sorted(list(set(found))))
        else:
            # If it's long and has no known roles, it's likely garbage/bio
            # If it has too many spaces, it's a sentence.
            if text.count(' ') > 5:
                return "" # Assume garbage
                
    return text

def parse_raw_data(text):
    # Regex to find the start of a new record (Timestamp)
    # Pattern: DD/MM/YYYY HH:MM:SS
    record_start_pattern = r'(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})'
    
    # Split the text by the timestamp pattern
    parts = re.split(record_start_pattern, text)
    
    records = []
    
    # Iterate through parts (skipping the first empty one if exists)
    # parts[i] is timestamp, parts[i+1] is the body of that record
    for i in range(1, len(parts), 2):
        timestamp = parts[i]
        body = parts[i+1] if i+1 < len(parts) else ""
        
        # Clean up body (replace newlines with spaces to keep regex simple)
        body_clean = body.replace('\n', ' ').strip()
        
        # --- Extraction Logic ---
        # 1. Find Email (Anchor point)
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', body_clean)
        if not email_match:
            print(f"⚠️ Skipping record {timestamp}: No email found")
            continue
            
        email = email_match.group(0)
        pre_email = body_clean[:email_match.start()].strip()
        
        # 2. Find Phone (10 digits at the end of pre_email)
        phone_match = re.search(r'(\d{10})\s*$', pre_email)
        if not phone_match:
            print(f"⚠️ Skipping record {timestamp}: No phone found")
            continue
            
        phone = phone_match.group(1)
        pre_phone = pre_email[:phone_match.start()].strip()
        
        # 3. Find DOB (DD/MM/YYYY in pre_phone)
        dob_match = re.search(r'(\d{2}/\d{2}/\d{4})', pre_phone)
        if dob_match:
            dob = dob_match.group(1)
            # Name is everything before DOB
            name = pre_phone[:dob_match.start()].strip()
            # City is everything between DOB and Phone
            city = pre_phone[dob_match.end():].strip()
        else:
            dob = ""
            name = pre_phone # Fallback
            city = ""
            
        # 4. Role/Bio (Everything after email)
        full_body = body_clean[email_match.end():].strip()
        # Apply robust cleaning
        role_final = clean_role_entry(full_body)
        
        records.append({
            'name': name,
            'email': email,
            'phone': phone,
            'city': city,
            'role in music': role_final, # Maps to role column
            'timestamp': timestamp
        })
        
    return pd.DataFrame(records)

def clean_merged_file(file_path):
    """
    Reads the merged CSV and applies cleaning logic to the Role column
    to remove redundant data and garbage.
    """
    print(f"\nCleaning merged file: {file_path}")
    if not os.path.exists(file_path):
        print("❌ File not found.")
        return

    df = pd.read_csv(file_path, dtype=str)
    
    # Find role column
    role_col = None
    for col in df.columns:
        if any(x in col.lower() for x in ['role', 'category', 'instrument']):
            role_col = col
            break
    
    if role_col:
        print(f"   Found role column: '{role_col}' - Cleaning...")
        df[role_col] = df[role_col].apply(clean_role_entry)
        df.to_csv(file_path, index=False)
        print("   ✅ File cleaned and saved.")
    else:
        print("   ⚠️ Role column not found for cleaning.")

def generate_role_report(csv_path):
    """
    Generates a report of participant roles from the merged CSV.
    Counts occurrences of specific keywords and combinations.
    """
    print(f"\n{'='*60}")
    print("PARTICIPANT ROLE REPORT")
    print(f"{'='*60}")
    
    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    
    # Normalize column names to find role
    df.columns = [c.lower().strip() for c in df.columns]
    
    role_col = None
    possible_names = ['role in music', 'role', 'category', 'instrument']
    for col in df.columns:
        if any(p in col for p in possible_names):
            role_col = col
            break
            
    if not role_col:
        print("❌ Could not find 'Role in Music' column.")
        return

    # Initialize Counters for dynamic counting
    role_counts = Counter()
    singer_songwriter_count = 0
    others_count = 0
    
    for _, row in df.iterrows():
        val = row[role_col]
        if pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '':
            others_count += 1
            continue
            
        val_str = str(val).lower()
        
        # Check specific intersection
        if 'singer' in val_str and 'songwriter' in val_str:
            singer_songwriter_count += 1
            
        # Normalize delimiters: replace / and & with ,
        clean_val = val_str.replace('/', ',').replace('&', ',').replace(' and ', ',')
        
        # Split by comma and clean
        parts = [r.strip() for r in clean_val.split(',') if r.strip()]
        
        for part in parts:
            # Basic validation only (since file is now cleaned)
            if len(part) < 30 and any(c.isalpha() for c in part):
                role_counts[part.title()] += 1

    # Print Report
    print(f"Total Participants: {len(df)}")
    print("-" * 40)
    print(f"{'Category':<25} | {'Count':<5}")
    print("-" * 40)
    
    # Print Singer-Songwriter intersection explicitly
    print(f"{'Singer-Songwriter':<25} | {singer_songwriter_count:<5}")
    
    # Print Others
    print(f"{'Others (No Category)':<25} | {others_count:<5}")
    
    print("-" * 40)
    print("Detailed Breakdown (All Categories):")
    
    # Sort by count descending
    for role, count in role_counts.most_common():
        print(f"{role:<25} | {count:<5}")
        
    print("-" * 40)
    print("Note: Categories are not mutually exclusive.")
    print("(e.g., a 'Singer-Songwriter' is counted in Singer, Songwriter, and Singer-Songwriter)")

def generate_location_report(csv_path):
    """
    Generates a report of participants from Delhi and nearby areas (NCR).
    """
    print(f"\n{'='*60}")
    print("LOCATION REPORT (DELHI & NCR)")
    print(f"{'='*60}")
    
    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    
    # Normalize column names to find city
    df.columns = [c.lower().strip() for c in df.columns]
    
    city_col = None
    possible_names = ['city', 'location', 'current city', 'state', 'address', 'hometown']
    for col in df.columns:
        if any(p in col for p in possible_names):
            city_col = col
            break
            
    if not city_col:
        print("❌ Could not find 'City' column.")
        return

    # Keywords for Delhi and nearby areas (NCR)
    ncr_keywords = [
        'delhi', 'noida', 'gurugram', 'gurgaon', 'ghaziabad', 
        'faridabad', 'greater noida', 'sonipat', 'panipat', 
        'meerut', 'rohtak', 'karnal'
    ]
    
    ncr_count = 0
    total_with_city = 0
    
    for _, row in df.iterrows():
        val = row[city_col]
        if pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '':
            continue
            
        val_str = str(val).lower()
        total_with_city += 1
        
        if any(kw in val_str for kw in ncr_keywords):
            ncr_count += 1
            
    print(f"Total Participants with City info: {total_with_city}")
    print("-" * 40)
    print(f"{'Region':<25} | {'Count':<5}")
    print("-" * 40)
    print(f"{'Delhi & NCR':<25} | {ncr_count:<5}")
    print(f"{'Outside NCR':<25} | {total_with_city - ncr_count:<5}")
    print("-" * 40)

def main():
    print(f"\n{'='*60}")
    print("MANUAL DATA IMPORT & MERGE")
    print(f"{'='*60}")
    
    # 1. Parse Data
    print("Parsing raw data...")
    df = parse_raw_data(RAW_DATA)
    
    if df.empty:
        print("❌ No records parsed. Check data format.")
        return

    print(f"✅ Parsed {len(df)} records successfully.")
    print("\nPreview:")
    print(df[['name', 'email', 'phone', 'city']].head())
    
    # 2. Save to CSV
    data_dir = os.path.join(parent_dir, 'data')
    output_file = os.path.join(data_dir, 'manual_import_feb18.csv')
    
    # Ensure data directory exists
    os.makedirs(data_dir, exist_ok=True)
    
    df.to_csv(output_file, index=False)
    print(f"\n💾 Saved temporary file to: {output_file}")
    
    # 3. Run Merge
    print("\n" + "-"*60)
    print("Initiating Merge Process...")
    print("-"*60)
    
    target_file = os.path.join(data_dir, 'Delhi GMI auditions 22nd Feb.csv')
    
    # Call the merge function
    merge_gmi_data(data_dir, target_file)
    
    print(f"\n✅ Process Complete! Data merged into: {target_file}")
    
    # 4. Clean the Merged File
    clean_merged_file(target_file)
    
    # 5. Generate Report
    generate_role_report(target_file)
    
    # 6. Generate Location Report
    generate_location_report(target_file)

if __name__ == "__main__":
    main()
