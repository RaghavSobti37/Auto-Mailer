# AutoMailer - Documentation Index

Welcome to the restructured AutoMailer project! This document helps you navigate all available documentation and understand the project structure.

## 📖 Documentation Files (Read These!)

### 🚀 Quick Start
**File: `QUICK_REFERENCE.md`**
- Quick commands for all scripts
- Common tasks and solutions
- Essential setup steps
- Perfect for getting started quickly

**When to use:** You want to quickly run a task without reading everything.

### 📘 Comprehensive Guide
**File: `README.md`**
- Complete project documentation
- Feature descriptions
- Installation and setup
- Detailed usage guide for each script
- Troubleshooting section
- Security best practices

**When to use:** You're new to the project or need detailed information.

### 🔄 Understanding Changes
**File: `RESTRUCTURING_GUIDE.md`**
- What changed and why
- Old vs. new file structure
- Module organization details
- Migration guidance
- File mapping reference

**When to use:** You're migrating from the old structure or want to understand improvements.

### ✅ Project Status
**File: `PROJECT_STATUS.md`**
- Completion checklist
- What's been done
- Feature verification
- File organization summary
- Next steps and improvements

**When to use:** You want to verify what's been completed or plan future work.

---

## 🎯 Quick Navigation

### If You Want To...

#### ...Send an Email Campaign
1. Read: **QUICK_REFERENCE.md** → "Running Scripts" → "Send Email Campaigns"
2. Run: `python scripts/send_campaigns.py`
3. Reference: **README.md** → "Running Email Campaigns"

#### ...Add New Contacts
1. Read: **QUICK_REFERENCE.md** → "Running Scripts" → "Prepare New Data"
2. Edit: `scripts/prepare_data.py` (add your files)
3. Run: `python scripts/prepare_data.py`
4. Reference: **README.md** → "Data Preparation"

#### ...Track Progress
1. Run: `python scripts/show_progress.py`
2. Reference: **QUICK_REFERENCE.md** → "View Campaign Progress"

#### ...Customize a Campaign
1. Edit: `config/campaigns.py` (parameters) OR `src/templates/__init__.py` (email design)
2. Reference: **README.md** → "Configuration"

#### ...Understand the New Structure
1. Read: **RESTRUCTURING_GUIDE.md** (complete overview)
2. Or: **QUICK_REFERENCE.md** → "Project Structure"

#### ...Verify Everything Works
1. Check: **PROJECT_STATUS.md** → "Functionality Verification"
2. Test: `python scripts/send_campaigns.py` (in test mode)
3. Monitor: `python scripts/show_progress.py`

---

## 📁 Project Structure Overview

```
AutoMailer/
├── 📄 README.md                    ← Start here for complete info
├── 📄 QUICK_REFERENCE.md           ← Commands and quick tasks
├── 📄 RESTRUCTURING_GUIDE.md       ← What changed and why
├── 📄 PROJECT_STATUS.md            ← Completion checklist
├── 📄 INDEX.md (this file)         ← Documentation map
│
├── src/                            # Application code
│   ├── core/
│   │   ├── database.py            # Data cleaning
│   │   └── email_service.py       # Email sending
│   ├── templates/                 # Email templates
│   └── utils/                     # Helper functions
│
├── scripts/                        # Run these!
│   ├── send_campaigns.py          # Main email script
│   ├── prepare_data.py            # Prepare data
│   ├── show_progress.py           # View stats
│   ├── update_db.py               # Update from logs
│   └── generate_whatsapp_db.py    # WhatsApp contacts
│
├── config/
│   └── campaigns.py               # Campaign settings
│
├── data/
│   └── csv/                       # All CSV files
│
└── assets/                         # Images and media
```

---

## 🔑 Key Concepts

### Scripts (Entry Points)
These are the main programs you run:

| Script | Purpose | When to Use |
|--------|---------|------------|
| `send_campaigns.py` | Send emails | Running a campaign |
| `prepare_data.py` | Add new contacts | Adding new data |
| `show_progress.py` | View statistics | Checking campaign status |
| `update_db.py` | Sync with logs | After campaign complete |
| `generate_whatsapp_db.py` | Create WhatsApp list | Building WhatsApp contacts |

### Core Modules
These contain the application logic:

| Module | Contains | Purpose |
|--------|----------|---------|
| `src/core/database.py` | Data cleaning functions | Validate and clean data |
| `src/core/email_service.py` | Email functions | Send and log emails |
| `src/templates/__init__.py` | Email template functions | Email designs |
| `src/utils/__init__.py` | Utility functions | Data processing helpers |
| `config/campaigns.py` | Parameter classes | Campaign configuration |

### Data Locations

| Type | Location | Purpose |
|------|----------|---------|
| Raw data | `data/csv/master_db.csv` | New/raw contacts |
| Cleaned data | `data/csv/master_db_cleaned.csv` | Ready to use |
| Send logs | `data/csv/email_log.csv` | Send history |
| WhatsApp list | `data/csv/whatsapp_db_cleaned.csv` | WhatsApp contacts |
| Credentials | `.env` | Email authentication |

---

## 📚 Reading Paths

### For Complete Beginners
1. **README.md** - Read the entire "Quick Start" section
2. **QUICK_REFERENCE.md** - Read "Essential Setup"
3. **QUICK_REFERENCE.md** - Read "Running Scripts" section
4. Run: `python scripts/send_campaigns.py`

### For Developers
1. **RESTRUCTURING_GUIDE.md** - Understand the architecture
2. **README.md** - Read "Configuration" section
3. **src/** files - Review the code structure
4. Customize as needed

### For Project Managers
1. **README.md** - Features and capabilities
2. **QUICK_REFERENCE.md** - Available commands
3. **PROJECT_STATUS.md** - Completion status
4. **README.md** - Typical workflow

### For Migration from Old Structure
1. **RESTRUCTURING_GUIDE.md** - Complete guide
2. **RESTRUCTURING_GUIDE.md** → "File Mapping Reference"
3. **RESTRUCTURING_GUIDE.md** → "Migration from Old Structure"
4. Update your custom scripts as needed

---

## ❓ FAQ - Where to Find Answers?

**Q: How do I send emails?**
A: See **QUICK_REFERENCE.md** → "Send Email Campaigns" or **README.md** → "Running Email Campaigns"

**Q: How do I add new contacts?**
A: See **QUICK_REFERENCE.md** → "Prepare New Data" or **README.md** → "Data Preparation"

**Q: What changed from the old version?**
A: See **RESTRUCTURING_GUIDE.md** → "What Changed"

**Q: How do I customize emails?**
A: See **QUICK_REFERENCE.md** → "Add a New Campaign" or **README.md** → "Email Templates"

**Q: Where are my data files?**
A: See **QUICK_REFERENCE.md** → "Data File Locations"

**Q: How do I check if emails were sent?**
A: See **QUICK_REFERENCE.md** → "Check Email Sending Status"

**Q: What if something breaks?**
A: See **README.md** → "Troubleshooting"

**Q: Is my data secure?**
A: See **README.md** → "Security & Best Practices"

---

## 🎓 Learning Path

### Beginner (First Time Users)
```
1. README.md (Introduction section)
   ↓
2. QUICK_REFERENCE.md (Essential Setup)
   ↓
3. QUICK_REFERENCE.md (Running Scripts)
   ↓
4. Try: python scripts/send_campaigns.py
```

### Intermediate (Adding Features)
```
1. RESTRUCTURING_GUIDE.md (Understand structure)
   ↓
2. README.md (Configuration section)
   ↓
3. config/campaigns.py (Learn parameters)
   ↓
4. src/templates/__init__.py (Learn templates)
   ↓
5. Customize as needed
```

### Advanced (Development)
```
1. RESTRUCTURING_GUIDE.md (Full overview)
   ↓
2. src/ files (Code review)
   ↓
3. README.md (Data processing section)
   ↓
4. Extend and modify as needed
```

---

## 🔗 Documentation Cross-References

### README.md Sections
- Features → Feature descriptions
- Quick Start → Installation and setup
- Usage Guide → How to use each script
- Configuration → Customizing behavior
- Data Processing Pipeline → How data flows
- Troubleshooting → Problem solutions

### QUICK_REFERENCE.md Sections
- Running Scripts → All command examples
- Essential Setup → Initial configuration
- Key Files → What to edit
- Common Tasks → Step-by-step guides
- Data File Locations → Where things are stored

### RESTRUCTURING_GUIDE.md Sections
- What Changed → Old vs new comparison
- Module Organization → Code structure
- Migration → How to update old code
- File Mapping → Old file → New location

### PROJECT_STATUS.md Sections
- Completed Tasks → What's done
- File Organization Summary → Overview
- Functionality Verification → What works
- Next Steps → Future improvements

---

## 💡 Tips for Success

1. **Always read QUICK_REFERENCE.md first** for any task
2. **Check README.md for detailed information** when needed
3. **Keep PROJECT_STATUS.md handy** for verification
4. **Refer to RESTRUCTURING_GUIDE.md if confused** about structure
5. **Backup your data/csv/ folder regularly**
6. **Test with small samples before full campaigns**

---

## 🎯 Common Workflows

### Workflow 1: Send a Campaign
```
1. Ensure data/csv/master_db_cleaned.csv exists
2. Run: python scripts/send_campaigns.py
3. Select campaign type
4. Confirm recipients
5. Monitor: python scripts/show_progress.py
```

### Workflow 2: Add New Contacts
```
1. Place Excel/CSV in data/csv/
2. Edit scripts/prepare_data.py (add filename)
3. Run: python scripts/prepare_data.py
4. Wait for cleaning to complete
5. Check: data/csv/master_db_cleaned.csv
```

### Workflow 3: Customize Email
```
1. Edit: src/templates/__init__.py
2. Edit: config/campaigns.py (if needed)
3. Test with small campaign first
4. Run: python scripts/send_campaigns.py
5. Monitor: python scripts/show_progress.py
```

---

## 📞 Support Resources

- **Quick answers**: QUICK_REFERENCE.md
- **Detailed help**: README.md
- **Understanding structure**: RESTRUCTURING_GUIDE.md
- **Verification**: PROJECT_STATUS.md
- **Navigation**: This file (INDEX.md)

---

## ✅ Verification Checklist

Before you start using the project:

- [ ] Read one of the documentation files
- [ ] Understand the new directory structure
- [ ] Know where to find your data files (data/csv/)
- [ ] Know where to find scripts to run (scripts/)
- [ ] Know where configuration is (config/campaigns.py)
- [ ] Know where code is organized (src/)

---

**Documentation Version**: 1.0  
**Project Version**: 1.0.0  
**Last Updated**: December 2024

---

## Next Steps

👉 **Start here:**
1. Read the **README.md** file
2. Check **QUICK_REFERENCE.md** for your first task
3. Run your first script!

Good luck! 🚀
