param(
    [switch]$Once,
    [switch]$NoLogFile
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    throw "Python virtual environment not found at $python"
}

$logsDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
$logPath = Join-Path $logsDir ("worker-" + (Get-Date -Format 'yyyyMMdd') + ".log")

$arguments = @('main.py')
if ($Once) {
    $arguments += '--once'
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

try {
    if ($NoLogFile) {
        & $python @arguments 2>&1
        exit $LASTEXITCODE
    }

    Write-Host "Writing worker output to $logPath"
    & $python @arguments 2>&1 | Tee-Object -FilePath $logPath -Append
    exit $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
