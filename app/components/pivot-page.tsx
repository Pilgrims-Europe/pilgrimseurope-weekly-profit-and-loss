import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { KpiCard } from '@/components/kpi-card';
import { MultiSelectFilter } from '@/components/multi-select-filter';
import { PivotTable } from '@/components/pivot-table';
import { REPO_URL } from '@/lib/constants';
import { type FilterValue, getPlRange, getSalesFilterOptions, getSalesLeafValues, type Layout, resolveFilters } from '@/lib/wpl';
import { SALES_FILTERS, type SalesFilterParam, applyFilteredValues, isFiltered, toSalesFilter } from '@/lib/wpl-filter';
import { formatUnit, weekLabel } from '@/lib/wpl-format';
import { PERIODS, SHOWS, periodText, periodWeeks, toPeriod, toShow } from '@/lib/wpl-period';
import { pivot } from '@/lib/wpl-pivot';
import { ALL_SITES } from '@/lib/wpl-rollup';
import type React from 'react';

/** Page search parameters. The Sales margin filters (cust, cat, bu, mat) can repeat. */
export type PivotParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Period totals shown as KPI cards above the table. */
const KPIS: Record<Layout, { id: string; label: string }[]> = {
  'Anaplan template': [
    { id: '850', label: 'Total net revenue' },
    { id: '860', label: 'Actual contribution' },
    { id: '1070', label: 'Total overheads' },
    { id: '1110', label: 'EBIT' },
  ],
  'Sales margin': [
    { id: '2060', label: 'N.S.V.' },
    { id: '2230', label: 'Contribution' },
    { id: '2240', label: 'Contribution/kg' },
    { id: '2250', label: '% Contribution' },
  ],
};

/** The options, plus any selected value with no sales in the period (so it can be cleared). */
function withSelected(options: FilterValue[], selected: string[]): FilterValue[] {
  const known = new Set(options.map((o) => o.VALUE));
  return [...options, ...selected.filter((v) => !known.has(v)).map((v) => ({ VALUE: v, LABEL: `${v} (no sales in this period)` }))];
}

/** "Customer: Tesco (1642179); Category: Cooked Meats" for the note above the table. */
function describeFilter(f: ReturnType<typeof toSalesFilter>, options: Record<SalesFilterParam, FilterValue[]> | null): string {
  return SALES_FILTERS.filter((d) => f[d.param].length)
    .map((d) => {
      const names = f[d.param].map((v) => options?.[d.param].find((o) => o.VALUE === v)?.LABEL ?? v);
      return `${d.label}: ${names.join(', ')}`;
    })
    .join('; ');
}

const ticket = (n: number) => (
  <a href={`${REPO_URL}/issues/${n}`} target="_blank" rel="noreferrer" className="font-semibold text-pe-brand hover:underline">
    #{n}
  </a>
);

/**
 * A week-by-week view of one layout: the Week by week tab (Anaplan template) and the Sales margin tab.
 * Filters: site, the last week of the period, the period, and weekly or cumulative values.
 * The Sales margin tab also filters on customer, category, business unit and material (COPA detail).
 */
export async function PivotPage({ layout, params: raw }: { layout: Layout; params: PivotParams }) {
  let content: React.ReactNode;
  let filters: React.ComponentProps<typeof FilterBar>['filters'] = [];
  let salesPills: React.ReactNode = null;
  const margin = layout === 'Sales margin';
  const params = { site: first(raw.site), week: first(raw.week), period: first(raw.period), show: first(raw.show) };
  const salesFilter = toSalesFilter(raw);
  const filtered = margin && isFiltered(salesFilter);

  try {
    const { sites, weeks, site: pilot, week } = await resolveFilters(params);
    if (!pilot || !week) throw new Error('No sites or weeks in WPL_T_WEEKLY_PL. Run WPL_REFRESH.');
    const one = params.site && params.site !== ALL_SITES ? pilot.SITE : undefined;
    const siteLabel = one ?? ALL_SITES;
    const period = toPeriod(params.period);
    const show = toShow(params.show);
    const span = periodWeeks(weeks, week, period);
    filters = [
      {
        param: 'site',
        label: 'Site',
        value: siteLabel,
        options: [{ value: ALL_SITES, label: ALL_SITES }, ...sites.map((s) => ({ value: s.SITE, label: s.SITE }))],
      },
      {
        param: 'week',
        label: 'Up to',
        value: week.WEEK_START,
        options: weeks.map((w) => ({ value: w.WEEK_START, label: weekLabel(w.FISCAL_WEEK, w.WEEK_START) })),
      },
      { param: 'period', label: 'Period', value: period, options: PERIODS.map((p) => ({ ...p })) },
      { param: 'show', label: 'Show', value: show, options: SHOWS.map((s) => ({ ...s })) },
    ];

    const [base, options, leaf] = await Promise.all([
      getPlRange(span[0].WEEK_START, week.WEEK_START, layout, one),
      margin ? getSalesFilterOptions(span[0].WEEK_START, week.WEEK_START, one) : null,
      filtered ? getSalesLeafValues(span[0].WEEK_START, week.WEEK_START, salesFilter, one) : null,
    ]);
    const data = leaf ? applyFilteredValues(base, leaf) : base;
    if (options) {
      salesPills = SALES_FILTERS.map((d) => (
        <MultiSelectFilter
          key={d.param}
          param={d.param}
          label={d.label}
          options={withSelected(options[d.param], salesFilter[d.param]).map((o) => ({ value: o.VALUE, label: o.LABEL }))}
          selected={salesFilter[d.param]}
        />
      ));
    }
    const filterText = filtered ? describeFilter(salesFilter, options) : null;
    const rows = pivot(
      data,
      span.map((w) => w.WEEK_START),
      show,
    );
    const byId = new Map(rows.map((r) => [r.line.LINE_ID, r]));
    const noData = rows.some((r) => r.cellStatus.includes('No data'));
    const amber = rows.filter((r) => r.line.RAG === 'Amber').length;

    content = (
      <>
        <p className="text-sm text-muted-foreground">
          {siteLabel} · {periodText(period, span)} · {span.length} {span.length === 1 ? 'week' : 'weeks'}.{' '}
          {margin
            ? 'External COPA sales of the pilot sites (intercompany out). Total KG is edible kg.'
            : 'Sales and variances are actual. Overheads are a run rate.'}
          {noData && ' Weeks before 21 Apr 2025 have no COPA data: those lines show — and are not in the total.'}
        </p>
        {filterText && (
          <p className="rounded-lg border border-pe-brand/30 bg-pe-tint-brand px-4 py-3 text-sm">
            <span className="font-semibold text-pe-brand">Filtered:</span> {filterText}. Each line shows only these sales.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS[layout].map((k) => {
            const r = byId.get(k.id);
            return (
              <KpiCard
                key={k.id}
                label={`${k.label}, ${period === 'L12M' ? 'Last 12 Months' : period}`}
                value={formatUnit(r?.total ?? null, r?.line.UNIT)}
                tone={r?.total !== null && r?.total !== undefined && r.total < 0 ? 'bad' : undefined}
                note={r && r.missing > 0 ? `Excludes ${r.missing} lines not built.` : `${span.length} weeks to week ${week.FISCAL_WEEK}`}
              />
            );
          })}
        </div>
        {margin && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            All {amber} source lines are Amber until Gui signs them off: O.S.C {ticket(50)}, the cost split {ticket(51)}, Total KG{' '}
            {ticket(52)} and freight {ticket(21)}. Contribution is the same as COPA CM1 for external sales.
          </p>
        )}
        <PivotTable rows={rows} weeks={span} layout={layout} weekStart={week.WEEK_START} show={show} />
      </>
    );
  } catch (e) {
    console.error(new Date().toISOString(), `[weekly-pl] ${layout} pivot load failed`, e);
    content = (
      <EmptyState
        variant="error"
        title="The week-by-week view did not load"
        description={e instanceof Error ? e.message : 'Unknown error'}
      />
    );
  }

  return (
    <>
      <FilterBar filters={filters}>{salesPills}</FilterBar>
      <main className="mx-auto w-full max-w-[96rem] space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>
    </>
  );
}
