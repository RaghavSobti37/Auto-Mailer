# Schedule sync-worker.js via Windows Task Scheduler — runs every 10 minutes

$taskName = 'AutoMailer-SyncWorker'
$scriptPath = Join-Path $PSScriptRoot 'sync-worker.js'
$nodePath = (Get-Command node).Source

# Remove existing task if present
schtasks /End /TN $taskName 2>$null
schtasks /Delete /TN $taskName /F 2>$null

# Create the scheduled task (runs every 10 minutes, indefinitely)
$projectRoot = Split-Path -Parent $PSScriptRoot
$action = New-ScheduledTaskAction -Execute $nodePath -Argument '"$scriptPath" --watch' -WorkingDirectory "$projectRoot"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration ([TimeSpan]::MaxValue)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description 'Auto-Mailer Atlas to local MongoDB mirror sync (every 10 min)'

Write-Host "Scheduled task '$taskName' created — runs every 10 minutes indefinitely"
