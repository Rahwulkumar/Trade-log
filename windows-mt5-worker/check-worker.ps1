$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$taskName = 'TradingJournal-MT5Worker'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$envFile = Join-Path $root '.env'

if (Test-Path $envFile) {
    Write-Host 'Environment file: present'
} else {
    Write-Host "Environment file missing: $envFile"
}

if ($task) {
    Get-ScheduledTaskInfo -TaskName $taskName |
        Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime
} else {
    Write-Host "Scheduled task '$taskName' is not registered."
}

$logsDir = Join-Path $root 'logs'
if (Test-Path $logsDir) {
    $latestLog = Get-ChildItem $logsDir -Filter 'worker-*.log' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latestLog) {
        Write-Host ''
        Write-Host "Latest log: $($latestLog.FullName)"
        Get-Content $latestLog.FullName -Tail 80
    } else {
        Write-Host 'No worker log files found.'
    }
}
