# Smoke test of the Weekly P&L app: each tab and period must return 200 without an error message.
# Run against a local dev server (the deployed app needs a browser sign-in).
# Usage: powershell -File scripts\smoke.ps1 [-Base http://localhost:3001]
param([string]$Base = 'http://localhost:3000')
$urls = @(
    '/', '/lines', '/trend', '/kill', '/quality',
    '/week-by-week?period=MTD', '/week-by-week?period=QTD', '/week-by-week?period=YTD&show=cumulative', '/week-by-week?period=L12M',
    '/sales-margin?period=MTD', '/sales-margin?period=QTD&show=cumulative', '/sales-margin?period=YTD&site=Redruth', '/sales-margin?period=L12M',
    '/sales-margin?period=L12M&week=2025-06-30', '/sales-margin?period=QTD&cat=Cooked%20Meats'
)
$failed = 0
foreach ($u in $urls) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $r = Invoke-WebRequest -UseBasicParsing "$Base$u" -TimeoutSec 170
        $bad = $r.Content.Contains('did not load')
        if ($bad) { $failed++ }
        '{0,-48} {1} {2,6} ms {3}' -f $u, $r.StatusCode, $sw.ElapsedMilliseconds, $(if ($bad) { 'ERROR ON PAGE' } else { '' })
    } catch {
        $failed++
        '{0,-48} FAILED {1}' -f $u, $_.Exception.Message
    }
}
if ($failed) { Write-Output "Smoke test FAILED: $failed of $($urls.Count) pages"; exit 1 }
Write-Output "Smoke test OK: $($urls.Count) pages"
