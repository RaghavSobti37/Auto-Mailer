# AutoMailer - Automated Email Campaign Management

A professional Python-based toolkit for managing and executing automated email campaigns with comprehensive contact database management, email delivery, and campaign tracking.

## 🎯 Features

- **Multi-Campaign Support**: Run different email campaigns with customizable templates and parameters
- **Centralized Database Management**:
  - Ingest contacts from multiple sources (Excel, CSV, email files)
  - Automatic data cleaning, validation, and deduplication
  - Prevent duplicate emails with campaign tracking flags
  - **Intelligent GMI Data Merging**:
    - Smart column mapping (detects Name, Email, Phone, City, Role variations)
    - Completeness-based deduplication (keeps the record with the most data)
    - Support for mixed CSV and Excel inputs
- **Smart Email Delivery**:
  - Personalized HTML emails with dynamic content
  - Optional banner image embedding
  - Comprehensive send logging with status tracking
- **Data Processing**:
  - Validate email formats and phone numbers
  - Standardize names, cities, and contact information
  - Extract and parse complex contact data
- **Campaign Analytics**:
  - Real-time progress tracking
  - Daily send statistics
  - Campaign completion percentage
- **WhatsApp Integration**:
  - Generate WhatsApp-compatible contact lists
  - Automatic phone number formatting

## 📁 Project Structure

```
AutoMailer/
├── src/                          # Core application code
│   ├── core/
│   │   ├── database.py
│   │   └── email_service.py
│   └── templates/
├── scripts/                      # Executable scripts
│   ├── consolidate_and_clean.py # Consolidates and cleans all raw data
│   ├── send_campaigns.py        # Main email sending script
│   ├── export_data.py           # Exports subsets of the master database
│   ├── update_db.py             # Updates campaign flags in the master database
│   ├── send_to_delhi_contacts.py     # Send Rise Emailer to Delhi contacts
│   ├── rise_emailer_unified.py       # UNIFIED: Complete Rise Emailer campaign (batch + schedule ready)
│   ├── test_schedule_1min.py         # Test scheduler with 1-minute delay
│   └── ...
├── config/                       # Configuration files
│   └── campaigns.py             # Campaign parameters
├── data/                         # Data files
│   ├── raw/                     # Raw, unprocessed data files
│   ├── processed/               # Processed data files
│   ├── master_db/               # Master database files
│   │   ├── master_db.csv
│   │   └── master_db_cleaned.csv
│   └── exports/                 # Exported data files
│       ├── Delhi_and_New_Delhi_Contacts.csv
│       ├── Delhi_and_New_Delhi_Contacts_WORKING.csv
│       └── Delhi_Test_Contacts.csv
├── logs/                         # Log files
│   ├── activity.log             # General script activity log
│   ├── email_log.csv            # Email sending log
│   └── rise_campaign.csv        # Rise Emailer campaign log
├── assets/                       # Media files
│   ├── rise-emailer/           # Rise Emailer assets
│   │   └── images/             # Promotional images with MIME embedding
│   └── ...
├── .env                         # Environment variables
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```


## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd AutoMailer

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # On Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file in the project root with your email credentials:

```env
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

> **Note**: For Gmail, use an "App Password" if 2-Factor Authentication is enabled.

### 3. Prepare Your Data

- **Place Raw Data**: Place all your raw data files (CSV, Excel) into the `data/raw/` directory.

- **Banner Images**: Place promotional images in the `assets/` folder.

## 📋 Usage Guide

### Web Frontend (Upload, Map, Preview, Send)

The project now includes a production-focused web interface that supports:
- Uploading CSV/XLSX sheets
- Selecting Name and Email columns via dropdown
- Writing subject/body with token support (`{{name}}`, `{{email}}`, `{{Column Title}}`)
- Live email preview on the right panel
- Sending through the user's Gmail ID + App Key
- Remembering sender identity for future sessions (encrypted local storage)

Run the web UI:

```bash
# Production mode (Waitress server)
python run_web.py

# Development mode (Flask debug server)
python run_web.py --dev
```

Open: `http://localhost:5000`

Security notes:
- Sender profile is stored at `params/sender_profile.enc` and encrypted via `params/sender_profile.key`.
- Keep the `params/` folder protected and do not commit encrypted profile/key files if you do not want local credential persistence.
- For Gmail, generate an App Password and use that as App Key.

### 1. Consolidate and Clean Data

This is the first step in the new workflow. This script will process all files in `data/raw/`, clean them, and update the master database.

```bash
python scripts/consolidate_and_clean.py
```

This script will:
1. Scan the `data/raw/` directory for all `.csv` and `.xlsx` files.
2. Intelligently map columns and merge all data.
3. Clean and deduplicate the data.
4. Update the master database located at `data/master_db/master_db.csv`.
5. Create a cleaned version of the master database at `data/master_db/master_db_cleaned.csv` for use in campaigns.
6. Move processed files from `data/raw/` to `data/processed/`.

### 2. Running Email Campaigns

```bash
# Interactive campaign selection and execution
python scripts/send_campaigns.py
```

The script will:
1. Display available campaigns.
2. Load the cleaned master database.
3. Show a preview of recipients for the selected campaign.
4. Request confirmation before sending.
5. Log all send results to `logs/email_log.csv`.

### 3. Exporting Data

You can export subsets of your cleaned data for analysis or other purposes.

```bash
python scripts/export_data.py
```

The script will guide you through:
1. Choosing a column to filter by (e.g., `city`).
2. Providing a value to filter on (e.g., `Delhi`).
3. Saving the filtered data to a new CSV file in the `data/exports/` directory.

### 4. Update Database from Logs

If you need to manually update campaign flags in the master database based on the email log, you can use this script.

```bash
# Sync database with email logs for a specific campaign
python scripts/update_db.py --column <campaign_column_name>
```

### 5. Rise Emailer Campaign (NEW)

The unified Rise Emailer campaign system with integrated batch processing, progress tracking, and optional scheduling.

#### Quick Start (Single Execution)

```bash
python scripts/rise_emailer_unified.py
```

This script:
- ✅ Loads contacts with batch capacity management (50 per batch)
- ✅ Creates a separate working copy to track progress
- ✅ Sends emails in optimized batches to reduce SMTP operations
- ✅ Saves progress after each batch (resumable)
- ✅ **Default**: Uses TEST database (4 test contacts)
- ✅ **Switch to Production**: Change `contacts_mode = "PRODUCTION"` in the script

#### Database Mode Selection

The script includes a **safety mechanism** to prevent accidental mass sending:

```python
# In scripts/rise_emailer_unified.py
contacts_mode = "TEST"  # Options: "TEST" (4 contacts) or "PRODUCTION" (429 contacts)
```

**To switch to production contacts:**
1. Open `scripts/rise_emailer_unified.py`
2. Change line to: `contacts_mode = "PRODUCTION"`
3. Run script - it will warn before sending

#### Testing with Scheduler (1-Minute Delay)

```bash
python scripts/test_schedule_1min.py
```

This test scheduler:
- Waits 1 minute from execution time
- Automatically runs the full campaign
- Logs all output to `logs/test_schedule.log`
- Useful for verifying scheduler functionality before production scheduling

**Features:**
- 📊 Real-time batch status updates
- 💾 Working copy protection (original DB untouched)
- 📋 Progress tracking with email_sent and sent_timestamp columns
- ⏸️ Resumable - skips already-sent contacts
- 🔄 Rate limiting between batches (1 second delay)

#### Production Scheduling (9 AM Daily)

For 24/7 automated sending at a fixed time, see `SCHEDULING_GUIDE.md` for setting up Windows Task Scheduler or APScheduler.


## ⚙️ Configuration

### Campaign Parameters

Edit `config/campaigns.py` to customize campaigns:

```python
class MyCustomParams:
    CSV_PATH = 'data/master_db/master_db_cleaned.csv'
    SUBJECT = "My Campaign Subject"
    FORM_LINK = 'https://your-form-link.com'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/banner.jpg'
```

### Email Templates

Edit `src/templates/__init__.py` to customize email templates.

## 📊 Data Processing Pipeline

The new data processing pipeline is designed to be simple and robust.

1.  **Ingestion**: All raw data files are placed in the `data/raw/` directory.
2.  **Processing**: The `consolidate_and_clean.py` script is run to process the raw data. This includes:
    *   **Intelligent Merging**: Automatically handles different file types and column names.
    *   **Cleaning**: Validates emails, standardizes names and numbers, and cleans other data fields.
    *   **Deduplication**: Removes duplicate contacts based on email address, keeping the most complete record.
3.  **Storage**: The clean, consolidated data is stored in `data/master_db/master_db_cleaned.csv`. Processed raw files are moved to `data/processed/`.
4.  **Campaigning**: The `send_campaigns.py` script uses the cleaned master database to send emails.
5.  **Exporting**: The `export_data.py` script allows for easy extraction of data subsets.

## 🔐 Security & Best Practices

- **Credentials**: Use `.env` file for sensitive data.
- **Data Backup**: Regularly back up the `data/master_db/` directory.
- **Logging**: All script activities and email sending attempts are logged in the `logs/` directory.

## 📈 Typical Workflow

```
1. Place new raw data files in `data/raw/`
        ↓
2. Run `python scripts/consolidate_and_clean.py`
        ↓
3. Run `python scripts/send_campaigns.py` to send emails
        ↓
4. (Optional) Run `python scripts/export_data.py` to get data subsets
        ↓
5. Review logs in the `logs/` directory
```

## 🛠️ Troubleshooting

### Issue: "EMAIL_ADDRESS or EMAIL_PASSWORD not found"
- **Solution**: Create `.env` file in the project root.

### Issue: "File not found" errors
- **Solution**: Ensure your raw data files are in the `data/raw/` directory. If the master database is not found, run `consolidate_and_clean.py`.

### Issue: No contacts to email
- **Solution**: Check if all contacts already have the relevant campaign flag set to `True` in the master database.

## 📚 Dependencies

- **pandas**: Data processing and CSV handling
- **python-dotenv**: Environment variable management
- **Pillow (PIL)**: Image processing for banners
- **numpy**: Numerical operations
- **apscheduler**: Advanced Python Scheduler (for Rise Emailer scheduling)

See `requirements.txt` for specific versions.

## 📝 Logging

-   **Activity Log**: All general script activity, errors, and processing information are logged in `logs/activity.log`.
-   **Email Log**: All email send attempts are logged in `logs/email_log.csv`:

```csv
Timestamp,EmailID,Name,Status,Error
2024-12-02 10:30:45,john@example.com,John Doe,SENT,
2024-12-02 10:31:12,jane@example.com,Jane Smith,FAILED,Invalid email format
```

## 🤝 Contributing

Feel free to extend this project with:
- Additional email templates
- New data sources
- Advanced filtering options
- Dashboard/analytics
- SMS integration

## 📄 License

[Specify your license here]

## 👨‍💻 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review `email_log.csv` for error details
3. Ensure all files are in correct directories
4. Verify `.env` configuration

---

**Version**: 1.0.0
**Last Updated**: December 2024
