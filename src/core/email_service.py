"""Email sending and logging utilities."""

import os
import csv
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage


def log_email_status(recipient, name, status, error_message='', log_file='csv/email_log.csv'):
    """Log the status of an email send attempt."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    # Create file with headers if it doesn't exist
    try:
        with open(log_file, 'x', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Timestamp', 'EmailID', 'Name', 'Status', 'Error'])
    except FileExistsError:
        pass
    # Append the log entry
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, recipient, name, status, error_message])


def send_emails(email_address, email_password, params, template_func, df_to_send, full_df, promo_column):
    """
    Send emails to a list of recipients.
    
    Args:
        email_address: Sender email address
        email_password: Sender email password
        params: Parameters object with configuration
        template_func: Function to generate email template
        df_to_send: DataFrame with recipients to send to
        full_df: Full DataFrame for updating promo status
        promo_column: Name of the promo column to update
    
    Returns:
        Updated DataFrame with promo status marked as True for sent emails
    """
    import inspect
    
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(email_address, email_password)
    
    for idx, row in df_to_send.iterrows():
        recipient = row['email']
        name = row['name']
        
        # Check template function signature and call it accordingly
        sig = inspect.signature(template_func)
        
        # Prepare arguments for the template function
        template_args = {}
        if 'name' in sig.parameters:
            template_args['name'] = name
        if 'FORM_LINK' in sig.parameters:
            template_args['FORM_LINK'] = params.FORM_LINK
            
        result = template_func(**template_args)

        if isinstance(result, tuple) and len(result) == 2:
            subject, html_body = result
        else:
            subject = params.SUBJECT
            html_body = result

        msg = MIMEMultipart()
        msg['From'] = email_address
        msg['To'] = recipient
        msg['Subject'] = subject
        msg['X-Priority'] = '1'
        msg['Importance'] = 'High'
        msg.attach(MIMEText(html_body, 'html'))
        
        # Attach banner image only if INCLUDE_BANNER is True
        if getattr(params, "INCLUDE_BANNER", False):
            banner_path = getattr(params, "BANNER_PATH", 'assets/banner.jpg')
            if os.path.exists(banner_path):
                with open(banner_path, 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-ID', '<bannerimage>')
                    img.add_header('Content-Disposition', 'inline', filename='banner.jpg')
                    msg.attach(img)
        try:
            server.sendmail(email_address, recipient, msg.as_string())
            print(f"Email sent to {recipient} ({name})")
            log_email_status(recipient, name, 'SENT')
            # --- Update the promo status in the main DataFrame ---
            full_df.loc[idx, promo_column] = True
        except Exception as e:
            print(f"Failed to send email to {recipient}: {e}")
            log_email_status(recipient, name, 'FAILED', str(e))
    
    server.quit()
    return full_df
