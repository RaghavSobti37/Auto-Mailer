# AutoMailer - Quick Reference Guide

## 🚀 New Workflow at a Glance

1.  **Drop Files**: Place all your raw CSV and Excel files into the `data/raw/` directory.
2.  **Clean & Merge**: Run the consolidation script. This will clean your data and merge it into the master database.
3.  **Send Emails**: Run the campaign script to send emails using the cleaned data.
4.  **Export (Optional)**: Run the export script to get subsets of your data.

---

## 📋 Commands

### 1. Consolidate and Clean Data
*This is the most important script. Run it whenever you add new data.*

```bash
python scripts/consolidate_and_clean.py
```
- **What it does**:
    - Scans `data/raw/` for new files.
    - Intelligently merges and cleans the data.
    - Updates the master database in `data/master_db/`.
    - Moves processed files to `data/processed/`.
- **Run this**: Whenever you add new files to `data/raw/`.

### 2. Send Email Campaigns
```bash
python scripts/send_campaigns.py
```
- **What it does**:
    - Lets you choose a campaign to send.
    - Uses the cleaned data from `data/master_db/master_db_cleaned.csv`.
    - Logs all sending activity to `logs/email_log.csv`.
- **Run this**: When you want to send an email campaign.

### 3. Export Data Subsets
```bash
python scripts/export_data.py
```
- **What it does**:
    - Creates a CSV file from a filtered subset of your master database.
    - You can filter by any column (e.g., `city`, `role in music`).
    - Saves the exported file to `data/exports/`.
- **Run this**: When you need a specific part of your data for analysis or other uses.

### 4. Manually Update Campaign Flags
```bash
python scripts/update_db.py --column <campaign_column_name>
```
- **What it does**:
    - Manually syncs the `email_log.csv` with the master database to update campaign flags.
    - This is useful if a campaign was interrupted or if you need to manually mark contacts as "sent".
- **Run this**: For manual data correction or synchronization.

### 5. Rise Emailer Campaign (NEW - Unified with Batch & Scheduler)
```bash
python scripts/rise_emailer_unified.py
```
- **What it does**:
    - Sends emails in optimized batches (50 recipients per batch)
    - Creates a working copy for progress tracking
    - Saves progress after each batch (resumable)
    - **Default**: Uses TEST database (4 test contacts) - SAFE MODE
    - **Switch to Production**: Edit `contacts_mode = "PRODUCTION"` in script
    - Real-time batch status with completion summary
- **Run this**: When you want to send Rise Emailer campaign with full progress tracking

### 6. Test Scheduler (1-Minute Delay)
```bash
python scripts/test_schedule_1min.py
```
- **What it does**:
    - Tests scheduler functionality with 1-minute delay
    - Automatically executes Rise Emailer campaign after 1 minute
    - Logs all output to `logs/test_schedule.log`
    - Uses TEST database by default (change `contacts_mode` to test with production data)
- **Run this**: To verify scheduler works before setting up production scheduling

---

## 📁 New Project Structure

```
AutoMailer/
├── data/
│   ├── raw/          # 1. Place your raw CSV/Excel files here
│   ├── processed/    # Old raw files are moved here after processing
│   ├── master_db/    # Your main database lives here
│   └── exports/      # Your exported data subsets are saved here
├── logs/
│   ├── activity.log  # Log of all script activities
│   └── email_log.csv # Log of all emails sent
├── scripts/
│   ├── consolidate_and_clean.py
│   ├── send_campaigns.py
│   └── export_data.py
├── config/
│   └── campaigns.py  # Campaign settings (subject, etc.)
└── src/              # Core application code
```

---

## 🔑 Key Files & Directories

| Path                                 | Purpose                                       | Edit?      |
| ------------------------------------ | --------------------------------------------- | ---------- |
| `.env`                               | Your email credentials                        | ✅ **Yes** |
| `data/raw/`                          | **Drop your new data files here**             | ✅ **Yes** |
| `config/campaigns.py`                | Campaign settings (subject, etc.)             | ✅ Yes     |
| `src/templates/__init__.py`          | Email HTML designs                            | ✅ Yes     |
| `data/master_db/master_db_cleaned.csv` | The main, clean database for campaigns      | -          |
| `data/exports/Delhi_Test_Contacts.csv` | Test contacts (4 users) - for safe testing | -          |
| `data/exports/Delhi_and_New_Delhi_Contacts.csv` | Production contacts (429 Delhi users) | -          |
| `data/exports/Delhi_and_New_Delhi_Contacts_WORKING.csv` | Production working copy with progress tracking | -  |
| `logs/activity.log`                  | Check this file for errors or progress        | -          |
| `logs/email_log.csv`                 | See who has been sent an email                | -          |
| `logs/rise_campaign.csv`             | Rise Emailer campaign logs                    | -          |

---

## 🛠️ Common Tasks

### How to Add New Contacts
1.  Drop your new `.csv` or `.xlsx` files into the `data/raw/` directory.
2.  Run the command:
    ```bash
    python scripts/consolidate_and_clean.py
    ```
That's it! The script will automatically clean, deduplicate, and merge your new contacts into the master database.

### How to Add a New Email Campaign
1.  **Add a template** in `src/templates/__init__.py`.
2.  **Add a parameter class** in `config/campaigns.py`.
3.  **Add the option** to the `choose_campaign` function in `scripts/send_campaigns.py`.

### How to Check for Errors
If something goes wrong, check the `logs/activity.log` file. It will contain detailed information about the script's execution and any errors that occurred. For email delivery issues, check `logs/email_log.csv`.
