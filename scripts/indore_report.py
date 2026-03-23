#!/usr/bin/env python3
"""
Generate report for Indore and region campaign.
Shows contact statistics and campaign summary.
"""

import os
import pandas as pd
from datetime import datetime

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
exports_dir = os.path.join(base_dir, 'data', 'exports')
logs_dir = os.path.join(base_dir, 'logs')
contacts_file = os.path.join(exports_dir, 'Indore_and_Region_Contacts_FINAL.csv')

# Load contacts
if os.path.exists(contacts_file):
    df_contacts = pd.read_csv(contacts_file)
    total_contacts = len(df_contacts)
    unique_cities = df_contacts['city'].nunique()
    
    print("\n" + "=" * 80)
    print("INDORE & REGION CONTACTS - SUMMARY REPORT")
    print("=" * 80)
    
    print(f"\n📊 CONTACT SUMMARY:")
    print(f"   Total Contacts:             {total_contacts}")
    print(f"   Unique Cities:              {unique_cities}")
    
    print(f"\n📍 CITY-WISE BREAKDOWN:")
    city_counts = df_contacts['city'].value_counts()
    for city, count in city_counts.items():
        percentage = (count / total_contacts) * 100
        print(f"   {city:<30} {count:>5} ({percentage:>5.1f}%)")
    
    print(f"\n👤 ROLE-WISE BREAKDOWN:")
    if 'role in music' in df_contacts.columns:
        role_counts = df_contacts['role in music'].value_counts()
        for role, count in role_counts.items():
            percentage = (count / total_contacts) * 100
            role_str = str(role) if pd.notna(role) else 'Not Specified'
            print(f"   {role_str:<30} {count:>5} ({percentage:>5.1f}%)")
    
    print(f"\n📧 CONTACT CHANNELS:")
    email_count = len(df_contacts[df_contacts['email'].notna()])
    phone_count = len(df_contacts[df_contacts['phone'].notna()])
    print(f"   Email Addresses Available:  {email_count} ({(email_count/total_contacts)*100:.1f}%)")
    print(f"   Phone Numbers Available:    {phone_count} ({(phone_count/total_contacts)*100:.1f}%)")
    
    print("\n" + "=" * 80 + "\n")
else:
    print(f"❌ Contacts file not found at: {contacts_file}")
    print("Please run: python scripts/export_indore.py")

# Check for campaign logs
log_file = os.path.join(logs_dir, 'indore_campaign.csv')
if os.path.exists(log_file):
    df_log = pd.read_csv(log_file)
    
    total_emails = len(df_log)
    sent_count = len(df_log[df_log['Status'] == 'SENT'])
    failed_count = len(df_log[df_log['Status'] == 'FAILED'])
    success_rate = (sent_count / total_emails * 100) if total_emails > 0 else 0
    
    print("=" * 80)
    print("INDORE & REGION EMAIL CAMPAIGN - SUMMARY REPORT")
    print("=" * 80)
    
    print(f"\n📊 CAMPAIGN SUMMARY:")
    print(f"   Total Emails Attempted:     {total_emails}")
    print(f"   Successfully Sent:          {sent_count}")
    print(f"   Failed:                     {failed_count}")
    print(f"   Success Rate:               {success_rate:.1f}%")
    
    print("\n" + "=" * 80 + "\n")
else:
    print("ℹ️  No campaign logs found yet. Run a campaign to generate logs.")
