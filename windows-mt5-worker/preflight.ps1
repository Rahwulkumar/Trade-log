$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    throw "Python virtual environment not found at $python"
}

$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    throw "Worker .env file not found at $envFile"
}

Write-Host 'Running Windows MT5 worker preflight checks...'
& $python .\main.py --check
exit $LASTEXITCODE
