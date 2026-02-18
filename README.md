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
│   ├── __init__.py
│   ├── core/                     # Core functionality
│   │   ├── __init__.py
│   │   ├── database.py          # Database cleaning and validation
│   │   └── email_service.py     # Email sending and logging
│   ├── templates/               # Email templates
│   │   └── __init__.py          # All campaign email templates
│   └── utils/                   # Utility functions
│       └── __init__.py          # Data processing utilities
├── scripts/                      # Executable scripts
│   ├── send_campaigns.py        # Main email sending script
│   ├── prepare_data.py          # Data preparation and cleaning
│   ├── show_progress.py         # Campaign progress reporting
│   ├── update_db.py             # Update DB from email logs
│   └── generate_whatsapp_db.py  # WhatsApp database generation
│   ├── merge_gmi_data.py        # GMI Data Merging logic
│   └── extract_clean_csv.py     # Contact Info CSV Cleaner
├── config/                       # Configuration files
│   └── campaigns.py             # Campaign parameters
├── test.py                      # Main GMI Campaign Orchestrator
├── data/                         # Data files
│   ├── csv/                     # CSV data files
│   │   ├── master_db.csv               # Raw contact list
│   │   ├── master_db_cleaned.csv       # Cleaned contact list
│   │   ├── email_log.csv               # Email send logs
│   │   ├── whatsapp_db.csv            # WhatsApp contacts (raw)
│   │   ├── whatsapp_db_cleaned.csv    # WhatsApp contacts (cleaned)
│   │   └── [other CSV files]
│   └── imports/                 # Imported data sources
├── assets/                       # Media files
│   ├── banner.jpg               # Main campaign banner
│   ├── pixel.png                # Tracking pixel
│   └── [other images]
├── .env                         # Environment variables (credentials)
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

- **Master Contact List**: Place or update `data/csv/master_db.csv` with columns:
  - `name`: Contact name
  - `email`: Email address (required)
  - `number`: Phone number (optional)
  - `city`: City/Location
  - `gender`: Gender information
  - `havells promo`: Campaign tracking flag (boolean)

- **Banner Images**: Place promotional images in the `assets/` folder

## 📋 Usage Guide

### 🎵 Running GMI Campaigns (New)

The project now includes a specialized orchestrator for Havells GMI campaigns. This is the primary entry point for GMI workflows.

```bash
python test.py
```

**Key Options:**

- **Option 5: Havells GMI Confirmation (Auto-Merge)**
  - Automatically scans `data/` for all CSV/Excel files.
  - Merges them using intelligent column mapping.
  - Deduplicates records (prioritizing rows with more data).
  - Sends confirmation emails to the merged list.

- **Option 6: Fix Contact Info CSV**
  - Specifically targets problematic "Contact Information" export files.
  - Fixes header issues and validates "Name" vs "Phone" columns.

- **Option 7: Test GMI Confirmation**
  - Sends the GMI confirmation template to contacts in `data/test_leads.csv`.
  - Uses the configured Google Apps Script for redirect links.

- **Option 8: Merge GMI Data Only**
  - Runs the merge and deduplication process.
  - Saves the result to `data/Delhi GMI auditions 22nd Feb.csv` without sending emails.


### Running Email Campaigns

```bash
# Interactive campaign selection and execution
python scripts/send_campaigns.py
```

The script will:
1. Display available campaigns (Teaser, Main, IML Promo, etc.)
2. Load the target contact list
3. Show a preview of recipients
4. Request confirmation before sending
5. Log all send results to `data/csv/email_log.csv`

**Available Campaigns:**
1. **Teaser Mail** - Initial campaign teaser
2. **Main Campaign Mail** - Full campaign with banner
3. **IML Promo Mail** - Insta Music League promotion
4. **IML Submission Reminder** - Deadline reminder
5. **IML Final Call** - Last chance notice
6. **Masterclass Ad** - Educational workshop promotion

### Data Preparation

```bash
# Prepare and clean new contact data
python scripts/prepare_data.py
```

This script:
1. Reads new Excel/CSV files from `data/csv/` folder
2. Standardizes column names and data formats
3. Appends data to `master_db.csv`
4. Runs full cleaning process on the master database
5. Creates `master_db_cleaned.csv`

**Edit `scripts/prepare_data.py`** to add source files:
```python
new_source_files = [
    'your_file1.xlsx',
    'your_file2.csv',
]
```

### Track Campaign Progress

```bash
# View real-time campaign statistics
python scripts/show_progress.py
```

Output includes:
- Total contacts in list
- Emails successfully sent
- Failed send attempts
- Remaining to send
- Daily send breakdown
- Campaign completion percentage

### Update Database from Logs

```bash
# Sync database with email logs
python scripts/update_db.py
```

Marks emails as sent in the master database based on `email_log.csv`.

### Generate WhatsApp Contact List

```bash
# Create WhatsApp-compatible contact database
python scripts/generate_whatsapp_db.py
```

Creates:
- `data/csv/whatsapp_db.csv` - Raw WhatsApp contacts
- `data/csv/whatsapp_db_cleaned.csv` - Cleaned with formatted phone numbers

## ⚙️ Configuration

### Campaign Parameters

Edit `config/campaigns.py` to customize campaigns:

```python
class MyCustomParams:
    CSV_PATH = 'data/csv/master_db.csv'
    SUBJECT = "My Campaign Subject"
    FORM_LINK = 'https://your-form-link.com'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/banner.jpg'
```

### Email Templates

Edit `src/templates/__init__.py` to customize email templates:

```python
def get_custom_template(name, FORM_LINK):
    """Your custom email template"""
    return f"""
    <html>
        <body>
            <p>Hello {name},</p>
            <!-- Your content here -->
        </body>
    </html>
    """
```

## 📊 Data Processing Pipeline

### Input Data Handling

The system handles various input formats:
- **Excel Files** (`.xlsx`): Multi-sheet support, automatic merging
- **CSV Files** (`.csv`): Standard comma-separated values
- **Email Files** (`.eml`): Parse form submissions from emails

### Column Name Mapping

The system automatically maps common column variations:
- **Name**: name, full name, participant name, student name
- **Email**: email, email id, email address, e-mail
- **Phone**: number, contact no, phone, mobile, phone number, etc.
- **City**: city, hometown, location

### Cleaning Process

1. **Email Validation**: Validates email format
2. **Name Standardization**: Title case, removes special characters
3. **Phone Formatting**: Extracts 10-digit numbers
4. **Gender Normalization**: Standardizes to Male/Female/Other
5. **Deduplication**: Removes duplicate emails (keeps first)
6. **Data Type Conversion**: Ensures correct types

## 🔐 Security & Best Practices

- **Credentials**: Use `.env` file for sensitive data (not version controlled)
- **Gmail Setup**: Enable 2-Factor Authentication and use App Passwords
- **Data Backup**: Keep backups of cleaned databases before major operations
- **Logging**: All send attempts are logged for audit trails
- **Testing**: Test with small sample before full campaign

## 📈 Typical Workflow

```
1. New Contacts Arrive
        ↓
2. Place in data/csv/
        ↓
3. Run prepare_data.py
        ↓
4. Review master_db_cleaned.csv
        ↓
5. Run send_campaigns.py
        ↓
6. Monitor with show_progress.py
        ↓
7. Analyze email_log.csv
        ↓
8. Update database with update_db.py
        ↓
9. Generate WhatsApp lists (if needed)
```

## 🛠️ Troubleshooting

### Issue: "EMAIL_ADDRESS or EMAIL_PASSWORD not found"
- **Solution**: Create `.env` file with credentials in project root

### Issue: "File not found" errors
- **Solution**: Ensure CSV files are in `data/csv/` directory with correct names

### Issue: No contacts to email
- **Solution**: Check if all contacts already have promo flag set to True in the database

### Issue: Email send failures
- **Solution**: Check internet connection, verify credentials, review error messages in `email_log.csv`

### Issue: Phone number formatting issues
- **Solution**: Ensure phone numbers are 10 digits; Indian numbers should not include country code

## 📚 Dependencies

- **pandas**: Data processing and CSV handling
- **python-dotenv**: Environment variable management
- **Pillow (PIL)**: Image processing for banners
- **numpy**: Numerical operations

See `requirements.txt` for specific versions.

## 📝 Logging

All email send attempts are logged in `data/csv/email_log.csv`:

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
