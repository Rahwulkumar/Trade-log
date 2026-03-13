# Reads .env.local from the project root and runs the orchestrator.
# Run from anywhere: .\run-orchestrator.ps1
# Or loop every 60s: .\run-orchestrator.ps1 -Loop

param([switch]$Loop)

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found at $envFile"
    exit 1
}

# Parse .env.local into environment variables
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $idx = $line.IndexOf('=')
        if ($idx -gt 0) {
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim().Trim('"')
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
}

$orchestratorDir = Join-Path $PSScriptRoot "orchestrator"
Push-Location $orchestratorDir

if ($Loop) {
    Write-Host "Running orchestrator every 60s. Press Ctrl+C to stop." -ForegroundColor Cyan
    while ($true) {
        python main.py
        Start-Sleep -Seconds 60
    }
} else {
    python main.py
}

Pop-Location
