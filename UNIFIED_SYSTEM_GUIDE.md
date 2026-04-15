# 🚀 AUTO-MAILER UNIFIED EMAIL SYSTEM

**Status:** ✅ SUCCESSFULLY DEPLOYED (April 15, 2026)

## Overview

The Auto-Mailer system has been completely unified into a **single master script** that handles all email campaign needs. You no longer need to manage multiple sending scripts - everything is consolidated into one organized system.

---

## 🎯 What's New

### ✅ What You Get
- **Single unified command** to run all email campaigns
- **Smart dataset detection** - automatically identifies name, email, phone columns
- **Interactive workflow** - user-friendly step-by-step process
- **Batch processing** - sends emails in batches of 50 with progress tracking
- **Resume capability** - can pause and resume campaigns
- **Automatic tracking** - marks sent emails to prevent duplicates
- **No main data disruption** - works with a clean copy of your dataset

### ❌ What Was Deleted
All redundant email sending scripts have been removed:
- `send_campaigns.py`
- `send_delhi_campaign.py`
- `send_havells_excluding_registered.py`
- `send_indore_campaign.py`
- `send_indore_clickable_image_single.py`
- `send_optimized_batch.py`
- `send_test_havells_call.py`
- `send_to_delhi_contacts.py`
- `send_tsc_campaign.py`
- `send_tsc_temp.py`
- `rise_emailer_unified.py`
- `rise_emailer_with_approval.py`
- `resend_test_havells_call.py`
- `test_rise_emailer.py`

**Total: 14 scripts consolidated into 2 master files**

---

## 📋 Master Files

### 1. **email_master.py** (NEW)
The core email campaign system with all functionality:
- Column mapping engine
- Template loading
- Dataset preparation
- Email sending service
- Batch processing
- Progress tracking and logging

### 2. **run.py** (UPDATED)
The main entry point with menu system:
```
1. 📧 Send Email Campaign (Unified System)
2. 🛠️  Run Utility Scripts
q. Quit
```

---

## 🚀 How to Use

### Quick Start
```bash
python run.py
```

Then select: **`1. Send Email Campaign`**

### Complete Workflow

#### **Step 1: Select Dataset**
Choose from available datasets in `data/exports/`:
```
1. auto - clean_data.csv
2. Delhi_and_New_Delhi_Contacts.csv
3. Delhi_and_New_Delhi_Contacts_WORKING.csv
... more
```

The system will automatically:
- Load the dataset
- Detect columns: Name, Email, Phone, Status
- Show column mapping confirmation

#### **Step 2: Select Template**
Choose an email template from `assets/email_templates/`:
```
1. Havells Indore Audition
2. TSC Academy
... more
```

Or leave it blank to use a default template.

#### **Step 3: Preview & Confirm**
See the first 5 rows of data:
```
┌─────────────────────────────────────────┐
│ name           │ email           │ phone │
├─────────────────────────────────────────┤
│ John Doe       │ john@gmail... │ 9876... │
│ Jane Smith     │ jane@gmail... │ 9876... │
│ ...            │ ...           │ ...    │
└─────────────────────────────────────────┘

📈 Statistics:
   Total records: 1245
   Pending (not sent): 1150
   Already sent: 95
   Valid email format: 1240/1245
```

#### **Step 4: Send Emails**
Emails are sent in **batches of 50**:
```
📦 Batch 1/24 (50/1245 total)
   ✅ john@gmail.com
   ✅ jane@example.com
   ❌ invalid@email (error shown)
   ... 47 more

💾 Saving progress...
⏳ Waiting 5s before next batch...

Batch 2/24 (100/1245 total)
   ...
```

**Working dataset** is created and updated automatically:
- Original dataset: `data/exports/sample.csv`
- Working copy: `data/exports/sample_WORKING.csv` (with Status column)

---

## 📊 Dataset Format

### Input Requirements
Your dataset must contain columns for:
- **Name** (any variation: `name`, `Name`, `full_name`, `Full Name`, etc.)
- **Email** (any variation: `email`, `Email`, `email_address`, etc.)
- **Phone** (optional: `phone`, `Phone`, `mobile`, etc.)
- **Status** (optional: `sent`, `Sent`, `email_sent`, etc.)

### Output Format
Working dataset created with standard columns:
```csv
name,email,phone,Status
John Doe,john@gmail.com,9876543210,Pending
Jane Smith,jane@example.com,9876543211,Sent
Bob Johnson,bob@gmail.com,9876543212,Sent
...
```

**Statuses:**
- `Pending` - Not yet sent
- `Sent` - Successfully sent
- `Failed` - Error during sending

---

## 🔍 Smart Column Detection

The system automatically maps columns using pattern recognition. For example:

| Your Column Name | Detected As |
|---|---|
| `Name` | name |
| `Customer_Email` | email |
| `Phone Number` | phone |
| `email_sent` | Status |
| `sent_status` | Status |

If unsure which column is which, the system shows you before proceeding.

---

## 📧 Email Template Format

Templates use HTML with `{name}` placeholder:

```html
<html>
<body>
<h2>Hello {name},</h2>
<p>Thank you for your interest!</p>
</body>
</html>
```

The `{name}` is replaced with each recipient's name.

---

## 📝 Email Logs

Logs are saved in `logs/` directory:
```
logs/
├── havells_indore_audition_send.csv
├── tsc_academy_send.csv
└── ...
```

Log format:
```csv
Timestamp,Email,Name,Status,Error
2026-04-15 10:30:45,john@gmail.com,John Doe,SENT,
2026-04-15 10:30:50,invalid@test.com,Test User,FAILED,Invalid email format
```

---

## ⚠️ Important Notes

### Email Address & Password
Ensure your `.env` file has:
```
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

For Gmail, use **App Password** (not your regular password):
1. Enable 2-step verification on Google Account
2. Create an "App Password" at myaccount.google.com
3. Use that 16-character password

### Rate Limiting
- 0.5 second delay between emails (prevents SMTP issues)
- 5 second delay between batches
- 50 emails per batch

### Resume Capability
If interrupted:
1. Check the `_WORKING.csv` file - shows which emails were sent
2. Re-run the same dataset
3. System will skip already sent emails (Status = "Sent")

---

## 🛠️ Utility Scripts

The system preserves all utility/helper scripts:
```
scripts/
├── add_manual_participants.py
├── clean_master_db.py
├── export_data.py
├── generate_campaign_report.py
├── ... (all non-sending scripts)
└── sync_log_to_csv.py
```

Run any utility from: **`2. Run Utility Scripts`** in the menu.

---

## 📊 Project Statistics

### Before (April 14, 2026)
- **14 email sending scripts** (duplicated functionality)
- Multiple entry points for same task
- Complex workflow with different UIs
- Risk of using wrong script
- Difficult to maintain consistency

### After (April 15, 2026)
- **1 unified email system** (email_master.py)
- **1 unified entry point** (run.py)
- Single consistent workflow
- Smart auto-detection
- Easy to maintain and extend

---

## 🎓 Example Workflow

```bash
$ python run.py

AUTO-MAILER - MAIN MENU
======================
1. 📧 Send Email Campaign (Unified System)
2. 🛠️  Run Utility Scripts
q. Quit

> 1

📂 SELECT DATASET
=================
1. auto - clean_data.csv
2. Delhi_and_New_Delhi_Contacts.csv
3. havells_eligible_contacts.csv

> 2

📂 Loading dataset: Delhi_and_New_Delhi_Contacts.csv
   ✅ Loaded 429 rows
   📋 Columns found: ['name', 'email', 'phone', 'city', ...]
   ✨ Column mapping:
      Name → name
      Email → email
      Phone → phone
      Status → (not found)

📧 SELECT EMAIL TEMPLATE
=======================
1. Havells Indore Audition
2. TSC Academy

> 1

📊 DATASET PREVIEW & STATISTICS
================================

📈 Statistics:
   Total records: 429
   Pending (not sent): 405
   Already sent: 24
   Valid email format: 427/429

📋 First 5 rows:
────────────────────────────────────────────────
name              email                   phone       Status
Gaurav Jha        gaurav@example.com      9876543210  Pending
Priyanka Singh    priyanka@example.com    9876543211  Sent
Rahul Sharma      rahul@example.com       9876543212  Pending
...
────────────────────────────────────────────────

✅ Proceed with this dataset? (y/n): y

📝 Enter email subject: Exclusive Music Workshop Opportunity

📧 Using subject: Exclusive Music Workshop Opportunity

⚠️  Ready to send emails? (y/n): y

🔐 Connecting to Gmail SMTP...
✅ Connected successfully!

📧 Preparing to send 405 emails in 9 batches of 50
================================================================================

📦 Batch 1/9 (50/405 total)
   ✅ gaurav@example.com
   ✅ priyanka@example.com
   ✅ rahul@example.com
   ... (47 more)

💾 Saving progress...
⏳ Waiting 5s before next batch...

[... more batches ...]

================================================================================
✅ EMAIL SENDING COMPLETE!
   Sent: 405
   Failed: 0
================================================================================

✅ Campaign workflow complete!
```

---

## 🔧 Troubleshooting

### "❌ ERROR: EMAIL_ADDRESS or EMAIL_PASSWORD not found in .env file"
**Solution:** Create `.env` file in the project root with valid credentials.

### "❌ Could not find email column"
**Solution:** Your CSV might have column names the system doesn't recognize. Check column names and rename them to standard formats:
- For email: `Email`, `email_address`, `recipient_email`
- For name: `Name`, `full_name`, `contact_name`

### "SMTP connection failed"
**Solution:** 
1. Check internet connection
2. Verify Gmail App Password (not regular password)
3. Check if 2-step verification is enabled
4. Gmail might block "less secure apps" - use App Passwords instead

### Emails get stuck at batch
**Solution:** Press `Ctrl+C` to stop. Next run will:
1. Check `_WORKING.csv` for Status = "Sent"
2. Skip those emails
3. Continue from where you left off

---

## 📚 File Structure

```
Auto-Mailer/
├── run.py                          (Main entry point - UPDATED)
├── email_master.py                 (Master email system - NEW)
├── data/
│   └── exports/
│       ├── sample.csv              (Original data)
│       └── sample_WORKING.csv      (Working copy)
├── assets/
│   └── email_templates/
│       ├── havells_template.html
│       └── tsc_template.html
├── logs/
│   ├── template_send.csv           (Email send logs)
│   └── ...
├── scripts/                        (14 sending scripts removed)
│   ├── (utility scripts only now)
│   └── sync_log_to_csv.py
└── .env                            (Email credentials)
```

---

## 🎯 Next Steps

1. **Start using:** `python run.py` and select "Send Email Campaign"
2. **Test first:** Try with a small test dataset before production
3. **Monitor logs:** Check `logs/` for detailed send reports
4. **Integrate workflows:** All utility scripts still work alongside the new system

---

## 📞 Support

For issues with the new unified system:
1. Check the troubleshooting section above
2. Review email logs in `logs/`
3. Verify `.env` credentials
4. Check working dataset (`_WORKING.csv`) for status information

---

**Deployed:** April 15, 2026  
**System Status:** ✅ Production Ready  
**Version:** 2.0 (Unified System)
