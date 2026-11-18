# Build the weekly P&L SQL in a copy schema for local tests. The live schema and task do not change.
# Usage: powershell -File scripts\build-dev-schema.ps1 [-Schema FINANCE_PL_WEEKLY_WBW]
param([string]$Schema = 'FINANCE_PL_WEEKLY_WBW')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $env:TEMP "wpl-$Schema.sql"
$parts = @("CREATE SCHEMA IF NOT EXISTS DEV_ANALYTICS.$Schema COMMENT = 'Weekly P&L app: copy for local tests. Not used by the live app.';")
foreach ($f in Get-ChildItem (Join-Path $root 'sql') -Filter '*.sql' | Sort-Object Name) {
    $t = [IO.File]::ReadAllText($f.FullName)
    # Keep the refresh procedure, drop the scheduled task.
    $i = $t.IndexOf('CREATE OR REPLACE TASK')
    if ($i -ge 0) { $t = $t.Substring(0, $i) }
    $parts += $t.Replace('DEV_ANALYTICS.FINANCE_PL_WEEKLY.', "DEV_ANALYTICS.$Schema.")
}
$parts += "CALL DEV_ANALYTICS.$Schema.WPL_REFRESH();"
[IO.File]::WriteAllText($out, ($parts -join "`n"))
snow sql -f $out --enable-templating NONE
powershell -NoProfile -File (Join-Path $PSScriptRoot 'check-tie-out.ps1') -Schema $Schema
