import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { RagBadge } from '@/components/rag-badge';
import { TrendChart } from '@/components/trend-chart';
import { getLines, getTrend, resolveFilters } from '@/lib/wpl';
import { formatUnit, isRunRate, toNumber, weekLabel } from '@/lib/wpl-format';
import type React from 'react';

export const dynamic = 'force-dynamic';

export default async function TrendPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; week?: string; line?: string }>;
}) {
  const params = await searchParams;
  let content: React.ReactNode;
  let filters: React.ComponentProps<typeof FilterBar>['filters'] = [];

  try {
    const { sites, weeks, site, week } = await resolveFilters(params, ['PILOT', 'POULTRY_KILL', 'PORK_KILL']);
    if (!site || !week) throw new Error('No sites or weeks in WPL_T_WEEKLY_PL. Run WPL_REFRESH.');
    const all = await getLines();
    // Lines with a value at this site: the site's own kill line for kill sites, built lines and subtotals for pilot sites.
    const lines = all.filter((l) => {
      if (l.RAG === 'Red') return false;
      if (site.SITE_KIND === 'POULTRY_KILL') return l.LINE_ID === '20';
      if (site.SITE_KIND === 'PORK_KILL') return l.LINE_ID === '10';
      return l.LINE_ID !== '10' && l.LINE_ID !== '20' && l.LINE_ID !== '420' && l.LINE_ID !== '710';
    });
    const line = lines.find((l) => l.LINE_ID === params.line) ?? lines.find((l) => l.LINE_ID === '1110') ?? lines[0];
    if (!line) throw new Error('No lines with values for this site.');
    filters = [
      { param: 'site', label: 'Site', value: site.SITE, options: sites.map((s) => ({ value: s.SITE, label: s.SITE })) },
      {
        param: 'week',
        label: 'Up to',
        value: week.WEEK_START,
        options: weeks.map((w) => ({ value: w.WEEK_START, label: weekLabel(w.FISCAL_WEEK, w.WEEK_START) })),
      },
      {
        param: 'line',
        label: 'Line',
        value: line.LINE_ID ?? '',
        options: lines.map((l) => ({ value: l.LINE_ID ?? '', label: `${l.LINE_NAME}${l.RAG ? ` (${l.RAG})` : ''}` })),
      },
    ];
    const trend = await getTrend(site.SITE, week.WEEK_START, Number(line.LINE_ID));
    const overhead = isRunRate(line);
    const data = trend.map((t) => ({
      label: `W${t.FISCAL_WEEK}`,
      value: toNumber(t.VALUE),
      actual: toNumber(t.ACTUAL_VALUE),
    }));
    const sum = data.reduce((a, d) => a + (d.value ?? 0), 0);

    content = (
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {line.LINE_NAME} · {site.SITE}
            </h2>
            <p className="text-sm text-muted-foreground">
              13 weeks up to {weekLabel(week.FISCAL_WEEK, week.WEEK_START)}.
              {line.UNIT !== '%' && line.UNIT !== 'GBP/kg' && ` Sum of weeks: ${formatUnit(sum, line.UNIT ?? '')}.`}
              {overhead && ' Bars are the run rate. The red line is the weekly GL actual.'}
            </p>
          </div>
          {line.RAG && <RagBadge rag={line.RAG} />}
        </div>
        {data.length === 0 ? (
          <EmptyState title="No weeks for this line" description="Select a later week or another line." />
        ) : (
          <TrendChart data={data} unit={line.UNIT ?? ''} showActual={overhead} />
        )}
        {line.RULE && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Rule used: </span>
            {line.RULE}
          </p>
        )}
      </section>
    );
  } catch (e) {
    console.error(new Date().toISOString(), '[trend] load failed', e);
    content = (
      <EmptyState variant="error" title="The trend did not load" description={e instanceof Error ? e.message : 'Unknown error'} />
    );
  }

  return (
    <>
      <FilterBar filters={filters} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>
    </>
  );
}
