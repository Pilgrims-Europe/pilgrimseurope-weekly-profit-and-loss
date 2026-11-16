'use client';

import { RagBadge } from '@/components/rag-badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { REPO_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { PlLine } from '@/lib/wpl';
import { formatUnit, ticketUrl, toNumber } from '@/lib/wpl-format';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';

const slug = (s: string) => `group-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

/** Status text under a value that is not a number. */
function statusText(l: PlLine): string | null {
  if (l.STATUS === 'Not built') return 'Manual, not built';
  if (l.STATUS === 'Empty') return 'Rule Unknown, empty';
  if (l.STATUS === 'Not a kill site') return 'Pilot site does not kill';
  return null;
}

function change(l: PlLine): number | null {
  const a = toNumber(l.VALUE);
  const b = toNumber(l.PREV_VALUE);
  return a === null || b === null ? null : a - b;
}

/**
 * The weekly P&L statement in template order. Group rows head each section; subtotal rows are bold.
 * Click a line to open its detail: rule, reason for the RAG, ticket, and the GL accounts behind it.
 */
export function PlTable({ lines, site, weekStart }: { lines: PlLine[]; site: string; weekStart: string }) {
  const [open, setOpen] = useState<PlLine | null>(null);
  const groups = useMemo(() => {
    const out: { group: string; lines: PlLine[] }[] = [];
    for (const l of lines) {
      const last = out[out.length - 1];
      if (last && last.group === l.LINE_GROUP) last.lines.push(l);
      else out.push({ group: l.LINE_GROUP, lines: [l] });
    }
    return out;
  }, [lines]);

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="statement-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id="statement-title" className="text-base font-semibold">
          Weekly P&amp;L statement
        </h2>
        <p className="text-sm text-muted-foreground">Income +, cost −. Click a line for its rule and source.</p>
      </div>
      <div className="relative w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#00406e] text-white">
            <tr>
              <th className="pe-head px-4 py-2.5 text-left font-normal">Line</th>
              <th className="pe-head px-4 py-2.5 text-right font-normal">This week</th>
              <th className="pe-head px-4 py-2.5 text-right font-normal">Last week</th>
              <th className="pe-head px-4 py-2.5 text-right font-normal">Change</th>
              <th className="pe-head px-4 py-2.5 text-left font-normal">RAG</th>
              <th className="pe-head hidden px-4 py-2.5 text-left font-normal md:table-cell">Source</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.group}>
                <tr id={slug(g.group)} className="scroll-mt-24 bg-pe-tint-brand">
                  <td colSpan={6} className="pe-head px-4 py-2 text-pe-brand">
                    {g.group}
                  </td>
                </tr>
                {g.lines.map((l) => {
                  const sub = l.SOURCE_TYPE === 'Subtotal';
                  const muted = l.STATUS !== 'Built' && !sub;
                  const st = statusText(l);
                  const missing = toNumber(l.MISSING_COMPONENTS) ?? 0;
                  const ch = change(l);
                  return (
                    <tr
                      key={l.LINE_ID}
                      onClick={() => setOpen(l)}
                      className={cn(
                        'cursor-pointer border-b transition-colors hover:bg-muted/50',
                        sub && 'bg-muted/30 font-semibold',
                        muted && 'text-muted-foreground',
                      )}
                    >
                      <td className={cn('px-4 py-2', !sub && 'pl-7')}>
                        <span className="inline-flex items-center gap-1">
                          {l.LINE_NAME}
                          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                        </span>
                        {sub && missing > 0 && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            excl. {missing} not built
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right tabular-nums whitespace-nowrap',
                          (toNumber(l.VALUE) ?? 0) < 0 && l.UNIT !== 'head' && l.UNIT !== 't' && 'text-pe-red',
                        )}
                      >
                        {st ? <span className="text-xs italic">{st}</span> : formatUnit(l.VALUE, l.UNIT)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        {st ? '' : formatUnit(l.PREV_VALUE, l.UNIT)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right tabular-nums whitespace-nowrap',
                          ch !== null && ch < 0 && l.UNIT === 'GBP' && 'text-pe-red',
                          ch !== null && ch > 0 && l.UNIT === 'GBP' && 'text-pe-green',
                        )}
                      >
                        {st || ch === null ? '' : formatUnit(ch, l.UNIT === '%' ? '%' : l.UNIT)}
                      </td>
                      <td className="px-4 py-2">{sub ? null : <RagBadge rag={l.RAG} />}</td>
                      <td className="hidden max-w-[18rem] truncate px-4 py-2 text-muted-foreground md:table-cell">
                        {l.SOURCE_SYSTEM ?? (sub ? 'Formula' : '')}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <LineSheet line={open} site={site} weekStart={weekStart} onClose={() => setOpen(null)} />
    </section>
  );
}

interface Account {
  GLACCOUNT: string;
  ACCOUNTNAME: string | null;
  LINE_ITEMS: string;
  VALUE: string;
}

function LineSheet({
  line,
  site,
  weekStart,
  onClose,
}: {
  line: PlLine | null;
  site: string;
  weekStart: string;
  onClose: () => void;
}) {
  const isGl = !!line?.SOURCE_SYSTEM?.includes('GL') || line?.LINE_GROUP === 'Overheads';
  const accounts = useQuery({
    queryKey: ['line-accounts', site, weekStart, line?.LINE_ID],
    enabled: !!line && isGl && line.STATUS === 'Built',
    queryFn: async () => {
      const r = await fetch(
        `/api/line-accounts?site=${encodeURIComponent(site)}&week=${encodeURIComponent(weekStart)}&line=${line?.LINE_ID}`,
      );
      if (!r.ok) throw new Error((await r.json()).error ?? 'Request failed');
      return (await r.json()) as Account[];
    },
  });
  const ticket = ticketUrl(REPO_URL, line?.TICKET);
  const overhead = line?.LINE_GROUP === 'Overheads' && line.SOURCE_TYPE !== 'Subtotal';

  return (
    <Sheet open={!!line} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {line && (
          <div className="space-y-5">
            <SheetHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{line.LINE_GROUP}</p>
              <SheetTitle className="text-xl">{line.LINE_NAME}</SheetTitle>
              <SheetDescription>
                {site} · {formatUnit(line.VALUE, line.UNIT)}
                {line.UNIT ? ` (${line.UNIT})` : ''}
              </SheetDescription>
            </SheetHeader>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">RAG</dt>
              <dd>{line.SOURCE_TYPE === 'Subtotal' ? 'Subtotal (no RAG)' : <RagBadge rag={line.RAG} />}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{line.STATUS}</dd>
              <dt className="text-muted-foreground">Source type</dt>
              <dd>{line.SOURCE_TYPE}</dd>
              {line.SOURCE_SYSTEM && (
                <>
                  <dt className="text-muted-foreground">System</dt>
                  <dd>{line.SOURCE_SYSTEM}</dd>
                </>
              )}
              {line.REASON && (
                <>
                  <dt className="text-muted-foreground">Why this RAG</dt>
                  <dd>{line.REASON}</dd>
                </>
              )}
              {line.RULE && (
                <>
                  <dt className="text-muted-foreground">Rule used</dt>
                  <dd>{line.RULE}</dd>
                </>
              )}
              {ticket && (
                <>
                  <dt className="text-muted-foreground">Open ticket</dt>
                  <dd>
                    <a href={ticket} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pe-brand hover:underline">
                      {line.TICKET} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </dd>
                </>
              )}
              {overhead && (
                <>
                  <dt className="text-muted-foreground">Actual this week</dt>
                  <dd className="tabular-nums">{formatUnit(line.ACTUAL_VALUE, 'GBP')} (the run rate is shown in the P&amp;L)</dd>
                </>
              )}
              {line.SOURCE_TYPE === 'Subtotal' && (toNumber(line.MISSING_COMPONENTS) ?? 0) > 0 && (
                <>
                  <dt className="text-muted-foreground">Not included</dt>
                  <dd>{line.MISSING_COMPONENTS} component lines are Red or empty. They are not in this total.</dd>
                </>
              )}
            </dl>
            {(line.LINE_ID === '10' || line.LINE_ID === '20') && (
              <Link href="/kill" className="inline-flex items-center gap-1 text-sm font-semibold text-pe-brand hover:underline">
                See kill by day and condemnation code <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href={`/trend?site=${encodeURIComponent(site)}&week=${weekStart}&line=${line.LINE_ID}`}
              className="flex items-center gap-1 text-sm font-semibold text-pe-brand hover:underline"
            >
              See this line over 13 weeks <ChevronRight className="h-4 w-4" />
            </Link>
            {isGl && line.STATUS === 'Built' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  GL accounts this week{overhead ? ' (actual, not run rate)' : ''}
                </h3>
                {accounts.isPending ? (
                  <Skeleton className="h-24 w-full" />
                ) : accounts.isError ? (
                  <p className="text-sm text-pe-red">{(accounts.error as Error).message}</p>
                ) : accounts.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No postings this week.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-1 text-left font-medium">Account</th>
                        <th className="py-1 text-right font-medium">Lines</th>
                        <th className="py-1 text-right font-medium">£</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.data.map((a) => (
                        <tr key={a.GLACCOUNT} className="border-t">
                          <td className="py-1.5 pr-2">
                            <div className="font-mono text-xs">{a.GLACCOUNT.replace(/^0+/, '')}</div>
                            <div className="text-xs text-muted-foreground">{a.ACCOUNTNAME ?? 'Unknown'}</div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{formatUnit(a.LINE_ITEMS, 'head')}</td>
                          <td className={cn('py-1.5 text-right tabular-nums', Number(a.VALUE) < 0 && 'text-pe-red')}>
                            {formatUnit(a.VALUE, 'GBP')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
