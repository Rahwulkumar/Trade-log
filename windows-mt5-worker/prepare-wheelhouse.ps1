param(
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function Resolve-PythonCommand {
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        & $pyLauncher.Source -3.11 -c "import sys; print(sys.executable)" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return @{
                FilePath = $pyLauncher.Source
                Prefix = @('-3.11')
                Label = 'py -3.11'
            }
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

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Resolve-PythonCommand
Write-Host "Using Python interpreter: $($python.Label)"

if (-not $OutputPath) {
    $OutputPath = Join-Path $root 'wheelhouse'
}

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

& $python.FilePath @($python.Prefix + @('-m', 'pip', 'download', '-r', 'requirements.txt', '-d', $OutputPath))
if ($LASTEXITCODE -ne 0) {
    throw "Failed to download wheelhouse packages to $OutputPath"
}

Write-Host "Wheelhouse prepared at $OutputPath"
Write-Host 'Copy this folder to the Windows worker and rerun bootstrap.ps1.'
