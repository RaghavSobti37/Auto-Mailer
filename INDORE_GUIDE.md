# Indore Campaign Guide

## 🎯 Overview
This guide explains how to work with the Indore and region contacts, similar to how Delhi contacts are managed.

---

## 📊 What Was Created

### 1. **Indore_and_Region_Contacts.csv**
**Location:** `data/exports/Indore_and_Region_Contacts.csv`

Contains **152 contacts** from Indore and surrounding regions:
- **Indore city:** 108 contacts (71.1%)
- **Surrounding areas:** 44 contacts
  - Ujjain: 12
  - Mandsaur: 4
  - Dewas: 4
  - Dhar: 3
  - Burhanpur: 1
  - Shahdol: 1
  - Plus variations (Pithampur, Barwani, etc.)

**Columns:** name, email, phone, city, role in music, havells promo, country_code

**Email Coverage:** 100% (all 152 contacts)  
**Phone Coverage:** 93.4% (142 contacts)

---

## 🚀 Quick Start Commands

### Step 1: Re-export Contacts (if data is updated)
```bash
python scripts/export_indore.py
```
Use this to refresh the contacts list from the master database.

### Step 2: View Report
```bash
python scripts/indore_report.py
```
Shows:
- Total contact count
- City-wise breakdown
- Role-wise breakdown
- Email & phone availability

### Step 3: Send Campaign
```bash
python scripts/send_indore_campaign.py
```
Sends email campaign to all Indore region contacts using the HTML template from `assets/rise-emailer/`.

**Requirements:**
- `.env` file with `EMAIL_ADDRESS` and `EMAIL_PASSWORD`
- Images in `assets/rise-emailer/images/` (header.png, main.png)

**Features:**
- Batch sending (50 recipients per email)
- Automatic logging to `logs/indore_campaign.csv`
- Error handling and retry tracking

---

## 📁 File Structure

```
scripts/
├── export_indore.py              # Export contacts from master DB
├── indore_report.py              # Generate summary reports
└── send_indore_campaign.py       # Send campaigns to Indore contacts

data/exports/
└── Indore_and_Region_Contacts.csv # Main contact list

logs/
└── indore_campaign.csv            # Campaign logs (created after first send)
```

---

## 📊 Scripts Reference

### export_indore.py
**Purpose:** Extract Indore and region contacts from master database

**Output:** 
- CSV file at `data/exports/Indore_and_Region_Contacts.csv`
- Console report with city-wise breakdown

**Run:** `python scripts/export_indore.py`

---

### indore_report.py
**Purpose:** Generate detailed summary report

**Shows:**
- Contact statistics
- City-wise breakdown with percentages
- Role-wise breakdown (Singer, Composer, etc.)
- Email & phone availability
- Campaign history (if logs exist)

**Run:** `python scripts/indore_report.py`

---

### send_indore_campaign.py
**Purpose:** Send email campaign to all Indore contacts

**Process:**
1. Loads `Indore_and_Region_Contacts.csv`
2. Extracts valid emails
3. Sends in batches of 50 (with 1s delay between batches)
4. Logs results to `logs/indore_campaign.csv`

**Status Output:**
- ✅ Success: Emails sent with timestamp
- ❌ Failed: With error messages

**Requirements:**
- Environment: `.env` with EMAIL_ADDRESS and EMAIL_PASSWORD
- Images: `assets/rise-emailer/images/header.png` and `main.png`
- Host: Configured for Gmail SMTP (smtp.gmail.com:587)

**Run:** `python scripts/send_indore_campaign.py`

---

## 🔄 Comparison with Delhi Setup

| Feature | Delhi | Indore |
|---------|-------|--------|
| Export Script | `export_delhi.py` | `export_indore.py` |
| Contact File | `Delhi_and_New_Delhi_Contacts.csv` | `Indore_and_Region_Contacts.csv` |
| Campaign Script | `send_delhi_campaign.py` | `send_indore_campaign.py` |
| Report Script | (manual) | `indore_report.py` |
| Contact Count | Delhi: ~200+ | Indore: 152 |
| Log File | `logs/rise_campaign.csv` | `logs/indore_campaign.csv` |

---

## 💡 Usage Examples

### Check how many Indore contacts you have
```bash
python scripts/indore_report.py
```

### Prepare before sending a campaign
```bash
python scripts/export_indore.py
python scripts/indore_report.py
```

### Send campaign and check results
```bash
python scripts/send_indore_campaign.py
# Check logs
type logs\indore_campaign.csv
```

### Update contacts from latest master database
```bash
python scripts/export_indore.py
```

---

## 📝 Notes

- **Data Source:** All exports come from `data/master_db/master_db_cleaned.csv`
- **Email Template:** Uses HTML template from `assets/rise-emailer/email.html`
- **Images:** Embedded as MIME attachments (Content-ID references)
- **Batch Size:** 50 emails per send (configurable in script)
- **Rate Limiting:** 1 second delay between batches
- **Contact Variations:** Script handles different city name formats (Indore, indore, INDORE, etc.)

---

## ⚠️ Important

1. Ensure `.env` has valid Gmail credentials
2. Check image files exist before sending campaigns
3. Review report before large campaigns
4. Campaign logs are appended (not overwritten)
5. Test with small batch first if new email provider

---

## 🆘 Troubleshooting

**Error: Contact file not found**
- Run: `python scripts/export_indore.py`

**Error: EMAIL_ADDRESS or EMAIL_PASSWORD not found**
- Create/update `.env` file with credentials
- Format: `EMAIL_ADDRESS=your_email@gmail.com` (one per line)

**Campaign failing**
- Check internet connection
- Verify Gmail credentials are correct
- Enable "Less secure app access" in Gmail settings
- Check image files at `assets/rise-emailer/images/`

**Want to check campaign results**
- Run: `python scripts/indore_report.py`
- Or check raw logs: `logs/indore_campaign.csv`
