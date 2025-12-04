# AutoMailer - Quick Reference Guide

## Running Scripts

All scripts should be run from the project root directory.

### 📧 Send Email Campaigns
```bash
python scripts/send_campaigns.py
```
Interactive script to:
- Choose campaign type (Teaser, Main, IML, etc.)
- Preview recipients
- Confirm before sending
- Logs all activity to `data/csv/email_log.csv`

### 📊 Prepare New Data
```bash
python scripts/prepare_data.py
```
Process new contact data:
1. Reads Excel/CSV files
2. Standardizes column names
3. Appends to master database
4. Runs full cleaning
5. Creates `master_db_cleaned.csv`

**Setup**: Edit `scripts/prepare_data.py` to add source files:
```python
new_source_files = [
    'your_file1.xlsx',
    'your_file2.csv',
]
```

### 📈 View Campaign Progress
```bash
python scripts/show_progress.py
```
Displays:
- Total contacts
- Emails sent ✅
- Failed sends ❌
- Remaining to send ⏳
- Daily breakdown
- Progress percentage

### 🔄 Update Database from Logs
```bash
python scripts/update_db.py
```
Syncs the database with email logs to mark all previously sent emails.

### 📱 Generate WhatsApp Contacts
```bash
python scripts/generate_whatsapp_db.py
```
Creates:
- `whatsapp_db.csv` - Raw phone numbers
- `whatsapp_db_cleaned.csv` - Formatted phone numbers

## Project Structure

```
scripts/                    # Run these scripts
├── send_campaigns.py      # Main email sending
├── prepare_data.py        # Add new contacts
├── show_progress.py       # View stats
├── update_db.py           # Sync with logs
└── generate_whatsapp_db.py # WhatsApp contacts

src/                       # Application code (don't run directly)
├── core/                  # Core business logic
│   ├── database.py       # Data cleaning
│   └── email_service.py  # Email sending
├── templates/            # Email templates
└── utils/                # Helper functions

config/                    # Settings
└── campaigns.py          # Campaign parameters

data/csv/                  # All data files
├── master_db.csv
├── master_db_cleaned.csv
├── email_log.csv
└── whatsapp_db.csv

assets/                    # Images and media
└── banner.jpg
```

## Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | Email credentials | ✅ Yes |
| `config/campaigns.py` | Campaign settings | ✅ Yes |
| `src/templates/__init__.py` | Email designs | ✅ Yes |
| `scripts/prepare_data.py` | Data source list | ✅ Yes |
| `data/csv/master_db.csv` | Contact list | ✅ Yes |
| `src/core/database.py` | Cleaning logic | ⚠️ Experts only |
| `src/core/email_service.py` | Email logic | ⚠️ Experts only |

## Essential Setup

### 1. Create .env File
```env
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 2. Add Banner Images
- Save to `assets/banner.jpg`
- Update path in `config/campaigns.py` if needed

### 3. Prepare Master Database
- Create `data/csv/master_db.csv` with columns:
  ```
  name, email, number, city, gender, havells promo
  ```

### 4. Add Source Data
- Place Excel/CSV files in `data/csv/`
- Edit `scripts/prepare_data.py` to list them
- Run `python scripts/prepare_data.py`

## Common Tasks

### Add a New Campaign

1. Add template in `src/templates/__init__.py`:
```python
def get_mycampaign_template(name):
    return f"""
    <html><body>Hello {name}!</body></html>
    """
```

2. Add params in `config/campaigns.py`:
```python
class MyCampaignParams:
    CSV_PATH = 'data/csv/master_db.csv'
    SUBJECT = "My Subject"
```

3. Add option in `scripts/send_campaigns.py` (choose_campaign function)

### Customize Email Template

Edit in `src/templates/__init__.py` - find the template function and modify HTML.

### Change Campaign Parameters

Edit `config/campaigns.py` to modify:
- CSV file path
- Subject line
- Form link
- Banner path
- Include/exclude banner

### Check Email Sending Status

Open `data/csv/email_log.csv` to see:
- Timestamp
- Email address
- Contact name
- Status (SENT or FAILED)
- Error message (if failed)

## Data Cleaning Details

The `clean_master_db()` function:
- ✅ Validates email format
- ✅ Standardizes names (Title Case)
- ✅ Extracts 10-digit phone numbers
- ✅ Normalizes gender (Male/Female/Other)
- ✅ Removes duplicates (keeps first)
- ✅ Removes invalid entries

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "EMAIL_ADDRESS not found" | Create `.env` file with credentials |
| "File not found" | Check file is in `data/csv/` with correct name |
| No contacts to email | Check if all have promo flag set to True |
| Emails not sending | Verify credentials, check `email_log.csv` for errors |
| Phone format wrong | Use 10-digit numbers without country code |

## Column Name Auto-Mapping

The system recognizes these column names automatically:
- **Name**: name, full name, participant name
- **Email**: email, email id, email address, e-mail
- **Phone**: number, contact no, phone, mobile, phone number
- **City**: city, hometown, location
- **Gender**: gender, sex

## Data File Locations

```
data/csv/
├── master_db.csv                # Raw data (edit carefully)
├── master_db_cleaned.csv        # Clean version (use for campaigns)
├── master_db_updated.csv        # After log sync
├── email_log.csv                # Send history (auto-generated)
├── whatsapp_db.csv             # Raw WhatsApp contacts
└── whatsapp_db_cleaned.csv     # Formatted WhatsApp contacts
```

## Tips & Best Practices

1. **Always test with small sample first** before full campaign
2. **Keep backups** of cleaned databases
3. **Review `email_log.csv`** to find delivery issues
4. **Use campaign tracking flags** to prevent duplicate sends
5. **Update templates** for better engagement
6. **Monitor progress** with `show_progress.py`
7. **Keep credentials secure** - never commit `.env` file

## Important Notes

⚠️ **Data Loss Prevention**
- Always keep backups of `master_db_cleaned.csv`
- Don't directly edit `email_log.csv`
- Use `update_db.py` to sync data

⚠️ **Email Limits**
- Gmail: ~500 emails/day limit
- Test with small batches first
- Monitor sending speed

⚠️ **Credential Safety**
- `.env` file is in `.gitignore`
- Use App Passwords for Gmail
- Never share credentials

---

**Version**: 1.0.0  
**Last Updated**: December 2024

For detailed information, see README.md and RESTRUCTURING_GUIDE.md
