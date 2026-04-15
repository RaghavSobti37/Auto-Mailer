#!/usr/bin/env python3
"""🚀 AUTO-MAILER - UNIFIED EMAIL SENDING SYSTEM

This is the main entry point for the Auto-Mailer system.
Run this file to access the unified email campaign manager.

Features:
- Smart dataset detection and column mapping
- Interactive dataset & template selection
- Batch processing with resume capability
- Email sending & tracking
"""

import os
import sys
import subprocess

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXE = sys.executable


def run_email_campaign():
    """Run the unified email campaign manager."""
    print("=" * 80)
    print("🚀 AUTO-MAILER - UNIFIED EMAIL CAMPAIGN SYSTEM")
    print("=" * 80)
    
    # Try to run email_master.py
    email_master = os.path.join(BASE_DIR, 'email_master.py')
    
    if not os.path.exists(email_master):
        print("❌ ERROR: email_master.py not found!")
        print(f"   Expected location: {email_master}")
        sys.exit(1)
    
    # Run the master script
    subprocess.run([PYTHON_EXE, email_master], cwd=BASE_DIR)


def run_utility_script() -> None:
    """Let user run any utility script."""
    print("\n📂 Utility Scripts Menu")
    print("=" * 80)
    
    scripts_dir = os.path.join(BASE_DIR, 'scripts')
    scripts = sorted([f for f in os.listdir(scripts_dir) if f.endswith('.py')])
    
    if not scripts:
        print("No utility scripts found.")
        return
    
    for idx, script in enumerate(scripts, 1):
        print(f"   {idx}. {script}")
    
    try:
        choice = input(f"\nSelect script (1-{len(scripts)}) or [q] to quit: ").strip().lower()
        
        if choice == 'q':
            return
        
        choice_idx = int(choice) - 1
        if 0 <= choice_idx < len(scripts):
            script_path = os.path.join(scripts_dir, scripts[choice_idx])
            
            # Get optional arguments
            args = input("Enter optional arguments (or press Enter for none): ").strip()
            
            # Run the script
            cmd = [PYTHON_EXE, script_path]
            if args:
                import shlex
                cmd.extend(shlex.split(args))
            
            subprocess.run(cmd, cwd=BASE_DIR)
    except ValueError:
        print("Invalid choice")


def run_web_frontend() -> None:
    """Launch web frontend for sheet upload and campaign sending."""
    web_launcher = os.path.join(BASE_DIR, 'run_web.py')

    if not os.path.exists(web_launcher):
        print("❌ ERROR: run_web.py not found!")
        print(f"   Expected location: {web_launcher}")
        return

    mode = input("Run web app in dev mode? (y/n, default n): ").strip().lower()
    cmd = [PYTHON_EXE, web_launcher]
    if mode == 'y':
        cmd.append('--dev')

    print("\n🌐 Starting web frontend at http://localhost:5000")
    subprocess.run(cmd, cwd=BASE_DIR)


def main() -> None:
    """Main menu."""
    while True:
        print("\n" + "=" * 80)
        print("AUTO-MAILER - MAIN MENU")
        print("=" * 80)
        print("  1. 📧 Send Email Campaign (Unified System)")
        print("  2. 🛠️  Run Utility Scripts")
        print("  3. 🌐 Launch Web Frontend")
        print("  q. Quit")
        print("=" * 80)
        
        choice = input("\nEnter choice: ").strip().lower()
        
        if choice == "q":
            print("\n✅ Goodbye!")
            return
        
        if choice == "1":
            run_email_campaign()
        elif choice == "2":
            run_utility_script()
        elif choice == "3":
            run_web_frontend()
        else:
            print("❌ Invalid choice")


if __name__ == '__main__':
    main()
