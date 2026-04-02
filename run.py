#!/usr/bin/env python3
"""Interactive runner for Auto-Mailer workflows.

Run this file to choose a task by description.
"""

import os
import shlex
import subprocess
import sys
from typing import List, Tuple


HERE = os.path.dirname(os.path.abspath(__file__))
if os.path.isdir(os.path.join(HERE, "scripts")):
    BASE_DIR = HERE
else:
    # Fallback for running this file from nested locations.
    BASE_DIR = os.path.dirname(HERE)
PYTHON_EXE = sys.executable


def run_command(command: List[str]) -> int:
    printable = " ".join(shlex.quote(part) for part in command)
    print("\n" + "=" * 72)
    print(f"Running: {printable}")
    print("=" * 72)
    completed = subprocess.run(command, cwd=BASE_DIR)
    print("-" * 72)
    print(f"Exit code: {completed.returncode}")
    print("-" * 72)
    return completed.returncode


def get_menu() -> List[Tuple[str, List[str]]]:
    return [
        (
            "Preview production audience only (dry-run; no emails sent)",
            [PYTHON_EXE, "scripts/send_havells_excluding_registered.py", "--mode", "prod", "--dry-run"],
        ),
        (
            "Send test campaign (shows sender + recipients preview first)",
            [PYTHON_EXE, "scripts/send_havells_excluding_registered.py", "--mode", "test"],
        ),
        (
            "Send production campaign (shows sender + recipients preview first)",
            [PYTHON_EXE, "scripts/send_havells_excluding_registered.py", "--mode", "prod"],
        ),
        (
            "Generate campaign report (HTML + TXT)",
            [PYTHON_EXE, "scripts/generate_campaign_report.py"],
        ),
        (
            "Generate campaign report (HTML only)",
            [PYTHON_EXE, "scripts/generate_campaign_report.py", "--format", "html"],
        ),
        (
            "Generate campaign report (TXT only)",
            [PYTHON_EXE, "scripts/generate_campaign_report.py", "--format", "txt"],
        ),
    ]


def run_custom_script() -> None:
    script_rel = input("Enter script path (for example: scripts/export_data.py): ").strip()
    if not script_rel:
        print("No script entered.")
        return

    extra_args = input("Enter optional arguments (or press Enter for none): ").strip()
    cmd = [PYTHON_EXE, script_rel]
    if extra_args:
        cmd.extend(shlex.split(extra_args))

    run_command(cmd)


def main() -> None:
    print("Auto-Mailer Interactive Runner")
    print(f"Project directory: {BASE_DIR}")

    menu = get_menu()

    while True:
        print("\nChoose what you want to do:")
        for idx, (label, _cmd) in enumerate(menu, start=1):
            print(f"  {idx}. {label}")
        print(f"  {len(menu) + 1}. Run a custom script")
        print("  q. Quit")

        choice = input("\nEnter choice: ").strip().lower()

        if choice == "q":
            print("Exiting runner.")
            return

        if choice == str(len(menu) + 1):
            run_custom_script()
            continue

        if not choice.isdigit():
            print("Invalid choice. Please enter a number or q.")
            continue

        selected = int(choice)
        if selected < 1 or selected > len(menu):
            print("Invalid choice number.")
            continue

        label, command = menu[selected - 1]
        print(f"\nSelected: {label}")

        if "production campaign" in label.lower() and "dry-run" not in label.lower():
            confirm = input("This can send real emails. Type YES to continue: ").strip()
            if confirm != "YES":
                print("Cancelled.")
                continue

        run_command(command)


if __name__ == "__main__":
    main()
