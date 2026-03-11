param(
    [Parameter(Mandatory = $true)]
    [string]$SeedName,

    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Copy-IfExists {
    param(
        [string]$From,
        [string]$To
    )

    if (-not (Test-Path $From)) {
        return
    }

    $parent = Split-Path -Parent $To
    if ($parent) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    Copy-Item -Path $From -Destination $To -Recurse -Force
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$resolvedSource = (Resolve-Path $SourcePath).Path
$seedSlug = ($SeedName.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')

if ([string]::IsNullOrWhiteSpace($seedSlug)) {
    throw "SeedName '$SeedName' does not produce a valid seed directory name."
}

$seedRoot = Join-Path $repoRoot "terminal-farm\seeds\$seedSlug"

if ((Test-Path $seedRoot) -and -not $Force) {
    throw "Seed directory already exists: $seedRoot. Re-run with -Force to overwrite."
}

if (Test-Path $seedRoot) {
    Remove-Item -Path $seedRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $seedRoot -Force | Out-Null

$copyMap = @(
    @{ From = (Join-Path $resolvedSource 'config'); To = (Join-Path $seedRoot 'config') }
    @{ From = (Join-Path $resolvedSource 'Config'); To = (Join-Path $seedRoot 'Config') }
    @{ From = (Join-Path $resolvedSource 'bases'); To = (Join-Path $seedRoot 'bases') }
    @{ From = (Join-Path $resolvedSource 'Bases'); To = (Join-Path $seedRoot 'bases') }
    @{ From = (Join-Path $resolvedSource 'Profiles'); To = (Join-Path $seedRoot 'Profiles') }
    @{ From = (Join-Path $resolvedSource 'profiles'); To = (Join-Path $seedRoot 'Profiles') }
    @{ From = (Join-Path $resolvedSource 'MQL5\Profiles'); To = (Join-Path $seedRoot 'Profiles') }
    @{ From = (Join-Path $resolvedSource 'terminal'); To = (Join-Path $seedRoot 'terminal') }
    @{ From = (Join-Path $resolvedSource 'Program Files\MetaTrader 5'); To = (Join-Path $seedRoot 'Program Files\MetaTrader 5') }
)

$seenSources = @{}
foreach ($entry in $copyMap) {
    if (-not (Test-Path $entry.From)) {
        continue
    }

    $resolvedFrom = (Resolve-Path $entry.From).Path
    $normalizedSource = $resolvedFrom.ToLowerInvariant()
    if ($seenSources.ContainsKey($normalizedSource)) {
        continue
    }

    $seenSources[$normalizedSource] = $true
    Copy-IfExists -From $resolvedFrom -To $entry.To
}

$candidateServerFiles = @(
    Join-Path $resolvedSource 'servers.dat'
    Join-Path $resolvedSource 'Config\servers.dat'
    Join-Path $resolvedSource 'config\servers.dat'
)

foreach ($serverFile in $candidateServerFiles) {
    if (Test-Path $serverFile) {
        Copy-IfExists -From $serverFile -To (Join-Path $seedRoot 'servers.dat')
        break
    }
}

$manifest = [pscustomobject]@{
    seedName = $SeedName
    seedSlug = $seedSlug
    sourcePath = $resolvedSource
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
}

$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $seedRoot 'seed-manifest.json') -Encoding UTF8

Write-Host "Broker seed created at: $seedRoot"
Write-Host "Source path: $resolvedSource"
