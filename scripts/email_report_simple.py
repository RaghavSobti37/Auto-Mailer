import pandas as pd
import os

log_path = 'data/csv/email_log.csv'

if not os.path.exists(log_path):
    print(f"❌ Email log not found at: {log_path}")
    exit(1)

# Read the email log
df_log = pd.read_csv(log_path)

# Calculate metrics
total_emails = len(df_log)
sent_count = len(df_log[df_log['Status'] == 'SENT'])
failed_count = len(df_log[df_log['Status'] == 'FAILED'])
success_rate = (sent_count / total_emails * 100) if total_emails > 0 else 0

print("\n" + "=" * 70)
print("HAVELLS mYOUsic EMAIL CAMPAIGN - SUMMARY REPORT")
print("=" * 70)

print(f"\n📊 CAMPAIGN SUMMARY:")
print(f"   Total Emails Attempted:     {total_emails}")
print(f"   Successfully Sent:          {sent_count}")
print(f"   Failed:                     {failed_count}")
print(f"   Success Rate:               {success_rate:.1f}%")

print("\n" + "=" * 70 + "\n")
