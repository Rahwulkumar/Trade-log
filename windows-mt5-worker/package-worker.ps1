param(
    [string]$OutputZipPath
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not $OutputZipPath) {
    $artifactsDir = Join-Path $root 'artifacts'
    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
    $OutputZipPath = Join-Path $artifactsDir 'windows-mt5-worker.zip'
}

$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("trading-journal-worker-" + [System.Guid]::NewGuid().ToString('N'))
$stagingWorker = Join-Path $stagingRoot 'windows-mt5-worker'

New-Item -ItemType Directory -Force -Path $stagingWorker | Out-Null

$itemsToCopy = @(
    '.env.example',
    'README.md',
    'requirements.txt',
    'bootstrap.ps1',
    'preflight.ps1',
    'smoke-test.ps1',
    'run-worker.ps1',
    'check-worker.ps1',
    'install-scheduled-task.ps1',
    'prepare-wheelhouse.ps1',
    'config.py',
    'api_client.py',
    'cursor_store.py',
    'main.py',
    'models.py',
    'mt5_client.py'
)

foreach ($item in $itemsToCopy) {
    Copy-Item -Path (Join-Path $root $item) -Destination (Join-Path $stagingWorker $item) -Force
}

if (Test-Path $OutputZipPath) {
    Remove-Item -Force $OutputZipPath
}

Compress-Archive -Path (Join-Path $stagingWorker '*') -DestinationPath $OutputZipPath -Force
Remove-Item -Recurse -Force $stagingRoot

Write-Host "Packaged Windows MT5 worker to $OutputZipPath"
