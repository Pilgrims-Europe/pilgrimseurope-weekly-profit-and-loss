import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { KpiCard } from '@/components/kpi-card';
import { RagBadge } from '@/components/rag-badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPorkKill, getPorkTypes, getPoultryCodes, getPoultryKill, getPoultryTypes, resolveFilters } from '@/lib/wpl';
import { formatUnit, weekLabel } from '@/lib/wpl-format';
import type React from 'react';

export const dynamic = 'force-dynamic';

const n = (v: unknown) => formatUnit(v, 'head');
const sum = (rows: Record<string, unknown>[], k: string) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const day = (d: unknown) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function KillPage({ searchParams }: { searchParams: Promise<{ site?: string; week?: string }> }) {
  const params = await searchParams;
  let content: React.ReactNode;
  let filters: React.ComponentProps<typeof FilterBar>['filters'] = [];

  try {
    const { sites, weeks, site, week } = await resolveFilters(params, ['POULTRY_KILL', 'PORK_KILL']);
    if (!site || !week) throw new Error('No kill sites or weeks. Run WPL_REFRESH.');
    filters = [
      {
        param: 'site',
        label: 'Kill site',
        value: site.SITE,
        options: sites.map((s) => ({ value: s.SITE, label: `${s.SITE} (${s.SITE_KIND === 'PORK_KILL' ? 'pork' : 'poultry'})` })),
      },
      {
        param: 'week',
        label: 'Week',
        value: week.WEEK_START,
        options: weeks.map((w) => ({ value: w.WEEK_START, label: weekLabel(w.FISCAL_WEEK, w.WEEK_START) })),
      },
    ];

    if (site.SITE_KIND === 'POULTRY_KILL') {
      const [days, codes, types] = await Promise.all([
        getPoultryKill(site.SITE, week.WEEK_START),
        getPoultryCodes(site.SITE, week.WEEK_START),
        getPoultryTypes(site.SITE, week.WEEK_START),
      ]);
      content = (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <RagBadge rag="Green" />
            Kill (poultry) = birds delivered (PLANTHDCOUNT) − DOA. Condemnations are shown, but are not taken off. Void
            loads are out. All sites use the Dungannon rule.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Kill (poultry)" value={n(sum(days, 'BIRDS_KILLED'))} note={`${days.length} kill days`} />
            <KpiCard label="Birds delivered" value={n(sum(days, 'BIRDS_DELIVERED'))} note={`${n(sum(days, 'LOADS'))} loads`} />
            <KpiCard label="Dead on arrival" value={n(sum(days, 'DOA'))} />
            <KpiCard
              label="Condemnations (all codes)"
              value={n(sum(days, 'CONDEMNED'))}
              note="Not taken off kill. Includes part rejects such as croppings."
              tone="bad"
            />
          </div>
          <Card title="Kill by day" note="Kill date is the Mtech event date.">
            {days.length === 0 ? (
              <EmptyState title="No loads this week" className="m-5" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead numeric>Loads</TableHead>
                    <TableHead numeric>Delivered</TableHead>
                    <TableHead numeric>DOA</TableHead>
                    <TableHead numeric>Condemned</TableHead>
                    <TableHead numeric>Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => (
                    <TableRow key={String(d.KILL_DATE)}>
                      <TableCell>{day(d.KILL_DATE)}</TableCell>
                      <TableCell numeric>{n(d.LOADS)}</TableCell>
                      <TableCell numeric>{n(d.BIRDS_DELIVERED)}</TableCell>
                      <TableCell numeric>{n(d.DOA)}</TableCell>
                      <TableCell numeric>{n(d.CONDEMNED)}</TableCell>
                      <TableCell numeric className="font-semibold">{n(d.BIRDS_KILLED)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Week</TableCell>
                    <TableCell numeric>{n(sum(days, 'LOADS'))}</TableCell>
                    <TableCell numeric>{n(sum(days, 'BIRDS_DELIVERED'))}</TableCell>
                    <TableCell numeric>{n(sum(days, 'DOA'))}</TableCell>
                    <TableCell numeric>{n(sum(days, 'CONDEMNED'))}</TableCell>
                    <TableCell numeric>{n(sum(days, 'BIRDS_KILLED'))}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </Card>
          <Card
            title="Kill by provenance"
            note="Provenance is the Mtech product code on the load. Condemnations are not here: Mtech holds them by site and code, with no product, so they cannot be split by provenance. That does not change kill, because condemnations are not taken off kill."
          >
            {types.length === 0 ? (
              <EmptyState title="No kill by provenance this week" className="m-5" />
            ) : (
              <Table striped>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provenance</TableHead>
                    <TableHead numeric>Loads</TableHead>
                    <TableHead numeric>Delivered</TableHead>
                    <TableHead numeric>DOA</TableHead>
                    <TableHead numeric>Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={String(t.PRODUCT_CODE)}>
                      <TableCell>
                        <span className="font-mono text-xs">{String(t.PRODUCT_CODE)}</span>
                        {t.PRODUCT_NAME && (
                          <span className="block text-xs text-muted-foreground">{String(t.PRODUCT_NAME)}</span>
                        )}
                      </TableCell>
                      <TableCell numeric>{n(t.LOADS)}</TableCell>
                      <TableCell numeric>{n(t.BIRDS_DELIVERED)}</TableCell>
                      <TableCell numeric>{n(t.DOA)}</TableCell>
                      <TableCell numeric className="font-semibold">{n(t.BIRDS_KILLED)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Week</TableCell>
                    {['LOADS', 'BIRDS_DELIVERED', 'DOA', 'BIRDS_KILLED'].map((k) => (
                      <TableCell key={k} numeric>
                        {n(sum(types, k))}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </Card>
          <Card
            title="Condemnations by code"
            note="Condemnations are not taken off kill. The meaning of CALCULATIONCATEGORY 1 and 2 is Unknown. Some codes are part rejects, not whole birds."
          >
            {codes.length === 0 ? (
              <EmptyState title="No condemnations this week" className="m-5" />
            ) : (
              <Table striped>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead numeric>Category</TableHead>
                    <TableHead numeric>Head</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => (
                    <TableRow key={String(c.CODE)}>
                      <TableCell className="font-mono text-xs">{c.CODE}</TableCell>
                      <TableCell>{c.CODE_NAME}</TableCell>
                      <TableCell numeric>{c.CALCULATIONCATEGORY ?? '—'}</TableCell>
                      <TableCell numeric>{n(c.HEAD)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      );
    } else {
      const [days, types] = await Promise.all([
        getPorkKill(site.SITE, week.WEEK_START),
        getPorkTypes(site.SITE, week.WEEK_START),
      ]);
      content = (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <RagBadge rag="Green" />
            Kill (pork) = pigs over scale (&quot;Killed Qty&quot; on the Hellenic booking) − TC&apos;d pigs, by Est Kill Date.
            &quot;Killed Qty&quot; does not take off TC&apos;d pigs.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Kill (pork)" value={n(sum(days, 'PIGS_KILLED'))} note={`${n(sum(days, 'BOOKINGS'))} bookings`} />
            <KpiCard label="Pigs over scale" value={n(sum(days, 'KILLED_QTY'))} note={`Killed Qty. Delivered ${n(sum(days, 'PIGS_DELIVERED'))}`} />
            <KpiCard label="TC'd, producer resp." value={n(sum(days, 'TC_PRODUCER_RESP'))} note="Condemnation, 3rd party" />
            <KpiCard label="TC'd, factory resp." value={n(sum(days, 'TC_FACTORY_RESP'))} note="Condemnation, 1st party" tone="bad" />
          </div>
          <Card
            title="Kill by day"
            note="The producer/factory split of TC'd pigs uses the probable rule in research/kill-data.md. It is not confirmed. Killed Qty is not final on the kill day, so kill for a day is not below 0."
          >
            {days.length === 0 ? (
              <EmptyState title="No bookings this week" className="m-5" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead numeric>Bookings</TableHead>
                    <TableHead numeric>Delivered</TableHead>
                    <TableHead numeric>DOA</TableHead>
                    <TableHead numeric>DIP</TableHead>
                    <TableHead numeric>Casualty</TableHead>
                    <TableHead numeric>Over scale</TableHead>
                    <TableHead numeric>TC&apos;d producer</TableHead>
                    <TableHead numeric>TC&apos;d factory</TableHead>
                    <TableHead numeric>Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => (
                    <TableRow key={String(d.KILL_DATE)}>
                      <TableCell>{day(d.KILL_DATE)}</TableCell>
                      <TableCell numeric>{n(d.BOOKINGS)}</TableCell>
                      <TableCell numeric>{n(d.PIGS_DELIVERED)}</TableCell>
                      <TableCell numeric>{n(d.DOA)}</TableCell>
                      <TableCell numeric>{n(d.DIP)}</TableCell>
                      <TableCell numeric>{n(d.CASUALTY)}</TableCell>
                      <TableCell numeric>{n(d.KILLED_QTY)}</TableCell>
                      <TableCell numeric>{n(d.TC_PRODUCER_RESP)}</TableCell>
                      <TableCell numeric>{n(d.TC_FACTORY_RESP)}</TableCell>
                      <TableCell numeric className="font-semibold">{n(d.PIGS_KILLED)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Week</TableCell>
                    {['BOOKINGS', 'PIGS_DELIVERED', 'DOA', 'DIP', 'CASUALTY', 'KILLED_QTY', 'TC_PRODUCER_RESP', 'TC_FACTORY_RESP', 'PIGS_KILLED'].map((k) => (
                      <TableCell key={k} numeric>
                        {n(sum(days, k))}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </Card>
          <Card
            title="Kill by provenance"
            note="Provenance is the Hellenic super category. The labels are the Hellenic names, not Gui's grouping (RT, ODB, Free Range, GOS, Organic). Hellenic has no Red Tractor field, so the mapping needs Gui's answer. Detail only: this does not floor kill at 0 for a day. No day has ever needed the floor, so the split matches the kill above."
          >
            {types.length === 0 ? (
              <EmptyState title="No kill by provenance this week" className="m-5" />
            ) : (
              <Table striped>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provenance</TableHead>
                    <TableHead numeric>Over scale</TableHead>
                    <TableHead numeric>TC&apos;d producer</TableHead>
                    <TableHead numeric>TC&apos;d factory</TableHead>
                    <TableHead numeric>Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={String(t.SUPER_CATEGORY)}>
                      <TableCell>{String(t.SUPER_CATEGORY)}</TableCell>
                      <TableCell numeric>{n(t.KILLED_QTY)}</TableCell>
                      <TableCell numeric>{n(t.TC_PRODUCER_RESP)}</TableCell>
                      <TableCell numeric>{n(t.TC_FACTORY_RESP)}</TableCell>
                      <TableCell numeric className="font-semibold">{n(t.PIGS_KILLED)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Week</TableCell>
                    {['KILLED_QTY', 'TC_PRODUCER_RESP', 'TC_FACTORY_RESP', 'PIGS_KILLED'].map((k) => (
                      <TableCell key={k} numeric>
                        {n(sum(types, k))}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </Card>
        </>
      );
    }
  } catch (e) {
    console.error(new Date().toISOString(), '[kill] load failed', e);
    content = (
      <EmptyState variant="error" title="Kill did not load" description={e instanceof Error ? e.message : 'Unknown error'} />
    );
  }

  return (
    <>
      <FilterBar filters={filters} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{content}</main>
    </>
  );
}
