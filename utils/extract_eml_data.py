import os
import email
import re
import csv
from email import policy
from email.parser import BytesParser

def get_text_payload(msg):
    """Extracts the text payload from an email message, walking through parts if necessary."""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdispo = str(part.get('Content-Disposition'))
            # Look for text/plain parts that are not attachments
            if ctype == 'text/plain' and 'attachment' not in cdispo:
                try:
                    return part.get_payload(decode=True).decode('utf-8', errors='ignore')
                except:
                    continue
    else:
        # Not a multipart message, just get the payload
        try:
            return msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        except:
            return ""
    return ""

def extract_contacts_from_text(text):
    """Uses regex to find all form submissions in the email body."""
    # This pattern is specifically designed to match the "Name:", "Email:", "Ypur Mobile:",
    # and "Your City:" fields from your forwarded Webflow form submissions.
    pattern = re.compile(
        r"Name:\s*(.*?)\s*\n"
        r"Email:\s*(.*?)\s*\n"
        r"Ypur Mobile:\s*(.*?)\s*\n"
        r"Your City:\s*(.*?)\s*\n",
        re.DOTALL
    )
    
    found_contacts = []
    matches = pattern.findall(text)
    for match in matches:
        # Unpack the captured groups from the regex match
        name, email_addr, mobile, city = match
        contact = {
            'Name': name.strip(),
            'Email': email_addr.strip(),
            'Mobile': mobile.strip(),
            'City': city.strip()
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
        if filename.lower().endswith('.eml'):
            file_path = os.path.join(source_dir, filename)
            print(f"  -> Processing file: {filename}")
            with open(file_path, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
                body_text = get_text_payload(msg)
                contacts = extract_contacts_from_text(body_text)
                print(f"    - Extracted {len(contacts)} contacts.")
                all_extracted_contacts.extend(contacts)

    if not all_extracted_contacts:
        print("\nNo new contacts were extracted from any EML files.")
        return

    file_exists = os.path.isfile(output_csv)
    with open(output_csv, 'a', newline='', encoding='utf-8') as f:
        headers = ['Name', 'Email', 'Mobile', 'City']
        writer = csv.DictWriter(f, fieldnames=headers)
        if not file_exists:
            writer.writeheader()
        writer.writerows(all_extracted_contacts)
    print(f"\nSuccessfully appended {len(all_extracted_contacts)} contacts to '{output_csv}'.")

if __name__ == '__main__':
    base_dir = r'c:\Users\Raghav Raj Sobti\Desktop\AutoMailer'
    eml_source_folder = os.path.join(base_dir, 'consolidated_eml_files')
    submission_csv = os.path.join(base_dir, 'csv', 'submission_data.csv')

    os.makedirs(eml_source_folder, exist_ok=True)
    
    process_eml_files(eml_source_folder, submission_csv)
    print("\n--- EML Extraction Complete ---")