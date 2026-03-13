param(
    [string]$TaskName = 'TradingJournal-MT5Worker',
    [switch]$RunAtStartupOnly
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $root 'run-worker.ps1'

if (-not (Test-Path $runner)) {
    throw "Worker runner script not found at $runner"
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""

$triggers = @(
    (New-ScheduledTaskTrigger -AtStartup)
)

if (-not $RunAtStartupOnly) {
    $triggers += New-ScheduledTaskTrigger -AtLogOn
}

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Settings $settings `
    -Description 'Runs the Trading Journal Windows MT5 Python worker.' `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "Scheduled task '$TaskName' has been registered."
