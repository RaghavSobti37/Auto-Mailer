# AutoMailer - Automated Email Campaign Tool

AutoMailer is a powerful, Python-based toolkit designed to manage and execute automated email campaigns. It allows users to send personalized HTML emails from a CSV contact database, track sent statuses, and maintain a clean, validated, and up-to-date list of contacts.

## Features

- **Dynamic Email Campaigns**: Choose between different email templates (e.g., Teaser, Main Campaign) at runtime.
- **Database Management**: Uses a CSV file (`master_db.csv`) as the primary contact database.
- **Prevents Duplicate Emails**: Automatically updates a `havells promo` flag in the database to `True` after an email is sent, preventing the same contact from being emailed again in future campaigns.
- **Comprehensive Logging**: Logs the status of every email (`SENT` or `FAILED`) with timestamps and error details into `email_log.csv`.
- **Data Cleaning & Standardization**: Includes a robust script (`clean_master_db.py`) to clean the master database by:
  - Validating email formats.
  - Standardizing names, phone numbers, and gender entries.
  - Removing duplicate contacts.
  - Correcting data types.
- **Log-based Database Updates**: Includes a script (`update_db_from_log.py`) to retroactively update the master database based on `email_log.csv`, ensuring contacts who have already received an email are correctly marked.
- **Secure Credential Management**: Uses a `.env` file to securely store email credentials, keeping them out of the main codebase.

---

## Project Structure

```plaintext
AutoMailer/
├── assets/
│   ├── banner.jpg
│   └── pixel.png
├── csv/
│   ├── master_db.csv           # Main contact database (Not committed)
│   ├── email_log.csv           # Log of sent emails (Not committed)
│   ├── master_db_cleaned.csv   # Output of the cleaning script (Not committed)
│   └── master_db_updated.csv   # Output of the update_db_from_log script (Not committed)
├── params/
│   ├── __init__.py
│   ├── email_template.py     # HTML template for the main campaign
│   ├── main_params.py        # Parameters for the main campaign
│   ├── teaser_template.py    # HTML template for the teaser mail
│   └── teaser_params.py      # Parameters for the teaser mail
├── .env                        # Environment variables (Not committed)
├── .gitignore                  # Specifies files to be ignored by Git
├── clean_master_db.py          # Script to clean and validate the master DB
├── test.py                     # Main script to run email campaigns
├── update_db_from_log.py       # Script to update master DB from the log
└── README.md                   # This documentation file
```

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
    - Place your banner image at `assets/banner.jpg`.

---

## How to Use

### 1. Clean the Database (Optional but Recommended)

Before running a campaign, it's a good practice to clean your master database.
```bash
python clean_master_db.py
```
This will generate a `master_db_cleaned.csv` file. You can then rename this to `master_db.csv` to use it as your main contact list.

### 2. Run an Email Campaign

Execute the main script to start sending emails.
```bash
python test.py
```
The script will prompt you to choose between the "Teaser Mail" and the "Main Campaign Mail". After you make a selection, it will show a preview of the contacts to be emailed and ask for confirmation before proceeding.

### 3. Update Database from Log

If you need to manually sync the `havells promo` status in your `master_db.csv` from the `email_log.csv`, run this script. It creates a new file, `master_db_updated.csv`, with the updated statuses.
```bash
python update_db_from_log.py
```