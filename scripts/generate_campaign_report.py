#!/usr/bin/env python3
"""Generate a comprehensive report from the Havells campaign batch send log.

Generates:
- Total emails sent, failed, and dry-run stats
- Failed emails with error reasons
- Timeline of sends
- Statistics by mode (test/prod)
- HTML and text reports
"""

import argparse
import os
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_LOG_FILE = os.path.join(BASE_DIR, "logs", "havells_batch_send_log.csv")
DEFAULT_REPORT_HTML = os.path.join(BASE_DIR, "reports", "campaign_report.html")
DEFAULT_REPORT_TXT = os.path.join(BASE_DIR, "reports", "campaign_report.txt")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Havells campaign report from batch send log.")
    parser.add_argument("--log-file", default=DEFAULT_LOG_FILE, help="Path to batch send log CSV")
    parser.add_argument("--html-report", default=DEFAULT_REPORT_HTML, help="Path to save HTML report")
    parser.add_argument("--txt-report", default=DEFAULT_REPORT_TXT, help="Path to save text report")
    parser.add_argument("--format", choices=["both", "html", "txt"], default="both", help="Report format")
    return parser.parse_args()


def ensure_parent_dir(file_path: str) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def load_log(log_file: str) -> pd.DataFrame:
    """Load batch send log CSV."""
    if not os.path.exists(log_file):
        raise FileNotFoundError(f"Log file not found: {log_file}")
    return pd.read_csv(log_file, dtype=str, keep_default_na=False)


def analyze_log(log_df: pd.DataFrame) -> Dict:
    """Analyze log data and generate statistics."""
    stats = {}
    
    # Overall stats
    stats["total_records"] = len(log_df)
    stats["total_sent"] = len(log_df[log_df["status"] == "SENT"])
    stats["total_failed"] = len(log_df[log_df["status"] == "FAILED"])
    stats["total_dry_run"] = len(log_df[log_df["status"] == "DRY_RUN"])
    
    # By mode
    stats["by_mode"] = {}
    for mode in log_df["mode"].unique():
        mode_df = log_df[log_df["mode"] == mode]
        stats["by_mode"][mode] = {
            "total": len(mode_df),
            "sent": len(mode_df[mode_df["status"] == "SENT"]),
            "failed": len(mode_df[mode_df["status"] == "FAILED"]),
            "dry_run": len(mode_df[mode_df["status"] == "DRY_RUN"]),
        }
    
    # Failed emails with reasons
    failed_df = log_df[log_df["status"] == "FAILED"].copy()
    stats["failed_emails"] = []
    if len(failed_df) > 0:
        failed_df_sorted = failed_df.sort_values("timestamp")
        for _, row in failed_df_sorted.iterrows():
            stats["failed_emails"].append({
                "timestamp": row["timestamp"],
                "email": row["recipient"],
                "mode": row["mode"],
                "batch": row["batch_no"],
                "error": row["error"],
            })
    
    # Timeline of sends (first and last send time)
    sent_df = log_df[log_df["status"] == "SENT"]
    if len(sent_df) > 0:
        sent_df_time = pd.to_datetime(sent_df["timestamp"])
        stats["first_send_time"] = sent_df_time.min().strftime("%Y-%m-%d %H:%M:%S")
        stats["last_send_time"] = sent_df_time.max().strftime("%Y-%m-%d %H:%M:%S")
    else:
        stats["first_send_time"] = "N/A"
        stats["last_send_time"] = "N/A"
    
    # Unique emails sent
    stats["unique_emails_sent"] = len(log_df[log_df["status"] == "SENT"]["recipient"].unique())
    stats["unique_emails_failed"] = len(log_df[log_df["status"] == "FAILED"]["recipient"].unique())
    
    # Batches info
    stats["total_batches"] = int(log_df["batch_no"].max()) if len(log_df) > 0 else 0
    
    # Error summary
    stats["error_summary"] = {}
    if len(failed_df) > 0:
        error_counts = failed_df["error"].value_counts().to_dict()
        stats["error_summary"] = error_counts
    
    return stats


def generate_text_report(stats: Dict, log_df: pd.DataFrame) -> str:
    """Generate plain text report."""
    lines = []
    lines.append("=" * 80)
    lines.append("HAVELLS MYOUSIC CAMPAIGN - SEND REPORT")
    lines.append("=" * 80)
    lines.append("")
    
    # Overall Summary
    lines.append("OVERALL SUMMARY")
    lines.append("-" * 80)
    lines.append(f"Total Log Records:           {stats['total_records']}")
    lines.append(f"Total Emails Sent:           {stats['total_sent']}")
    lines.append(f"Total Emails Failed:         {stats['total_failed']}")
    lines.append(f"Total Dry-Run Records:       {stats['total_dry_run']}")
    lines.append(f"Success Rate:                {(stats['total_sent'] / (stats['total_sent'] + stats['total_failed']) * 100):.1f}%" if (stats['total_sent'] + stats['total_failed']) > 0 else "N/A")
    lines.append("")
    
    # Unique Emails
    lines.append("UNIQUE EMAIL COUNT")
    lines.append("-" * 80)
    lines.append(f"Unique Emails Successfully Sent:  {stats['unique_emails_sent']}")
    lines.append(f"Unique Emails Failed:            {stats['unique_emails_failed']}")
    lines.append("")
    
    # Timeline
    lines.append("SEND TIMELINE")
    lines.append("-" * 80)
    lines.append(f"First Send:                  {stats['first_send_time']}")
    lines.append(f"Last Send:                   {stats['last_send_time']}")
    lines.append(f"Total Batches:               {stats['total_batches']}")
    lines.append("")
    
    # By Mode
    lines.append("STATISTICS BY MODE")
    lines.append("-" * 80)
    for mode in sorted(stats["by_mode"].keys()):
        mode_stats = stats["by_mode"][mode]
        lines.append(f"\nMode: {mode.upper()}")
        lines.append(f"  Total Records:    {mode_stats['total']}")
        lines.append(f"  Sent:             {mode_stats['sent']}")
        lines.append(f"  Failed:           {mode_stats['failed']}")
        lines.append(f"  Dry-Run:          {mode_stats['dry_run']}")
        if mode_stats['sent'] + mode_stats['failed'] > 0:
            rate = (mode_stats['sent'] / (mode_stats['sent'] + mode_stats['failed']) * 100)
            lines.append(f"  Success Rate:     {rate:.1f}%")
    lines.append("")
    
    # Failed Emails
    if stats["failed_emails"]:
        lines.append("FAILED EMAILS WITH ERROR REASONS")
        lines.append("-" * 80)
        lines.append(f"Total Failed: {len(stats['failed_emails'])}")
        lines.append("")
        
        # Group by error
        error_groups = defaultdict(list)
        for item in stats["failed_emails"]:
            error_groups[item["error"]].append(item)
        
        for error_msg, emails in error_groups.items():
            lines.append(f"\nError: {error_msg if error_msg else '(No error message)'}")
            lines.append(f"Count: {len(emails)}")
            for email_item in emails[:10]:  # Show first 10 per error
                lines.append(f"  - {email_item['email']} ({email_item['timestamp']}, Batch {email_item['batch']})")
            if len(emails) > 10:
                lines.append(f"  ... and {len(emails) - 10} more")
        lines.append("")
    else:
        lines.append("FAILED EMAILS")
        lines.append("-" * 80)
        lines.append("No failed emails - all sends successful!")
        lines.append("")
    
    # Error Summary
    if stats["error_summary"]:
        lines.append("ERROR SUMMARY")
        lines.append("-" * 80)
        for error, count in sorted(stats["error_summary"].items(), key=lambda x: x[1], reverse=True):
            lines.append(f"{error if error else '(No error message)'}: {count} occurrences")
        lines.append("")
    
    lines.append("=" * 80)
    lines.append(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 80)
    
    return "\n".join(lines)


def generate_html_report(stats: Dict, log_df: pd.DataFrame) -> str:
    """Generate HTML report."""
    success_rate = (stats['total_sent'] / (stats['total_sent'] + stats['total_failed']) * 100) if (stats['total_sent'] + stats['total_failed']) > 0 else 0
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Havells mYOUsic Campaign Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #ed1c24 0%, #c41e1e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 32px;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.9;
        }}
        .content {{
            padding: 40px;
        }}
        .section {{
            margin-bottom: 40px;
        }}
        .section-title {{
            font-size: 20px;
            font-weight: bold;
            color: #333;
            border-bottom: 3px solid #ed1c24;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ed1c24;
        }}
        .stat-label {{
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }}
        .stat-value {{
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }}
        .stat-subtext {{
            font-size: 12px;
            color: #999;
            margin-top: 8px;
        }}
        .success {{
            border-left-color: #28a745;
        }}
        .error {{
            border-left-color: #dc3545;
        }}
        .info {{
            border-left-color: #17a2b8;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        table thead {{
            background: #f8f9fa;
        }}
        table th {{
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
        }}
        table td {{
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }}
        table tr:hover {{
            background: #f8f9fa;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }}
        .status-sent {{
            background: #d4edda;
            color: #155724;
        }}
        .status-failed {{
            background: #f8d7da;
            color: #721c24;
        }}
        .status-dry-run {{
            background: #d1ecf1;
            color: #0c5460;
        }}
        .error-group {{
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
        }}
        .error-group-title {{
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
        }}
        .error-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .error-list li {{
            padding: 5px 0;
            font-size: 13px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 12px;
        }}
        .badge {{
            display: inline-block;
            padding: 6px 12px;
            background: #ed1c24;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }}
        .mode-section {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Havells mYOUsic Campaign Report</h1>
            <p>Email Campaign Send Summary & Analysis</p>
        </div>
        
        <div class="content">
            <!-- Overall Summary -->
            <div class="section">
                <div class="section-title">📊 Overall Summary</div>
                <div class="stats-grid">
                    <div class="stat-card success">
                        <div class="stat-label">Emails Sent</div>
                        <div class="stat-value">{stats['total_sent']}</div>
                    </div>
                    <div class="stat-card error">
                        <div class="stat-label">Emails Failed</div>
                        <div class="stat-value">{stats['total_failed']}</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-label">Success Rate</div>
                        <div class="stat-value">{success_rate:.1f}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Batches</div>
                        <div class="stat-value">{stats['total_batches']}</div>
                    </div>
                </div>
            </div>
            
            <!-- Timeline -->
            <div class="section">
                <div class="section-title">⏱️ Send Timeline</div>
                <div class="stats-grid">
                    <div class="stat-card info">
                        <div class="stat-label">First Send</div>
                        <div class="stat-value" style="font-size: 16px;">{stats['first_send_time']}</div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-label">Last Send</div>
                        <div class="stat-value" style="font-size: 16px;">{stats['last_send_time']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Unique Emails Sent</div>
                        <div class="stat-value">{stats['unique_emails_sent']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Unique Emails Failed</div>
                        <div class="stat-value">{stats['unique_emails_failed']}</div>
                    </div>
                </div>
            </div>
            
            <!-- By Mode -->
            <div class="section">
                <div class="section-title">🎯 Statistics by Mode</div>
"""
    
    for mode in sorted(stats["by_mode"].keys()):
        mode_stats = stats["by_mode"][mode]
        mode_rate = (mode_stats['sent'] / (mode_stats['sent'] + mode_stats['failed']) * 100) if (mode_stats['sent'] + mode_stats['failed']) > 0 else 0
        html += f"""
                <div class="mode-section">
                    <h3 style="margin-top: 0; color: #ed1c24;">{mode.upper()} Mode</h3>
                    <table>
                        <tr>
                            <td><strong>Total Records:</strong></td>
                            <td>{mode_stats['total']}</td>
                        </tr>
                        <tr>
                            <td><strong>Sent:</strong></td>
                            <td><span class="status-badge status-sent">✓ {mode_stats['sent']}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Failed:</strong></td>
                            <td><span class="status-badge status-failed">✗ {mode_stats['failed']}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Success Rate:</strong></td>
                            <td><strong>{mode_rate:.1f}%</strong></td>
                        </tr>
                    </table>
                </div>
"""
    
    html += """
            </div>
"""
    
    # Failed Emails Section
    if stats["failed_emails"]:
        html += f"""
            <div class="section">
                <div class="section-title">❌ Failed Emails ({len(stats['failed_emails'])})</div>
"""
        error_groups = defaultdict(list)
        for item in stats["failed_emails"]:
            error_groups[item["error"]].append(item)
        
        for error_msg, emails in error_groups.items():
            html += f"""
                <div class="error-group">
                    <div class="error-group-title">Error: {error_msg if error_msg else '(No error message)'} ({len(emails)} instances)</div>
                    <ul class="error-list">
"""
            for email_item in emails[:20]:  # Show first 20
                html += f"""
                        <li>📧 <strong>{email_item['email']}</strong> - {email_item['timestamp']} (Batch {email_item['batch']}, {email_item['mode']})</li>
"""
            if len(emails) > 20:
                html += f"""
                        <li><em>... and {len(emails) - 20} more instances of this error</em></li>
"""
            html += """
                    </ul>
                </div>
"""
        html += """
            </div>
"""
    else:
        html += """
            <div class="section">
                <div class="section-title">✅ All Emails Sent Successfully</div>
                <p style="font-size: 16px; color: #28a745;"><strong>No failed emails!</strong> All send operations completed successfully.</p>
            </div>
"""
    
    html += f"""
        </div>
        
        <div class="footer">
            Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
            <small>Havells mYOUsic Campaign Management System</small>
        </div>
    </div>
</body>
</html>
"""
    return html


def main() -> None:
    args = parse_args()
    
    print("Generating campaign report from batch send log...")
    
    # Load and analyze
    log_df = load_log(args.log_file)
    stats = analyze_log(log_df)
    
    # Generate reports
    if args.format in ["txt", "both"]:
        print(f"Generating text report: {args.txt_report}")
        ensure_parent_dir(args.txt_report)
        text_report = generate_text_report(stats, log_df)
        with open(args.txt_report, "w", encoding="utf-8") as f:
            f.write(text_report)
        print(f"✓ Text report saved")
    
    if args.format in ["html", "both"]:
        print(f"Generating HTML report: {args.html_report}")
        ensure_parent_dir(args.html_report)
        html_report = generate_html_report(stats, log_df)
        with open(args.html_report, "w", encoding="utf-8") as f:
            f.write(html_report)
        print(f"✓ HTML report saved")
    
    # Print summary to console
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Emails Sent:   {stats['total_sent']}")
    print(f"Total Emails Failed: {stats['total_failed']}")
    success_rate = (stats['total_sent'] / (stats['total_sent'] + stats['total_failed']) * 100) if (stats['total_sent'] + stats['total_failed']) > 0 else 0
    print(f"Success Rate:        {success_rate:.1f}%")
    print(f"Timeline:            {stats['first_send_time']} to {stats['last_send_time']}")
    print(f"Total Batches:       {stats['total_batches']}")
    print("=" * 80)


if __name__ == "__main__":
    main()
