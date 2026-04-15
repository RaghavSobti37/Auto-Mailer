# 🚀 QUICK START GUIDE

## Start Here!

```bash
python run.py
```

Then select: **`1. Send Email Campaign`**

---

## Complete Workflow (4 Steps)

### Step 1: Select Dataset
Choose from available CSV files in `data/exports/`
- System auto-detects columns (name, email, phone, status)

### Step 2: Select Template  
Choose from email templates in `assets/email_templates/`
- Uses {name} placeholder for personalization

### Step 3: Preview & Confirm
See first 5 rows + statistics before sending
- Total records
- Pending vs. already sent
- Email validation results

### Step 4: Send in Batches
Automatically sends 50 emails per batch
- 0.5s delay between emails
- 5s delay between batches
- Progress displayed in real-time
- Can cancel anytime (Ctrl+C)

---

## What You Get

✅ **email_master.py** (19,605 bytes)
- Complete email sending engine
- Smart column detection
- Batch processing
- Progress tracking
- Logging service

✅ **run.py** (3,101 bytes)  
- Main entry point
- Menu system
- Utility script runner

✅ **3 Documentation Files**
- UNIFIED_SYSTEM_GUIDE.md - Complete guide
- DEPLOYMENT_SUMMARY.md - What changed
- SYSTEM_OVERVIEW.txt - Visual overview

✅ **31 Utility Scripts** 
- All non-sending scripts preserved
- export_data.py, generate_campaign_report.py, etc.

---

## Key Features

| Feature | Benefit |
|---------|---------|
| Smart Column Detection | No manual mapping needed |
| Batch Processing (50/batch) | Prevents email limits |
| Auto Resume | Continue from where you left |
| Rate Limiting | SMS throttling protection |
| Centralized Logging | Easy verification |
| Dataset Preview | See what you're sending |
| Clean Interface | Single entry point |

---

## Files Removed (14)

All email sending scripts consolidated:
- ❌ send_campaigns.py
- ❌ send_delhi_campaign.py  
- ❌ send_havells_excluding_registered.py
- ❌ send_indore_campaign.py
- ❌ send_indore_clickable_image_single.py
- ❌ send_optimized_batch.py
- ❌ send_test_havells_call.py
- ❌ send_to_delhi_contacts.py
- ❌ send_tsc_campaign.py
- ❌ send_tsc_temp.py
- ❌ rise_emailer_unified.py
- ❌ rise_emailer_with_approval.py
- ❌ resend_test_havells_call.py
- ❌ test_rise_emailer.py

---

## Output Files Created

After each campaign:

### Working Dataset
`data/exports/[dataset]_WORKING.csv`
- Columns: name, email, phone, Status
- Status: Sent, Failed, or Pending
- Updated after each batch

### Email Log
`logs/[template]_send.csv`
- Timestamp, Email, Name, Status, Error
- Append-only (nothing deleted)
- Perfect for compliance

---

## System Requirements

- Python 3.6+
- pandas
- dotenv
- Gmail account with App Password

## Setup

1. Create `.env` file with:
```
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

2. Run:
```bash
python run.py
```

---

## Example Output

```
📧 Preparing to send 405 emails in 9 batches of 50
================================================================================

📦 Batch 1/9 (50/405 total)
   ✅ gaurav@example.com
   ✅ priyanka@example.com
   ... [48 more] ...

💾 Saving progress...
⏳ Waiting 5s before next batch...

📦 Batch 2/9 (100/405 total)
   ... [50 emails] ...

[... batches 3-8 ...]

📦 Batch 9/9 (405/405 total)
   ... [5 remaining] ...

✅ EMAIL SENDING COMPLETE!
   Sent: 405
   Failed: 0
```

---

## Troubleshooting

### "EMAIL address not found"
→ Create `.env` file with valid credentials

### "Could not find email column"  
→ Check column names match standard format (email, Email, email_address, etc)

### "SMTP auth failed"
→ Use Gmail App Password, not regular password

### Stuck at batch?
→ Press Ctrl+C, next run continues automatically

---

## Need Help?

1. **Quick questions:** See DEPLOYMENT_SUMMARY.md
2. **Complete guide:** Read UNIFIED_SYSTEM_GUIDE.md
3. **Visual overview:** Check SYSTEM_OVERVIEW.txt
4. **Code details:** Look at email_master.py

---

## Status

✅ **PRODUCTION READY**  
**Version:** 2.0 (Unified System)  
**Deployed:** April 15, 2026

---

**Ready to send? → `python run.py`**
