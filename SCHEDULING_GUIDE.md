# 🕐 Email Campaign Scheduling Guide

## Overview
You have **2 options** to schedule the Rise Emailer campaign:

### Option 1: APScheduler (Recommended)
**Best for:** Reliable execution regardless of system behavior
- ✅ Runs in background - keeps program open at 9am
- ✅ Works consistently every day
- ❌ Requires keeping a terminal window open (can minimize)

### Option 2: Windows Task Scheduler
**Best for:** Fire-and-forget scheduling
- ✅ No need to keep window open
- ✅ Integrates with Windows
- ❌ System must be ON at 9:00 AM

---

## Option 1: APScheduler (Recommended)

### How to Use

1. **Run the scheduler script:**
   ```bash
   python scripts/schedule_campaign.py
   ```

2. **Output will show:**
   ```
   📅 EMAIL SCHEDULER ACTIVE
   ✅ Scheduler started successfully!
   ⏰ Campaign will run daily at 09:00 AM
   📊 Recipients: 429 contacts
   ```

3. **Keep the window open** (you can minimize it)

4. **Scheduler will automatically:**
   - Check the time daily
   - Execute at exactly 9:00 AM
   - Send emails to all 429 contacts in batches
   - Log all activity to `logs/rise_campaign_scheduled.csv`

5. **To stop:** Press `Ctrl+C` in the terminal

### Advantages
✅ Always runs at configured time  
✅ Can run multiple days/weeks without restart  
✅ Detailed logging included  
✅ Can modify time in script easily  

### Change Scheduled Time
Edit `scripts/schedule_campaign.py` line ~184:
```python
scheduler = start_scheduler(hour=9, minute=0)  # Change 9 to desired hour (0-23)
```

---

## Option 2: Windows Task Scheduler

### How to Set Up (Advanced)

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type: `taskschd.msc`
   - Press Enter

2. **Create a Basic Task:**
   - Click "Create Basic Task" on right side
   - Name: `Rise Emailer Campaign`
   - Description: "Send Rise Emailer campaign at 9am"
   - Click Next

3. **Set Trigger:**
   - Select "Daily"
   - Start: (today's date)
   - Recur every: 1 day
   - Time: 09:00:00 AM
   - Click Next

4. **Set Action:**
   - Select "Start a program"
   - Program/script: `python.exe`
   - Add arguments: `full_path_to_script\scripts\send_delhi_campaign.py`
   - Example: `C:\Users\ragha\OneDrive\Desktop\AutoMailer\Auto-Mailer\scripts\send_delhi_campaign.py`
   - Click Next

5. **Finish:**
   - Review settings
   - Click Finish

### Requirements for Task Scheduler
⚠️ **System must be ON at 9:00 AM**
- If system is off, task will wait until next 9am when system is on
- Not suitable for scheduled times often missed

### Advantages
✅ Fully automated - no window to keep open  
✅ Integrated into Windows system  
✅ Runs in background  

### Disadvantages
❌ System must be ON  
❌ More complex setup  
❌ Harder to debug if issues occur  

---

## ✅ Recommended Setup

**Use APScheduler** because:
1. Most reliable - doesn't depend on system state
2. Easy to control - just run script or stop
3. Better logging and visibility
4. Easy to modify time if needed
5. Can be kept running 24/7 if needed

### Quick Start:
```bash
python scripts/schedule_campaign.py
```

Then minimize the window and let it run!

---

## Monitoring

### Check Logs
After campaign runs, check activity:
```bash
type logs/rise_campaign_scheduled.csv
```

### See Recent Batch Status:
```bash
tail -10 logs/rise_campaign_scheduled.csv
```

---

## Troubleshooting

### Campaign didn't run at 9am?
1. **APScheduler:** Check if terminal is still open (it must be)
2. **Task Scheduler:** Check if system was on at 9am
3. **Both:** Check `logs/rise_campaign_scheduled.csv` for errors

### Want to run manually?
Run anytime without scheduler:
```bash
python scripts/send_delhi_campaign.py
```

### Change timezone?
Windows uses system timezone automatically. Check Settings > Time & Language > Date & time > Timezone

---

## Security Notes
🔒 Email credentials stored in `.env` file  
🔒 Task Scheduler may cache credentials - handle with care  
🔒 APScheduler doesn't cache - reads from .env each time  
