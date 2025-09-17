import os
import email
import re
import csv
from email import policy
from email.parser import BytesParser

def cleanup_html(html_text):
    """Removes HTML tags and decodes HTML entities."""
    if not html_text:
        return ""
    # Specifically replace <br> tags with newlines to preserve structure
    clean_text = re.sub(r'<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
    # Remove all other HTML tags
    clean_text = re.sub('<[^<]+?>', '', clean_text)
    # Decode HTML entities like &amp;
    try:
        import html
        clean_text = html.unescape(clean_text)
    except ImportError:
        pass # html module is standard in Python 3.4+
    return clean_text

def get_text_payload(msg):
    """Extracts the text payload from an email message, walking through parts if necessary."""
    text_payload = ""
    html_payload = ""

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdispo = str(part.get('Content-Disposition'))
            if 'attachment' not in cdispo:
                if ctype == 'text/plain':
                    text_payload = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                elif ctype == 'text/html':
                    html_payload = part.get_payload(decode=True).decode('utf-8', errors='ignore')
    else:
        html_payload = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

    # Prefer HTML payload as it's more likely to contain the form data,
    # then clean it. Fall back to plain text if HTML is not available.
    if html_payload:
        return cleanup_html(html_payload)
    return text_payload

def extract_contacts_from_text(text):
    """Uses regex to find all form submissions in the email body."""
    pattern = re.compile(
        r"Name:\s*(.*?)\s*(?:<br>|[\n\r])"
        r"Email:\s*(.*?)\s*(?:<br>|[\n\r])"
        r"(?:Ypur Mobile|Mobile):\s*(.*?)\s*(?:<br>|[\n\r])"  # Matches 'Ypur Mobile' OR 'Mobile'
        r"Your City:\s*(.*?)\s*", # This will match until the next submission block or end of text
        re.DOTALL
    )
    
    found_contacts = []
    # Split the body by the "Forwarded Conversation" separator to handle multiple submissions
    # The separator can be '----------' or 'Forwarded Conversation'
    submission_blocks = re.split(r'-{10,}|Forwarded Conversation', text)

    for block in submission_blocks:
        # --- DEBUGGING: Print the block of text being searched ---
        # print("\n--- Searching Block ---")
        # print(block)
        # print("-----------------------\n")
        match = pattern.search(block)
        if not match:
            continue
        # Unpack the captured groups from the regex match
        name, email_addr, mobile, city = match.groups()
        contact = {
            'name': name.strip(),
            'email': email_addr.strip(),
            'number': mobile.strip(),
            'city': city.strip(),
            'havells promo': False  # Explicitly set the promo status to False
        }
        found_contacts.append(contact)
    return found_contacts

def process_eml_files(source_dir, output_csv):
    """Processes all .eml files, extracts contacts, and appends them to a CSV."""
    if not os.path.isdir(source_dir):
        print(f"[ERROR] Source directory for EML files not found: {source_dir}")
        return

    print(f"Starting EML extraction from '{source_dir}'...")
    all_extracted_contacts = []
    for filename in os.listdir(source_dir):
        if filename.lower().endswith(('.eml', '.msg')):
            file_path = os.path.join(source_dir, filename)
            print(f"  -> Processing file: {filename}")
            with open(file_path, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
                body_text = get_text_payload(msg)
                contacts = extract_contacts_from_text(body_text)
                if contacts:
                    print(f"    - Extracted {len(contacts)} contact(s):")
                    for i, contact in enumerate(contacts):
                        print(f"      - Record {i+1}: Name='{contact['name']}', Email='{contact['email']}', Number='{contact['number']}', City='{contact['city']}'")
                else:
                    print("    - No matching data found in this file.")
                
                all_extracted_contacts.extend(contacts)

    if not all_extracted_contacts:
        print("\nNo new contacts were extracted from any EML files.")
        return

    file_exists = os.path.isfile(output_csv)
    with open(output_csv, 'a', newline='', encoding='utf-8') as f:
        headers = ['name', 'email', 'number', 'city', 'gender', 'havells promo']
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
        if not file_exists:
            writer.writeheader()
        writer.writerows(all_extracted_contacts)
    print(f"\nSuccessfully appended {len(all_extracted_contacts)} contacts to '{output_csv}'.")

if __name__ == '__main__':
    base_dir = r'c:\Users\Raghav Raj Sobti\Desktop\AutoMailer'
    eml_source_folder = os.path.join(base_dir, 'eml')
    output_db_file = os.path.join(base_dir, 'csv', 'master_db.csv')

    os.makedirs(eml_source_folder, exist_ok=True)
    
    process_eml_files(eml_source_folder, output_db_file)
    print("\n--- EML Extraction Complete ---")