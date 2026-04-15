# Two-Script Email Campaign System - Created Scripts

## Summary

I've created a **two-script workflow** that separates sync and send operations for clarity and easier debugging.

### What Was Created

#### 1. **sync_log_to_csv.py** 
**Location:** `scripts/sync_log_to_csv.py`

**Purpose:** Individually search for each email from the log file in the CSV and mark them as sent.

**Features:**
- ✅ Reads `tsc_campaign_temp_log.csv` and extracts all SENT emails
- ✅ **Individual search:** Searches for EACH email one-by-one in the CSV
- ✅ Normalizes emails (lowercase, strip whitespace) for consistent matching
- ✅ **Detailed debugging:**
  - Shows which emails were found with row numbers
  - Shows which emails were NOT found (for troubleshooting)
  - Shows if an email has multiple matches in CSV
  - Progress reporting every 50 emails
- ✅ Marks found emails as `email_sent=True` in the CSV
- ✅ Provides final report with statistics
- ✅ Saves updated CSV

**Usage:**
```bash
python sync_log_to_csv.py
```

**Sample Debug Output:**
```
[01:44:21] 🔵 LOG FILE ANALYSIS:
[01:44:21]   ├─ Rows with SENT status: 16
[01:44:21]   ├─ Total email entries: 750
[01:44:21]   ├─ Unique emails: 750
[01:44:21] 🔵 Searching for 750 unique emails in CSV...
[01:44:21]   ├─ ✅ Found (1 match): rutwijshirode923@gmail.com at row 0
[01:44:21]   ├─ ✅ Found (1 match): musicwithchintan@gmail.com at row 1
[01:44:21]   ├─ ❌ Not found: email_that_doesnt_exist@gmail.com
[01:44:21] 🔵 SYNC RESULTS:
[01:44:21]   ├─ Emails found: 748
[01:44:21]   ├─ Emails not found: 2
```

---

#### 2. **send_tsc_campaign.py**
**Location:** `scripts/send_tsc_campaign.py`

**Purpose:** Send emails to contacts marked as `email_sent=False` in the CSV.

**Features:**
- ✅ Loads the synced CSV (assuming sync_log_to_csv.py was run first)
- ✅ Verifies the `email_sent` column exists
- ✅ **Shows sync verification:**
  - How many emails marked as sent vs. unsent
  - How many have valid email data
  - Sample of emails to be sent
- ✅ Filters for `email_sent=False` AND valid emails (removes NaN, empty, invalid formats)
- ✅ **Email validation:**
  - Must contain '@' symbol
  - Must be more than 5 characters
  - Shows filtered-out invalid emails in debug output
- ✅ Sends in batches of 50 emails
- ✅ **Detailed batch reporting:**
  - Shows batch number, count, success/failure per batch
  - Rate limiting (1 second between batches)
- ✅ Updates CSV with newly sent emails
- ✅ Logs results to log file
- ✅ Test mode: Send to 3 test addresses without modifying CSV

**Usage:**
```bash
# Test mode (with prompts)
python send_tsc_campaign.py

# Production mode (automatic, no prompts)
python send_tsc_campaign.py --auto --prod
```

**Sample Debug Output:**
```
[HH:MM:SS] 🔵 VERIFYING SYNC STATUS
[HH:MM:SS]   ├─ Already sent (True): 750
[HH:MM:SS]   ├─ Not yet sent (False): 927

[HH:MM:SS] 🔵 PREPARING EMAILS TO SEND
[HH:MM:SS]   ├─ Step 1 - Filter by email_sent column:
[HH:MM:SS]   ├─ Step 2 - Selected 927 unsent records
[HH:MM:SS]   ├─ Step 3 - Removed 16 records with NaN email
[HH:MM:SS]   ├─ Step 4 - Removed 0 records with empty email
[HH:MM:SS]   ├─ Sample emails ready to send:
[HH:MM:SS]   │  └─ 1. Rutwij shirode: rutwijshirode923@gmail.com
[HH:MM:SS]   │  └─ 2. Chintan Chauhan: musicwithchintan@gmail.com

[HH:MM:SS] 🔵 SENDING CAMPAIGN
[HH:MM:SS]   ├─ Batch 1/19: Sending to 50 recipients... ✅
[HH:MM:SS]   ├─ Batch 2/19: Sending to 50 recipients... ✅
[HH:MM:SS]   ├─ Batch 3/19: Sending to 50 recipients... ✅
```

---

#### 3. **WORKFLOW_GUIDE.md**
**Location:** `Auto-Mailer/WORKFLOW_GUIDE.md`

Complete guide on how to use both scripts, including:
- Workflow overview with diagram
- Step-by-step instructions
- Debug output examples
- Troubleshooting guide
- Command reference

---

## How to Use

### **Quick Start**

```bash
# Step 1: Sync the log with CSV (marks all previously sent emails)
cd "C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\scripts"
python sync_log_to_csv.py

# Step 2: Send to unmarked emails
python send_tsc_campaign.py --auto --prod
```

### **Workflow**

1. **Run `sync_log_to_csv.py`** first
   - Reads the log file
   - Searches for each sent email in the CSV
   - Marks them as `email_sent=True`
   - Provides debugging info if matches aren't found
   
2. **Run `send_tsc_campaign.py`** second
   - Loads the updated CSV
   - Shows which emails are marked and which aren't
   - Sends to all unmarked emails
   - Updates CSV with newly sent emails

---

## Key Features & Debugging

### **Debugging Steps Included**

Both scripts have extensive debug output:

1. **File loading debug:**
   - Shows file paths
   - Confirms files exist and are readable
   - Reports row/column counts

2. **Data validation debug:**
   - NaN/empty email detection
   - Email format validation (must have @, >5 chars)
   - Shows count of emails removed at each filtering step

3. **Matching debug** (sync script):
   - Individual search results for each email
   - Shows which emails found vs. not found
   - Identifies duplicates in CSV
   - Reports progress every 50 emails

4. **Send debug** (send script):
   - Shows sync status (how many already sent)
   - Sample of emails about to be sent
   - Per-batch success/failure reporting
   - Count of CSV rows updated

5. **Summary reports:**
   - Timestamp tracking
   - Final statistics
   - File paths logged

### **Where Issues Surface**

The debug output tells you:

- **"❌ Not found"** → Email in log but not in CSV (data mismatch)
- **"⚠️ Multiple matches"** → Duplicate emails in CSV (consider deduplication)
- **"Filtered out X invalid"** → Emails that don't meet format criteria
- **"NaN/empty emails"** → Rows with missing email addresses (auto-skipped)

---

## Files Modified/Created

| File | Type | Status |
|------|------|--------|
| `sync_log_to_csv.py` | New | ✅ Created |
| `send_tsc_campaign.py` | New | ✅ Created |
| `WORKFLOW_GUIDE.md` | New | ✅ Created |
| `merged_common_data.csv` | Modified | Updated with `email_sent` column |
| `tsc_campaign_temp_log.csv` | Read-only | Referenced for sync |

---

## Next Steps

1. **Test the sync script:**
   ```bash
   python sync_log_to_csv.py
   ```
   - Check debug output for any "Not found" emails
   - Review the SYNC REPORT section

2. **Verify CSV was updated:**
   - Open `merged_common_data.csv`
   - Check that `email_sent` column is populated
   - Count how many are True vs False

3. **Run the send script:**
   ```bash
   python send_tsc_campaign.py --auto --prod
   ```
   - Monitor the debug output
   - Check the log file for new entries
   - Verify CSV is updated after send

4. **For troubleshooting:**
   - Re-run sync script to see detailed matching info
   - Check the "EMAILS NOT FOUND" section
   - Look for pattern in missing matches (case, spelling, etc.)

---

## Configuration

If you need to modify paths or settings, edit the configuration classes at the top of each script:

```python
# In sync_log_to_csv.py
class SyncConfig:
    CSV_PATH = r"...\merged_common_data.csv"
    LOG_PATH = r"...\tsc_campaign_temp_log.csv"
    EMAIL_SENT_COLUMN = 'email_sent'

# In send_tsc_campaign.py
class TSCCampaignParams:
    CSV_PATH = r"..."
    LOG_PATH = r"..."
    BATCH_SIZE = 50
```

---

## Questions?

The debug output is designed to be self-explanatory. Each section clearly shows:
- What operation is running
- What data was found
- What was matched
- Where issues occurred
- Final summary with counts

If something goes wrong, the debug output will tell you exactly where.
