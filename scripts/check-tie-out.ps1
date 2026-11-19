# Run a check file in sql/checks on the live schema or a copy. Exit 1 if a check returns rows or the SQL fails.
# Usage: powershell -File scripts\check-tie-out.ps1 [-Schema FINANCE_PL_WEEKLY_WBW] [-Check tie_out|app_contract]
#   tie_out (default): the tie-out checks (sql/checks/tie_out.sql).
#   app_contract: the tables have the columns app/lib/wpl.ts reads (sql/checks/app_contract.sql).
param(
    [string]$Schema = 'FINANCE_PL_WEEKLY',
    [ValidateSet('tie_out', 'app_contract')]
    [string]$Check = 'tie_out'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$sql = [IO.File]::ReadAllText((Join-Path $root "sql\checks\$Check.sql")).Replace('DEV_ANALYTICS.FINANCE_PL_WEEKLY.', "DEV_ANALYTICS.$Schema.")
$file = Join-Path $env:TEMP "wpl-$Check-$Schema.sql"
[IO.File]::WriteAllText($file, $sql)
$out = snow sql -f $file --enable-templating NONE --format json | Out-String
if ($LASTEXITCODE -ne 0) { Write-Output $out; exit 1 }
# Windows PowerShell passes "[]" on as one empty array, so keep only rows that have a check name.
$rows = @($out | ConvertFrom-Json | ForEach-Object { $_ } | Where-Object { $_.CHECK_NAME })
if ($rows.Count -gt 0) {
    Write-Output "$Check FAILED on DEV_ANALYTICS.${Schema}: $($rows.Count) rows"
    $rows | Select-Object -First 20 | Format-Table -AutoSize | Out-String -Width 200 | Write-Output
    exit 1
}
Write-Output "$Check OK on DEV_ANALYTICS.$Schema"
