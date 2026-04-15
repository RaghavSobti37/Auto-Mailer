# TSC Academy Campaign - Two-Script Workflow

This workflow separates the sync and send operations for clarity and easier debugging.

## Before You Start

Make sure you have:
- ✅ `merged_common_data.csv` in the data/exports folder
- ✅ `tsc_campaign_temp_log.csv` in the logs folder
- ✅ `.env` file with EMAIL_ADDRESS and EMAIL_PASSWORD

## Workflow Overview

```
sync_log_to_csv.py          send_tsc_campaign.py
        ↓                            ↓
   [Step 1]                    [Step 2]
  Load log                     Load CSV
     ↓                            ↓
Search each email          Filter email_sent=False
     ↓                            ↓
Mark True in CSV            Send batches
     ↓                            ↓
  Save CSV                  Update CSV log
                                  ↓
                            Save to log file
```

## Step 1: Run the Sync Script

This script reads all emails from the log file and marks them in the CSV.

```bash
cd C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\scripts
python sync_log_to_csv.py
```

### What It Does:
1. Reads `tsc_campaign_temp_log.csv`
2. Extracts all emails marked with Status='SENT'
3. Searches the CSV for each email individually
4. Marks matching emails as `email_sent=True`
5. **Provides detailed debug output** showing:
   - ✅ Which emails were found
   - ❌ Which emails were NOT found
   - ⚠️ Which emails have multiple matches
6. Saves the updated CSV

### Debug Output Format:
```
[HH:MM:SS] 🔵 Reading log file: ...
[HH:MM:SS]   ├─ Log file loaded: 20 total rows
[HH:MM:SS]   ├─ Found 16 rows with status='SENT'
[HH:MM:SS]   ├─ Total email entries: 750
[HH:MM:SS]   ├─ Unique emails: 750
[HH:MM:SS] 🔵 Searching for 750 unique emails in CSV...
[HH:MM:SS]   ├─ ✅ Found (1 match): email@example.com at row 10
[HH:MM:SS]   ├─ ❌ Not found: email@example.com
[HH:MM:SS]   ├─ ⚠️ Found (MULTIPLE matches): email@example.com - 2 matches
```

## Step 2: Run the Send Script

After syncing, run this script to send emails to unmarked contacts.

```bash
# Test mode (send to 3 test addresses only)
python send_tsc_campaign.py

# Production mode (skip prompts)
python send_tsc_campaign.py --auto --prod
```

### What It Does:
1. Loads the CSV (now updated with sync status)
2. Verifies the `email_sent` column exists
3. **Shows verification info:**
   - How many emails are marked as sent vs. unsent
   - How many have valid data
4. Filters for `email_sent=False` and valid emails
5. Shows a sample of emails to send
6. **Sends in batches of 50 emails**
7. **Updates CSV** with newly sent emails
8. **Logs results** to the log file

### Debug Output:
```
[HH:MM:SS] 🔵 VERIFYING SYNC STATUS
[HH:MM:SS]   ├─ Already sent (True): 750
[HH:MM:SS]   ├─ Not yet sent (False): 927
[HH:MM:SS] 🔵 PREPARING EMAILS TO SEND
[HH:MM:SS]   ├─ Step 1 - Filter by email_sent column:
[HH:MM:SS]   │  └─ Marked as True (already sent): 750
[HH:MM:SS]   │  └─ Marked as False (not sent): 927
[HH:MM:SS]   ├─ Sample emails ready to send:
[HH:MM:SS]   │  └─ 1. Name: email@example.com
[HH:MM:SS] 🔵 SENDING CAMPAIGN
[HH:MM:SS]   ├─ Batch 1/19: Sending to 50 recipients... ✅
[HH:MM:SS]   ├─ Batch 2/19: Sending to 50 recipients... ✅
```

## Troubleshooting

### Issue: "Emails not found in CSV"

**Meaning:** The sync script couldn't match emails from the log with emails in the CSV.

**Debug Info:**
- Check the "EMAILS NOT FOUND IN CSV" section in the debug output
- These emails may have typos or formatting differences

**Fix:**
1. Check if the email exists in the CSV with a different spelling
2. Look for extra spaces or different capitalization
3. The scripts normalize emails (lowercase, strip), so case/space shouldn't matter

### Issue: "Multiple matches"

**Meaning:** The same email appears in multiple rows of the CSV.

**Debug Info:**
- Shows which email and which row indices have duplicates
- All duplicates are marked as sent

**Fix:**
- This is handled automatically - all matching rows are marked
- Consider deduplicating the CSV if it's a problem

### Issue: "NaN/Empty emails"

**Meaning:** Some rows in the CSV have missing email addresses.

**Debug Info:**
- Shown in CSV analysis: "NaN/empty emails: X NaN + Y empty"

**Fix:**
- These are automatically skipped during sending
- They won't be sent to, but they're noted in the debug output

## Quick Command Reference

```bash
# Just sync (no sending)
python sync_log_to_csv.py

# Send with test mode confirmation prompts
python send_tsc_campaign.py

# Send in test mode automatically
python send_tsc_campaign.py --auto

# Send in production mode automatically
python send_tsc_campaign.py --auto --prod

# Check what would be sent (run sync then check CSV manually)
python sync_log_to_csv.py
# Then open merged_common_data.csv and filter where email_sent=False
```

## Expected Results

### After Sync:
- CSV updated with all sent emails marked as `True`
- Sync script shows: "✅ Sync completed successfully"

### After Send:
- New batch entries in the log file
- CSV shows updated count of `True` values
- Send script shows: "🔵 SEND COMPLETE"

## Files Modified

- **merged_common_data.csv** - Updated with email_sent column values
- **tsc_campaign_temp_log.csv** - New entries appended for each send batch

## Questions?

Check the debug output - the scripts are designed with detailed logging to show exactly where things go right or wrong.
