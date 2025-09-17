# AutoMailer - Automated Email Campaign Tool

AutoMailer is a powerful, Python-based toolkit designed to manage and execute automated email campaigns. It allows users to send personalized HTML emails from a consolidated contact database, track sent statuses, and maintain a clean, validated, and up-to-date list of contacts.

## Features

- **Dynamic Email Campaigns**: Choose between different email templates (e.g., Teaser, Main Campaign) at runtime.
- **Centralized Database Management**:
  - Ingest new contacts from various sources (Excel, CSV, `.eml` files) directly into a raw master database (`master_db.csv`).
  - A robust cleaning script processes the raw data to produce a clean, deduplicated, and ready-to-use contact list (`master_db_cleaned.csv`).
- **Prevents Duplicate Emails**: Automatically updates a `havells promo` flag in the database after an email is sent, preventing the same contact from being emailed again in future campaigns.
- **Comprehensive Logging**: Logs the status of every email (`SENT` or `FAILED`) with timestamps and error details into `email_log.csv`.
- **Data Cleaning & Standardization**: Includes a robust script (`clean_master_db.py`) to clean the master database by:
  - Validating email formats.
  - Standardizing names, phone numbers, and gender entries.
  - Removing duplicate contacts.
  - Correcting data types.
- **Log-based Database Updates**: Includes a script (`updatedb.py`) to retroactively update the master database based on `email_log.csv`, ensuring contacts who have already received an email are correctly marked.
- **Secure Credential Management**: Uses a `.env` file to securely store email credentials, keeping them out of the main codebase.
- **Progress Reporting**: A `show_progress.py` script provides a high-level overview of campaign progress, including sent, failed, and remaining emails.

---

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd AutoMailer
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install pandas python-dotenv Pillow
    ```

4.  **Create the `.env` file:**
    Create a file named `.env` in the root of the project directory and add your email credentials:
    ```env
    EMAIL_ADDRESS="your_email@gmail.com"
    EMAIL_PASSWORD="your_gmail_app_password"
    ```
    > **Note:** For Gmail, you need to use an "App Password" instead of your regular password if you have 2-Factor Authentication enabled.

5.  **Prepare your data:**
    - Place your master contact list in `csv/master_db.csv`. It should have columns like `name`, `email`, `number`, `city`, `gender`, and `havells promo`.
    - Place any new Excel or CSV files you want to add into the `csv/` folder.
    - Place any `.eml` files containing form submissions into the `eml/` folder.
    - Place your banner image at `assets/banner.jpg`.

---

## How to Use

### 1. Add New Data and Clean the Database

This is the primary workflow for expanding your contact list.

- **To add contacts from an Excel or CSV file:**
  1.  Place the file in the `csv/` folder.
  2.  Update the `new_source_file` variable in `utils/newdata.py`.
  3.  Run the script: `python utils/newdata.py`.

- **To add contacts from `.eml` files:**
  1.  Place the `.eml` files in the `eml/` folder.
  2.  Run the script: `python utils/extract_eml_data.py`.

Both scripts will append the new raw data to `master_db.csv` and then automatically trigger the cleaning process, which creates an updated `master_db_cleaned.csv`.

### 2. Run an Email Campaign

Execute the main script to start sending emails. It will use the `master_db_cleaned.csv` file.
```bash
python test.py
```
The script will prompt you to choose between the "Teaser Mail" and the "Main Campaign Mail". After you make a selection, it will show a preview of the contacts to be emailed and ask for confirmation before proceeding.

### 3. Update Database from Log

If you need to manually sync the `havells promo` status in your `master_db.csv` from the `email_log.csv`, run this script. It creates a new file, `master_db_updated.csv`, with the updated statuses.
```bash
python update_db_from_log.py
```