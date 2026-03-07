# Build MT5 terminal Docker image locally (no GCP).
# Ensures TradeTaperSync.ex5 exists before building, so runtime sync works.

$ErrorActionPreference = "Stop"

function Find-MetaEditor {
    $candidates = @(
        "C:\Program Files\MetaTrader 5\MetaEditor64.exe",
        "C:\Program Files\Five Percent Online MetaTrader 5\MetaEditor64.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    foreach ($root in @("C:\Program Files", "C:\Program Files (x86)")) {
        if (-not (Test-Path $root)) { continue }
        $found = Get-ChildItem -Path $root -Filter MetaEditor64.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            return $found.FullName
        }
    }

    return $null
}

$repoRoot = Get-Location
$zipPath = Join-Path $repoRoot "terminal-farm\mt5-install.zip"
$mq5Path = Join-Path $repoRoot "terminal-farm\ea\TradeTaperSync.mq5"
$ex5Path = Join-Path $repoRoot "terminal-farm\ea\TradeTaperSync.ex5"
$compileLogPath = Join-Path $repoRoot "terminal-farm\ea\compile.log"

if (-not (Test-Path $zipPath)) {
    Write-Error "mt5-install.zip not found at $zipPath. Please add MT5 install zip to terminal-farm/."
    exit 1
}

if (-not (Test-Path $mq5Path)) {
    Write-Error "EA source not found at $mq5Path."
    exit 1
}

$metaEditor = Find-MetaEditor
if ($metaEditor) {
    Write-Host "Compiling EA with MetaEditor: $metaEditor"
    Remove-Item -ErrorAction SilentlyContinue $compileLogPath

    & $metaEditor /portable "/compile:$mq5Path" "/log:$compileLogPath" | Out-Null
    Start-Sleep -Seconds 2
}

if (-not (Test-Path $ex5Path)) {
    if ($metaEditor) {
        Write-Error "EA compilation failed. TradeTaperSync.ex5 was not generated."
        if (Test-Path $compileLogPath) {
            Write-Host "Last compile log lines:"
            Get-Content $compileLogPath | Select-Object -Last 40
        }
    } else {
        Write-Error "MetaEditor64.exe not found and TradeTaperSync.ex5 is missing. Install MT5 locally or place TradeTaperSync.ex5 in terminal-farm/ea."
    }
    exit 1
}

Write-Host "EA binary ready: $ex5Path"
Write-Host "=== Building MT5 Terminal Image (local) ==="

Push-Location (Join-Path $repoRoot "terminal-farm")
try {
    docker build -t mt5-terminal:latest .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Image built: mt5-terminal:latest"
} finally {
    Pop-Location
}
