@echo off
REM Schedule Rise Emailer Campaign at 9:00 AM Daily
REM This batch file creates a Windows Task to run the campaign automatically

setlocal enabledelayedexpansion

REM Get the current directory
set SCRIPT_DIR=%~dp0..
set PYTHON_SCRIPT=%SCRIPT_DIR%\scripts\send_delhi_campaign.py

echo.
echo ========================================
echo Windows Task Scheduler Setup
echo ========================================
echo.
echo This will schedule the Rise Emailer campaign to run at 9:00 AM daily.
echo.

REM Create scheduled task
echo Creating scheduled task...
schtasks /create /tn "Rise Emailer Campaign" /tr "\"%PYTHON_SCRIPT%\"" /sc daily /st 09:00:00 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Task created successfully!
    echo.
    echo Task details:
    echo  - Name: Rise Emailer Campaign
    echo  - Schedule: Daily at 9:00 AM
    echo  - Action: Run send_delhi_campaign.py
    echo.
    echo Note: Your system must be ON at 9:00 AM for the task to execute.
    echo.
) else (
    echo.
    echo ❌ Failed to create task. You may need to run as Administrator.
    echo.
)

pause
