param(
    [switch]$NoLogFile
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host 'Step 1/3: Running worker preflight'
& (Join-Path $root 'preflight.ps1')
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Step 2/3: Running one sync cycle'
if ($NoLogFile) {
    & (Join-Path $root 'run-worker.ps1') -Once -NoLogFile
} else {
    & (Join-Path $root 'run-worker.ps1') -Once
}
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Step 3/3: Showing latest worker diagnostics'
& (Join-Path $root 'check-worker.ps1')
exit $LASTEXITCODE
