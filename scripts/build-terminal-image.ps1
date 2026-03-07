# Build and push MT5 terminal Docker image to GCP
# Use this on Windows (PowerShell). Same as build-terminal-image.sh.

param(
    [string]$ProjectId = (gcloud config get-value project 2>$null),
    [string]$ImageName = "mt5-terminal"
)

if (-not $ProjectId) {
    Write-Error "ProjectId required. Pass as first argument or set: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

$zipPath = "terminal-farm\mt5-install.zip"
if (-not (Test-Path $zipPath)) {
    Write-Error "mt5-install.zip not found at $zipPath. Please add MT5 install zip to terminal-farm/."
    exit 1
}

$ex5Path = "terminal-farm\ea\TradeTaperSync.ex5"
if (-not (Test-Path $ex5Path)) {
    Write-Error "TradeTaperSync.ex5 not found at $ex5Path. Compile it first (recommended: run scripts/build-terminal-image-local.ps1)."
    exit 1
}

Write-Host "=== Building MT5 Terminal Image ==="
Write-Host "Project: $ProjectId"
Write-Host "Image: $ImageName"

Push-Location terminal-farm
try {
    gcloud builds submit --tag "gcr.io/$ProjectId/${ImageName}:latest"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Image built and pushed successfully!"
    Write-Host "Image: gcr.io/$ProjectId/${ImageName}:latest"
} finally {
    Pop-Location
}
