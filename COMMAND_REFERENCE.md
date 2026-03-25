# 🚀 Havells mYOUsic - AutoMailer Command Reference

> **Quick command shortcuts for all functions in the project**

---

## 📌 Python Executable & Working Directory

```bash
# Python Path
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe

# Change to project directory
cd "C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer"
```

---

## 📧 Email Campaign Sender (Main Script)

### Test Mode - 6 Test Emails Only
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode test
```

### Test Mode - Dry Run (Preview Only)
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode test --dry-run
```

### Production Mode - Full Campaign
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod
```

### Production Mode - Dry Run (Preview Only)
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod --dry-run
```

### Custom Batch Size
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod --batch-size 100
```

### Custom Delay Between Batches (in seconds)
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod --delay-seconds 2
```

### Resume Campaign (Auto-skips sent emails)
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod
```

---

## 📊 Reporting & Analytics

### Generate Full Report (HTML + TXT)
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_campaign_report.py
```

### Generate HTML Report Only
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_campaign_report.py --format html
```

### Generate TXT Report Only
```bash
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_campaign_report.py --format txt
```

### View Text Report
```bash
type "reports\campaign_report.txt"
```

### Open HTML Report in Browser
```bash
start "reports\campaign_report.html"
```

---

## 🔧 Data Management

| Command | Purpose |
|---------|---------|
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/clean_master_db.py` | Clean master database |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/consolidate_and_clean.py` | Consolidate and clean data |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/update_db.py` | Update master database |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/export_data.py` | Export data |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/export_delhi.py` | Export Delhi contacts |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/export_indore_final.py` | Export Indore contacts (final) |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/fill_missing_data.py` | Fill missing data |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/sort_locations.py` | Sort locations |
| `C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/verify_cleanup.py` | Verify cleanup |

---

## 🚀 Other Campaigns

```bash
# Test Havells Call
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_test_havells_call.py

# Resend Test Havells Call
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/resend_test_havells_call.py

# Delhi Campaign
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_delhi_campaign.py

# Indore Campaign
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_indore_campaign.py

# Send to Delhi Contacts
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_to_delhi_contacts.py

# Send Campaigns
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_campaigns.py

# Send Optimized Batch
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_optimized_batch.py
```

---

## 📱 WhatsApp & Advanced Features

```bash
# Generate WhatsApp Database
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_whatsapp_db.py

# Schedule Campaign
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/schedule_campaign.py

# Setup Windows Scheduler
scripts/setup_windows_scheduler.bat

# Embed Images
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/embed_images.py
```

---

## 🔍 Verification & Testing

```bash
# Crosscheck Logs
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/crosscheck_logs.py

# Verify Crosscheck
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/verify_crosscheck.py

# Test New Features
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/test_new_features.py

# Test Rise Emailer
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/test_rise_emailer.py

# Test Schedule 1 Min
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/test_schedule_1min.py

# Show Progress
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/show_progress.py
```

---

## 📈 Reports & Analysis

```bash
# Indore Report
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/indore_report.py

# Email Report Simple
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/email_report_simple.py

# Cleanup Summary
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/cleanup_summary.py

# Update Email Logs
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/update_email_logs.py

# Update Havells mYOUsic
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/update_havells_myousic.py
```

---

## 📂 Important File Locations

| File/Folder | Purpose |
|-------------|---------|
| `data/master_db/master_db_final.csv` | Master contact database |
| `data/search/auto - auto.csv` | Already registered contacts |
| `data/exports/havells_eligible_contacts.csv` | Eligible contacts for sending |
| `logs/havells_batch_send_log.csv` | Email send tracking log |
| `reports/campaign_report.html` | Campaign report (visual) |
| `reports/campaign_report.txt` | Campaign report (text) |
| `assets/email_templates/havells_indore_audition_template.html` | HTML email template |
| `assets/email_templates/havells_indore_audition_template.txt` | Text email template |
| `.env` | Environment variables (EMAIL_ADDRESS, EMAIL_PASSWORD) |

---

## 🎯 Common Workflows

### Workflow 1: Test Campaign (5 minutes)
```bash
# Step 1: Dry run to preview
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode test --dry-run

# Step 2: Send to test emails
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode test

# Step 3: Generate report
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_campaign_report.py
```

### Workflow 2: Production Campaign (30+ minutes)
```bash
# Step 1: Dry run to verify
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod --dry-run

# Step 2: Start production send
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod

# Step 3: Generate and view report
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/generate_campaign_report.py
start "reports\campaign_report.html"
```

### Workflow 3: Resume Interrupted Campaign
```bash
# Script automatically skips already-sent emails from batch log
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/send_havells_excluding_registered.py --mode prod
```

### Workflow 4: Clean & Update Data
```bash
# Step 1: Clean master database
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/clean_master_db.py

# Step 2: Consolidate and clean
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/consolidate_and_clean.py

# Step 3: Verify
C:/Users/ragha/AppData/Local/Programs/Python/Python313/python.exe scripts/verify_cleanup.py
```

---

## ⚠️ Important Notes

1. **Always test first with `--dry-run`** before production sends
2. **Environment variables required** in `.env`:
   - `EMAIL_ADDRESS=your_gmail@gmail.com`
   - `EMAIL_PASSWORD=your_app_password`
3. **Batch send log** (`logs/havells_batch_send_log.csv`) is the source of truth for tracking
4. **Production mode** automatically skips already-sent emails for safe resumability
5. **Reports** are saved in `reports/` directory:
   - `campaign_report.html` - Visual dashboard
   - `campaign_report.txt` - Detailed text report
6. **Test mode** uses 6 fixed test emails (can override with `--test-emails email1,email2`)
7. **Batch size** default is 50 (adjust with `--batch-size N`)
8. **Batch delay** default is 1 second (adjust with `--delay-seconds N`)

---

## 💡 Tips

- Copy any command and paste it directly into PowerShell
- Use `Ctrl+C` to interrupt a running campaign (can resume with same command)
- Check `reports/campaign_report.html` for visual campaign analytics
- Always verify `.env` credentials before production sends
- Monitor network/SMTP errors in the batch log

---

**Last Updated:** March 25, 2026  
**Project:** Havells mYOUsic - AutoMailer  
**Location:** `C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\`
