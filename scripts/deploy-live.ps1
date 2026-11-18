# Deploy the weekly P&L to live: SQL views, table refresh, tie-out checks, then the app.
# Runs only from an up-to-date, clean main, so live always matches main.
# Usage: powershell -File scripts\deploy-live.ps1 [-SkipApp]
param([switch]$SkipApp)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# 1. Guard: clean main at origin/main.
git -C $root fetch -q origin
$branch = git -C $root rev-parse --abbrev-ref HEAD
$head = git -C $root rev-parse HEAD
$main = git -C $root rev-parse origin/main
$dirty = git -C $root status --porcelain
if ($branch -ne 'main' -or $head -ne $main -or $dirty) {
    Write-Output "Stop: run this from a clean main at origin/main (branch $branch, HEAD $head, origin/main $main)."
    exit 1
}

# 2. SQL files 01 to 14 in DEV_ANALYTICS.FINANCE_PL_WEEKLY, then the table refresh.
$file = Join-Path $env:TEMP 'wpl-live.sql'
$parts = @()
foreach ($f in Get-ChildItem (Join-Path $root 'sql') -Filter '*.sql' | Sort-Object Name) { $parts += [IO.File]::ReadAllText($f.FullName) }
$parts += 'CALL DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_REFRESH();'
[IO.File]::WriteAllText($file, ($parts -join "`n"))
snow sql -f $file --enable-templating NONE | Select-String -Pattern 'rror|rebuilt at'
if ($LASTEXITCODE -ne 0) { Write-Output 'Stop: the SQL failed. The app is not deployed.'; exit 1 }

# 3. Tie-out checks. Stop before the app deploy if a check fails.
powershell -NoProfile -File (Join-Path $PSScriptRoot 'check-tie-out.ps1')
if ($LASTEXITCODE -ne 0) { Write-Output 'Stop: tie-out failed. The SQL is live; the app is not deployed.'; exit 1 }
if ($SkipApp) { exit 0 }

# 4. App deploy. A stale app/output bundle makes the deploy fail with "File exists".
$app = Join-Path $root 'app'
if (Test-Path (Join-Path $app 'output')) { Remove-Item -Recurse -Force (Join-Path $app 'output') }
Push-Location $app
try { snow app deploy | Select-Object -Last 3 } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { Write-Output 'Stop: the app deploy failed.'; exit 1 }

# 5. Show the running version.
snow sql -q 'DESCRIBE APPLICATION SERVICE DEV_ANALYTICS.FINANCE_PL_WEEKLY.WEEKLY_PL' --format json |
    ConvertFrom-Json | ForEach-Object { 'App {0}: {1}' -f $_.status, (($_.source | ConvertFrom-Json).version) }
