import { EmptyState } from '@/components/empty-state';
import { KpiCard } from '@/components/kpi-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REPO_URL } from '@/lib/constants';
import { getFreshness, getProductionTonnageCheck, getUnmapped } from '@/lib/wpl';
import { formatUnit } from '@/lib/wpl-format';
import type React from 'react';

export const dynamic = 'force-dynamic';

const OPEN_RULES = [
  { ticket: 20, title: 'STO lines and the intercompany rule', lines: 'All STO lines, STD Int Freight, Distribution' },
  { ticket: 22, title: 'GL accounts for Materials (OCI), Traded Good and fuel gas', lines: 'Materials (OCI), Traded Good (PPV), Packaging (OCI)' },
];

const KNOWN = [
  'Overheads (not Consumables) are a run rate: the average of the 13 weeks before. The first weeks of FY2026 use fewer weeks. The run rate period is not decided.',
  'Kill (poultry) does not take off condemnations. The condemnation codes include part rejects such as croppings, so their total is not a count of whole birds.',
  'Anwick reports delivered birds by plant weigh-in time. This app uses the Mtech kill date, so Anwick can differ by day.',
  'Production Material Yield is GL material consumption less production output credits. Gui\'s method compares actual with standard. The two can differ.',
  'Production Tonnage is finished goods only (Z61 less Z62 on GL 5000100, cases x net weight). Site finance has not confirmed this rule.',
  'STO is movement type 641 goods issue at the released standard cost. Internal NSV is at standard cost, so internal contribution is close to freight only.',
  'Substitution, Materials (OCI) and Traded Good (PPV) are empty: no source field or GL account is known.',
  'Revaluation (STK) is a new line from Gui\'s PHASE 2 sheet. It is not on the Anaplan weekly template.',
];

export default async function QualityPage() {
  let content: React.ReactNode;
  try {
    const [fresh, unmapped, tonnage] = await Promise.all([getFreshness(), getUnmapped(), getProductionTonnageCheck()]);
    const tonnageSites = [...new Set(tonnage.map((t) => t.SITE))];
    const t1 = (v: number | null) => (v === null ? 'Unknown' : v.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    const byGroup = new Map<string, { value: number; accounts: number }>();
    for (const u of unmapped) {
      const g = String(u.GROUP_NAME ?? 'Not in the P&L account structure');
      const cur = byGroup.get(g) ?? { value: 0, accounts: 0 };
      cur.value += Number(u.VALUE) || 0;
      cur.accounts += 1;
      byGroup.set(g, cur);
    }
    const groups = [...byGroup.entries()].sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value));

    content = (
      <>
        <p className="text-sm text-muted-foreground">These checks cover all data, whatever filters are set on the other pages.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Latest data refresh"
            value={fresh[0]?.REFRESHED_AT ? `${fresh[0].REFRESHED_AT} UTC` : 'Unknown'}
            note="The task WPL_REFRESH_TASK rebuilds the tables daily at 11:00 UTC."
          />
          <KpiCard
            label="GL line items up to"
            value={fresh.find((f) => f.SOURCE === 'GL line items')?.DATA_TO ?? 'Unknown'}
            note="Week end of the latest complete week."
          />
          <KpiCard
            label="Open rule tickets"
            value={OPEN_RULES.length}
            note="Amber lines use a default rule until these are decided."
          />
        </div>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold">Freshness by source</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Last loaded (UTC)</TableHead>
                <TableHead>Data to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fresh.map((f) => (
                <TableRow key={f.SOURCE}>
                  <TableCell className="font-semibold">{f.SOURCE}</TableCell>
                  <TableCell className="font-mono text-xs">{f.OBJECT_NAME}</TableCell>
                  <TableCell>{f.LAST_LOADED ?? 'Unknown'}</TableCell>
                  <TableCell>{f.DATA_TO ?? 'Unknown'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold">Production tonnage check (last 8 complete weeks)</h2>
            <p className="text-sm text-muted-foreground">
              Difference = Production Tonnage less (Sales Tonnage + Sales Tonnage (Inedible) + Internal Sales Tonnage (STO) + finished goods
              stock movement). Tonnes. The tolerance is Unknown, so the table has no RAG.{' '}
              <a href={`${REPO_URL}/issues/55`} target="_blank" rel="noreferrer" className="font-semibold text-pe-brand hover:underline">
                #55
              </a>
            </p>
          </div>
          {tonnageSites.length === 0 ? (
            <EmptyState title="No weeks to check" className="m-5" />
          ) : (
            tonnageSites.map((site) => (
              <div key={site} className="border-t">
                <h3 className="px-5 pt-3 text-sm font-semibold">{site}</h3>
                <Table striped>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead numeric>Production</TableHead>
                      <TableHead numeric>Sales</TableHead>
                      <TableHead numeric>Sales (Inedible)</TableHead>
                      <TableHead numeric>Internal (STO)</TableHead>
                      <TableHead numeric>FG stock movement</TableHead>
                      <TableHead numeric>Difference</TableHead>
                      <TableHead numeric>Difference %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tonnage
                      .filter((t) => t.SITE === site)
                      .map((t) => (
                        <TableRow key={t.WEEK_START}>
                          <TableCell>
                            Wk {t.FISCAL_WEEK} ({t.WEEK_START})
                          </TableCell>
                          <TableCell numeric>{t1(t.PRODUCTION_T)}</TableCell>
                          <TableCell numeric>{t1(t.SALES_T)}</TableCell>
                          <TableCell numeric>{t1(t.SALES_INEDIBLE_T)}</TableCell>
                          <TableCell numeric>{t1(t.INTERNAL_SALES_T)}</TableCell>
                          <TableCell numeric>{t1(t.FG_STOCK_T)}</TableCell>
                          <TableCell numeric>{t1(t.DIFFERENCE_T)}</TableCell>
                          <TableCell numeric>{t.DIFFERENCE_PCT === null ? 'Unknown' : `${(t.DIFFERENCE_PCT * 100).toFixed(1)}%`}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold">Open rules</h2>
            <p className="text-sm text-muted-foreground">Questions to Gui are in questionnaires/line-sources-for-gui.html.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Lines it changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OPEN_RULES.map((r) => (
                <TableRow key={r.ticket}>
                  <TableCell>
                    <a href={`${REPO_URL}/issues/${r.ticket}`} target="_blank" rel="noreferrer" className="font-semibold text-pe-brand hover:underline">
                      #{r.ticket}
                    </a>
                  </TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.lines}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="space-y-2 rounded-xl border border-l-4 border-l-pe-yellow bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Known limits of the default rules</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {KNOWN.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold">P&amp;L GL accounts that no line uses (FY2026, pilot sites)</h2>
            <p className="text-sm text-muted-foreground">
              Sales, cost of sales and direct wages are expected here, because the COPA standard cost lines carry them.
              Other groups can be a gap in the account map.
            </p>
          </div>
          {groups.length === 0 ? (
            <EmptyState title="Every P&L account is mapped" className="m-5" />
          ) : (
            <Table striped>
              <TableHeader>
                <TableRow>
                  <TableHead>P&amp;L group</TableHead>
                  <TableHead numeric>Accounts</TableHead>
                  <TableHead numeric>FY2026 value (£)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(([g, v]) => (
                  <TableRow key={g}>
                    <TableCell>{g}</TableCell>
                    <TableCell numeric>{v.accounts}</TableCell>
                    <TableCell numeric className={v.value < 0 ? 'text-pe-red' : ''}>
                      {formatUnit(v.value, 'GBP')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </>
    );
  } catch (e) {
    console.error(new Date().toISOString(), '[quality] load failed', e);
    content = (
      <EmptyState variant="error" title="The checks did not load" description={e instanceof Error ? e.message : 'Unknown error'} />
    );
  }
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>;
}
