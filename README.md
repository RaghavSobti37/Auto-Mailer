# AutoMailer - Automated Email Campaign Tool

AutoMailer is a powerful, Python-based toolkit designed to manage and execute automated email campaigns. It allows users to send personalized HTML emails from a consolidated contact database, track sent statuses, and maintain a clean, validated, and up-to-date list of contacts.

## Features

- **Dynamic Email Campaigns**: Choose between different email templates (e.g., Teaser, Main Campaign) at runtime.
- **Centralized Database Management**:
  - Ingest new contacts from various sources (Excel, CSV, `.eml` files) directly into a raw master database (`master_db.csv`).
  - A robust cleaning script processes the raw data to produce a clean, deduplicated, and ready-to-use contact list (`master_db_cleaned.csv`).
- **Prevents Duplicate Emails**: Automatically updates a `havells promo` flag in the database after an email is sent, preventing the same contact from being emailed again in future campaigns.
- **Comprehensive Logging**: Logs the status of every email (`SENT` or `FAILED`) with timestamps and error details into `email_log.csv`.
- **Data Cleaning & Standardization**: Includes a robust script (`clean_master_db.py`) to clean the master database by:
  - Validating email formats.
  - Standardizing names, phone numbers, and gender entries.
  - Removing duplicate contacts.
  - Correcting data types.
- **Log-based Database Updates**: Includes a script (`updatedb.py`) to retroactively update the master database based on `email_log.csv`, ensuring contacts who have already received an email are correctly marked.
- **Secure Credential Management**: Uses a `.env` file to securely store email credentials, keeping them out of the main codebase.
- **Progress Reporting**: A `show_progress.py` script provides a high-level overview of campaign progress, including sent, failed, and remaining emails.

---

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd AutoMailer
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install pandas python-dotenv Pillow
    ```

4.  **Create the `.env` file:**
    Create a file named `.env` in the root of the project directory and add your email credentials:
    ```env
    EMAIL_ADDRESS="your_email@gmail.com"
    EMAIL_PASSWORD="your_gmail_app_password"
    ```
    > **Note:** For Gmail, you need to use an "App Password" instead of your regular password if you have 2-Factor Authentication enabled.

5.  **Prepare your data:**
    - Place your master contact list in `csv/master_db_cleaned.csv` (if you have one to start with). It should have columns like `name`, `email`, `number`, `city`, `gender`, and `havells promo`.
    - Alternatively, place your CSV and Excel files into the `import data/` folder to be processed by `import_and_archive.py`
    - Place your banner image at `assets/banner.jpg`.

---

## How to Use

### 1. Add New Data (Automated Import and Archive System)

The AutoMailer now features a unified import and archive system that automatically processes data in any format and manages your import files.

**Workflow:**
1.  **Place data files** in the `import data/` folder:
    - CSV files (any column names)
    - Excel files (.xlsx with single or multiple sheets)
    - Different data formats are automatically mapped to the standard database columns

2.  **Run the import script:**
    ```bash
    python import_and_archive.py
    ```

3.  **What happens automatically:**
    - The script scans the `import data/` folder for new files
    - Reads and processes data from any format (CSV, Excel, multiple sheets)
    - Intelligently maps various column names to standard format:
      - **Names**: Combines `first name` + `last name` if both exist, or uses `full name`, `participant name`, `student name`, etc.
      - **Email**: `email` / `email id` / `e-mail` / `email address` → `email`
      - **Phone**: `number` / `phone` / `mobile` / `mobile number` / `contact no` / `whatsapp` → `number`
      - **Location**: `city` / `hometown` / `location` / `place` → `city`
    - Cleans and validates all data:
      - Validates email formats
      - Extracts phone numbers (10-digit format)
      - Standardizes names and removes duplicates
    - **Moves processed files** to `import data/archive/` with a timestamp (you don't deal with raw data again)
    - Updates `master_db_cleaned.csv` with the new contacts
    - Deduplicates across the entire database

**Notes:**
- Your data can have any column names - the system will intelligently map them
- If your file has separate "First Name" and "Last Name" columns, they'll be automatically combined
- Files are automatically timestamped when archived to preserve history
- All data is cleaned, validated, and deduplicated before being added to the database
- You can run this script repeatedly; new files in `import data/` will be processed each time

### 2. Run an Email Campaign

Execute the main script to start sending emails. It will use the `master_db_cleaned.csv` file.
```bash
python test.py
```

The script will:
- Show a preview of contacts to be emailed
- Prompt you to choose between "Teaser Mail" and "Main Campaign Mail"
- Ask for confirmation before proceeding
- Send personalized HTML emails to each contact
- Log the status (`SENT` or `FAILED`) with timestamps to `email_log.csv`

### 3. Update Database Status from Email Log

If you need to sync the `havells promo` and `masterclass_ad_sent` status in your `master_db_cleaned.csv` based on the `email_log.csv`, run this script:
```bash
python updatedb.py
```

This will create an updated version of the database reflecting which contacts have already been contacted in previous campaigns.

---

## Directory Structure

```
AutoMailer/
├── import_and_archive.py          # Main import and archive script (RUN THIS FOR NEW DATA)
├── test.py                        # Email campaign script
├── clean_leads.py                 # Data cleaning utilities
├── updatedb.py                    # Sync database with email logs
├── show_progress.py               # View campaign progress
├── import data/                   # PLACE YOUR DATA FILES HERE
│   ├── *.csv                      # CSV files (any format)
│   ├── *.xlsx                     # Excel files
│   └── archive/                   # Archived files (auto-managed)
├── csv/
│   ├── master_db_cleaned.csv      # Clean, deduplicated contact database
│   ├── email_log.csv              # Log of sent/failed emails
│   └── other data files
├── params/                        # Email template parameters
├── utils/                         # Utility scripts
└── assets/                        # Banner images and assets
```

---

## Workflow Overview

1. **Add Data** → `import_and_archive.py` → Files auto-archived → Database updated
2. **Send Emails** → `test.py` → Email log created
3. **Check Progress** → `show_progress.py` → View campaign status
4. **Sync Status** → `updatedb.py` → Mark contacts as emailed
5. **Repeat** → Add more data when needed
