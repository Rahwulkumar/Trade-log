param(
    [switch]$Force,
    [string]$WheelhousePath
)

$ErrorActionPreference = 'Stop'

function Resolve-PythonCommand {
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        try {
            & $pyLauncher.Source -3.11 -c "import sys; print(sys.executable)" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                return @{
                    FilePath = $pyLauncher.Source
                    Prefix = @('-3.11')
                    Label = 'py -3.11'
                }
            }
        } catch {
            # The launcher may not be refreshed after install yet. Fall back to
            # direct interpreter discovery below.
        }
    }

    $local311 = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
    if (Test-Path $local311) {
        return @{
            FilePath = $local311
            Prefix = @()
            Label = $local311
        }
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return @{
            FilePath = $python.Source
            Prefix = @()
            Label = $python.Source
        }
    }

    throw 'Python is not installed or not available on PATH.'
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$Arguments = @()
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Resolve-PythonCommand
Write-Host "Using Python interpreter: $($python.Label)"

$venvPath = Join-Path $root '.venv'
if ((Test-Path $venvPath) -and $Force) {
    Remove-Item -Recurse -Force $venvPath
}

if (-not (Test-Path $venvPath)) {
    Invoke-CheckedCommand -FilePath $python.FilePath -Arguments ($python.Prefix + @('-m', 'venv', '.venv'))
}

$pythonExe = Join-Path $venvPath 'Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
    throw "Virtual environment python executable not found at $pythonExe"
}

Invoke-CheckedCommand -FilePath $pythonExe -Arguments @('-m', 'pip', 'install', '--upgrade', 'pip')

$resolvedWheelhouse = $null
if ($WheelhousePath) {
    $candidate = Resolve-Path $WheelhousePath -ErrorAction Stop
    $resolvedWheelhouse = $candidate.Path
} else {
    $defaultWheelhouse = Join-Path $root 'wheelhouse'
    if (Test-Path $defaultWheelhouse) {
        $resolvedWheelhouse = (Resolve-Path $defaultWheelhouse).Path
    }
}

if ($resolvedWheelhouse) {
    Write-Host "Installing Python packages from wheelhouse: $resolvedWheelhouse"
    Invoke-CheckedCommand -FilePath $pythonExe -Arguments @('-m', 'pip', 'install', '--no-index', '--find-links', $resolvedWheelhouse, '-r', 'requirements.txt')
} else {
    Invoke-CheckedCommand -FilePath $pythonExe -Arguments @('-m', 'pip', 'install', '-r', 'requirements.txt')
}

$stateDir = Join-Path $root 'state'
$logsDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$envFile = Join-Path $root '.env'
$envExample = Join-Path $root '.env.example'
if ((-not (Test-Path $envFile)) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
}

Write-Host 'Windows MT5 worker bootstrap completed.'
Write-Host "Edit $envFile before running the worker."
Write-Host 'Run .\preflight.ps1 after editing the environment file.'
