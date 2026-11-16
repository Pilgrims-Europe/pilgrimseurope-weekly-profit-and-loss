import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { KpiCard } from '@/components/kpi-card';
import { PlTable } from '@/components/pl-table';
import { getPl, resolveFilters } from '@/lib/wpl';
import { formatUnit, toNumber, weekLabel } from '@/lib/wpl-format';
import { ALL_SITES, rollUp } from '@/lib/wpl-rollup';
import type React from 'react';

export const dynamic = 'force-dynamic';

const KPI_LINES = [
  { id: '850', label: 'Total net revenue', link: 'See the sales lines', anchor: '#group-external-sales-at-standard' },
  { id: '860', label: 'Actual contribution', link: 'See the variances', anchor: '#group-production-variances' },
  { id: '1070', label: 'Total overheads', link: 'See the overheads', anchor: '#group-overheads' },
  { id: '1110', label: 'EBIT', link: 'See the result', anchor: '#group-result' },
];

export default async function WeeklyPlPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; week?: string }>;
}) {
  const params = await searchParams;
  let content: React.ReactNode;
  let filters: React.ComponentProps<typeof FilterBar>['filters'] = [];

  try {
    const { sites, weeks, site: pilot, week } = await resolveFilters(params);
    if (!pilot || !week) throw new Error('No sites or weeks in WPL_T_WEEKLY_PL. Run WPL_REFRESH.');
    // All sites is the default: pilot sites for the P&L lines, kill sites for the kill lines.
    const one = params.site && params.site !== ALL_SITES ? pilot.SITE : undefined;
    const siteLabel = one ?? ALL_SITES;
    filters = [
      {
        param: 'site',
        label: 'Site',
        value: siteLabel,
        options: [{ value: ALL_SITES, label: ALL_SITES }, ...sites.map((s) => ({ value: s.SITE, label: s.SITE }))],
      },
      {
        param: 'week',
        label: 'Week',
        value: week.WEEK_START,
        options: weeks.map((w) => ({ value: w.WEEK_START, label: weekLabel(w.FISCAL_WEEK, w.WEEK_START) })),
      },
    ];
    const lines = rollUp(await getPl(week.WEEK_START, one));
    const byId = new Map(lines.map((l) => [l.LINE_ID, l]));
    const ebitPct = byId.get('1140');
    const built = lines.filter((l) => l.STATUS === 'Built');
    const rag = (r: string) => lines.filter((l) => l.RAG === r && l.STATUS !== 'Not a kill site').length;

    content = (
      <>
        <p className="text-sm text-muted-foreground">
          {siteLabel} · {weekLabel(week.FISCAL_WEEK, week.WEEK_START)} · {built.length} lines built from Snowflake.
          Sales and variances are actual. Overheads are a run rate.
          {one ? '' : ' Kill is from the kill sites. Click ▸ on a line to see each site and the items behind it.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_LINES.map((k) => {
            const l = byId.get(k.id);
            const v = toNumber(l?.VALUE);
            const missing = toNumber(l?.MISSING_COMPONENTS) ?? 0;
            return (
              <KpiCard
                key={k.id}
                label={k.label}
                value={formatUnit(l?.VALUE, 'GBP')}
                tone={v !== null && v < 0 ? 'bad' : undefined}
                note={
                  k.id === '1110' && ebitPct
                    ? `EBIT % ${formatUnit(ebitPct.VALUE, '%')}. Excludes ${missing} lines not built.`
                    : missing > 0
                      ? `Excludes ${missing} lines not built.`
                      : `Last week ${formatUnit(l?.PREV_VALUE, 'GBP')}`
                }
                href={k.anchor}
                linkText={k.link}
              />
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Green lines" value={rag('Green')} note="Data in Snowflake and the rule is known." tone="good" />
          <KpiCard
            label="Amber lines"
            value={rag('Amber')}
            note="Built with a default rule. Check the rule before you use the figure."
          />
          <KpiCard
            label="Red lines"
            value={rag('Red')}
            note="Manual or not in Snowflake. Not built. Subtotals exclude them."
            tone="bad"
            href={`/lines?rag=Red`}
            linkText="See the Red lines"
          />
        </div>
        <PlTable lines={lines} site={siteLabel} weekStart={week.WEEK_START} />
      </>
    );
  } catch (e) {
    console.error(new Date().toISOString(), '[weekly-pl] load failed', e);
    content = (
      <EmptyState
        variant="error"
        title="The weekly P&L did not load"
        description={e instanceof Error ? e.message : 'Unknown error'}
      />
    );
  }

  return (
    <>
      <FilterBar filters={filters} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>
    </>
  );
}
