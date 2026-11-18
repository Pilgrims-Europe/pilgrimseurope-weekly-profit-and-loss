'use client';

import { RagBadge } from '@/components/rag-badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { REPO_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { LineDetail, PlLine } from '@/lib/wpl';
import { formatUnit, isRunRate, ticketUrl, toNumber } from '@/lib/wpl-format';
import { ALL_SITES, components, type PlNode } from '@/lib/wpl-rollup';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Fragment, type ReactNode, useMemo, useState } from 'react';

const slug = (s: string) => `group-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const SITE_KIND: Record<string, string> = { PILOT: 'Pilot site', POULTRY_KILL: 'Poultry kill site', PORK_KILL: 'Pork kill site' };

/** Status text under a value that is not a number. */
export function statusText(l: Pick<PlLine, 'STATUS'>): string | null {
  if (l.STATUS === 'Not built') return 'Manual, not built';
  if (l.STATUS === 'Empty') return 'Rule Unknown, empty';
  if (l.STATUS === 'Not a kill site') return 'Pilot site does not kill';
  if (l.STATUS === 'No data') return 'No data this week';
  return null;
}

function change(l: Pick<PlLine, 'VALUE' | 'PREV_VALUE'>): number | null {
  const a = toNumber(l.VALUE);
  const b = toNumber(l.PREV_VALUE);
  return a === null || b === null ? null : a - b;
}

const isSubtotal = (l: PlLine) => l.SOURCE_TYPE === 'Subtotal';
const isKill = (l: PlLine) => l.LINE_ID === '10' || l.LINE_ID === '20';
const isGl = (l: PlLine) => !!l.SOURCE_SYSTEM?.includes('GL') || l.LINE_GROUP === 'Overheads';

/** A site row has detail below it: the component lines of a subtotal, the kill build-up, or GL accounts. */
function hasDetail(l: PlLine): boolean {
  if (isSubtotal(l)) return !!(l.COMPONENTS || l.RATIO_NUM);
  return l.STATUS === 'Built' && (isKill(l) || isGl(l));
}

/** This week, last week and change cells. Last week and change are blank when `prev` is false. */
function ValueCells({ l, prev = true }: { l: Pick<PlLine, 'VALUE' | 'PREV_VALUE' | 'UNIT' | 'STATUS'>; prev?: boolean }) {
  const st = statusText(l);
  const ch = prev ? change(l) : null;
  return (
    <>
      <td
        className={cn(
          'px-4 py-2 text-right tabular-nums whitespace-nowrap',
          (toNumber(l.VALUE) ?? 0) < 0 && l.UNIT !== 'head' && l.UNIT !== 't' && 'text-pe-red',
        )}
      >
        {st ? <span className="text-xs italic">{st}</span> : formatUnit(l.VALUE, l.UNIT)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">
        {st || !prev ? '' : formatUnit(l.PREV_VALUE, l.UNIT)}
      </td>
      <td
        className={cn(
          'px-4 py-2 text-right tabular-nums whitespace-nowrap',
          ch !== null && ch < 0 && l.UNIT === 'GBP' && 'text-pe-red',
          ch !== null && ch > 0 && l.UNIT === 'GBP' && 'text-pe-green',
        )}
      >
        {st || ch === null ? '' : formatUnit(ch, l.UNIT)}
      </td>
    </>
  );
}

function Toggle({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="no-print -ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
    >
      <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
    </button>
  );
}

/** Keeps the line text in line with rows that have a toggle. */
const Spacer = () => <span className="inline-block h-6 w-6 shrink-0" />;

/**
 * The weekly P&L statement in template order. Group rows head each section; subtotal rows are bold.
 * With All sites, each line expands to its sites, and each site to the items behind its figure:
 * component lines for a subtotal, the kill build-up for kill, or GL accounts.
 * With one site, each line expands straight to its items. Click a row for its rule and source.
 */
export function PlTable({ lines, site, weekStart }: { lines: PlNode[]; site: string; weekStart: string }) {
  const single = site !== ALL_SITES;
  const [open, setOpen] = useState<PlLine | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const { groups, names, bySite } = useMemo(() => {
    const groups: { group: string; lines: PlNode[] }[] = [];
    for (const l of lines) {
      const last = groups[groups.length - 1];
      if (last && last.group === l.LINE_GROUP) last.lines.push(l);
      else groups.push({ group: l.LINE_GROUP, lines: [l] });
    }
    const names = new Map(lines.map((l) => [l.LINE_ID, l.LINE_NAME]));
    const bySite = new Map<string, Map<string, PlLine>>();
    for (const l of lines)
      for (const s of l.SITES) {
        if (!bySite.has(s.SITE)) bySite.set(s.SITE, new Map());
        bySite.get(s.SITE)?.set(s.LINE_ID, s);
      }
    return { groups, names, bySite };
  }, [lines]);

  const canExpand = (n: PlNode) =>
    single
      ? n.SITES.length === 1 && hasDetail(n.SITES[0])
      : n.SITES.length > 0 && n.STATUS !== 'Not built' && n.STATUS !== 'Empty';
  const expandable = lines.filter(canExpand);

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="statement-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id="statement-title" className="text-base font-semibold">
          Weekly P&amp;L statement
        </h2>
        <div className="flex flex-wrap items-baseline gap-3 text-sm text-muted-foreground">
          <span>Income +, cost −. Click ▸ to expand{single ? '' : ' to sites'}. Click a line for its rule.</span>
          <span className="no-print flex gap-2">
            <button
              type="button"
              className="font-semibold text-pe-brand hover:underline"
              onClick={() => setExpanded(new Set(expandable.map((n) => `L:${n.LINE_ID}`)))}
            >
              Expand all
            </button>
            <button type="button" className="font-semibold text-pe-brand hover:underline" onClick={() => setExpanded(new Set())}>
              Collapse all
            </button>
          </span>
        </div>
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
                {g.lines.map((n) => {
                  const sub = isSubtotal(n);
                  const muted = n.STATUS !== 'Built' && !sub;
                  const missing = toNumber(n.MISSING_COMPONENTS) ?? 0;
                  const key = `L:${n.LINE_ID}`;
                  const isOpen = expanded.has(key);
                  return (
                    <Fragment key={n.LINE_ID}>
                      <tr
                        onClick={() => setOpen(n)}
                        className={cn(
                          'cursor-pointer border-b transition-colors hover:bg-muted/50',
                          sub && 'bg-muted/30 font-semibold',
                          muted && 'text-muted-foreground',
                        )}
                      >
                        <td className={cn('px-4 py-2', !sub && 'pl-6')}>
                          <span className="inline-flex items-center gap-1">
                            {canExpand(n) ? <Toggle open={isOpen} onClick={() => toggle(key)} label={n.LINE_NAME} /> : <Spacer />}
                            {n.LINE_NAME}
                          </span>
                          {sub && missing > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">excl. {missing} not built</span>
                          )}
                        </td>
                        <ValueCells l={n} />
                        <td className="px-4 py-2">{sub ? null : <RagBadge rag={n.RAG} />}</td>
                        <td className="hidden max-w-[18rem] truncate px-4 py-2 text-muted-foreground md:table-cell">
                          {n.SOURCE_SYSTEM ?? (sub ? 'Formula' : '')}
                        </td>
                      </tr>
                      {isOpen &&
                        (single ? (
                          <DetailRows
                            line={n.SITES[0]}
                            depth={1}
                            weekStart={weekStart}
                            siteRows={bySite.get(n.SITES[0].SITE) ?? new Map()}
                            names={names}
                            onOpen={setOpen}
                          />
                        ) : (
                          n.SITES.map((s) => {
                            const skey = `S:${n.LINE_ID}:${s.SITE}`;
                            const sOpen = expanded.has(skey);
                            return (
                              <Fragment key={skey}>
                                <tr
                                  onClick={() => setOpen(s)}
                                  className="cursor-pointer border-b bg-muted/15 transition-colors hover:bg-muted/50"
                                >
                                  <td className="py-1.5 pr-4 pl-12">
                                    <span className="inline-flex items-center gap-1">
                                      {hasDetail(s) ? (
                                        <Toggle open={sOpen} onClick={() => toggle(skey)} label={`${n.LINE_NAME}, ${s.SITE}`} />
                                      ) : (
                                        <Spacer />
                                      )}
                                      {s.SITE}
                                    </span>
                                  </td>
                                  <ValueCells l={s} />
                                  <td />
                                  <td className="hidden px-4 py-1.5 text-muted-foreground md:table-cell">
                                    {SITE_KIND[s.SITE_KIND] ?? s.SITE_KIND}
                                  </td>
                                </tr>
                                {sOpen && (
                                  <DetailRows
                                    line={s}
                                    depth={2}
                                    weekStart={weekStart}
                                    siteRows={bySite.get(s.SITE) ?? new Map()}
                                    names={names}
                                    onOpen={setOpen}
                                  />
                                )}
                              </Fragment>
                            );
                          })
                        ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <LineSheet line={open} weekStart={weekStart} onClose={() => setOpen(null)} />
    </section>
  );
}

const INDENT = { 1: 'pl-14', 2: 'pl-20' } as const;

/** The items behind one site's figure: component lines (from the loaded data) or fetched detail. */
function DetailRows({
  line,
  depth,
  weekStart,
  siteRows,
  names,
  onOpen,
}: {
  line: PlLine;
  depth: 1 | 2;
  weekStart: string;
  siteRows: Map<string, PlLine>;
  names: Map<string, string>;
  onOpen: (l: PlLine) => void;
}) {
  if (isSubtotal(line)) {
    const parts = components(line, siteRows, names);
    return (
      <>
        <NoteRow depth={depth}>
          {line.RATIO_NUM ? 'Numerator, then denominator.' : `The ${parts.length} lines added to make this total.`}
        </NoteRow>
        {parts.map((c) => (
          <tr
            key={c.LINE_ID}
            onClick={() => c.ROW && onOpen(c.ROW)}
            className={cn('cursor-pointer border-b text-xs transition-colors hover:bg-muted/50', c.ROW?.STATUS !== 'Built' && 'text-muted-foreground')}
          >
            <td className={cn('py-1 pr-4', INDENT[depth])}>
              {c.SIGN < 0 ? 'Less ' : ''}
              {c.LINE_NAME}
            </td>
            {c.ROW ? <ValueCells l={c.ROW} /> : <td colSpan={3} />}
            <td className="px-4 py-1">{c.ROW && !isSubtotal(c.ROW) ? <RagBadge rag={c.ROW.RAG} /> : null}</td>
            <td className="hidden max-w-[18rem] truncate px-4 py-1 text-muted-foreground md:table-cell">
              {c.ROW?.SOURCE_SYSTEM ?? ''}
            </td>
          </tr>
        ))}
      </>
    );
  }
  return <FetchedDetail line={line} depth={depth} weekStart={weekStart} />;
}

function NoteRow({ depth, children }: { depth: 1 | 2; children: ReactNode }) {
  return (
    <tr className="border-b">
      <td colSpan={6} className={cn('py-1 pr-4 text-xs italic text-muted-foreground', INDENT[depth])}>
        {children}
      </td>
    </tr>
  );
}

function FetchedDetail({ line, depth, weekStart }: { line: PlLine; depth: 1 | 2; weekStart: string }) {
  const q = useQuery({
    queryKey: ['line-detail', line.SITE, weekStart, line.LINE_ID],
    queryFn: async () => {
      const r = await fetch(
        `/api/line-detail?site=${encodeURIComponent(line.SITE)}&week=${encodeURIComponent(weekStart)}&line=${line.LINE_ID}`,
      );
      if (!r.ok) throw new Error((await r.json()).error ?? 'Request failed');
      return (await r.json()) as LineDetail;
    },
  });
  if (q.isPending)
    return (
      <tr className="border-b">
        <td colSpan={6} className={cn('py-2 pr-4', INDENT[depth])}>
          <Skeleton className="h-5 w-64" />
        </td>
      </tr>
    );
  if (q.isError)
    return (
      <tr className="border-b">
        <td colSpan={6} className={cn('py-1 pr-4 text-xs text-pe-red', INDENT[depth])}>
          {(q.error as Error).message}
        </td>
      </tr>
    );
  return (
    <>
      <NoteRow depth={depth}>
        {q.data.note}
        {isKill(line) && (
          <>
            {' '}
            <Link
              href={`/kill?site=${encodeURIComponent(line.SITE)}&week=${weekStart}`}
              className="not-italic font-semibold text-pe-brand hover:underline"
            >
              See kill by day
            </Link>
          </>
        )}
      </NoteRow>
      {q.data.items.map((i) => (
        <tr key={`${i.LABEL}-${i.SUBLABEL}`} className="border-b text-xs">
          <td className={cn('py-1 pr-4', INDENT[depth])}>
            <span className={cn(i.UNIT === 'GBP' && /^\d+$/.test(i.LABEL) && 'font-mono')}>{i.LABEL}</span>
          </td>
          <td className={cn('px-4 py-1 text-right tabular-nums whitespace-nowrap', (i.VALUE ?? 0) < 0 && i.UNIT === 'GBP' && 'text-pe-red')}>
            {formatUnit(i.VALUE, i.UNIT)}
          </td>
          <td colSpan={3} />
          <td className="hidden max-w-[18rem] truncate px-4 py-1 text-muted-foreground md:table-cell">{i.SUBLABEL}</td>
        </tr>
      ))}
    </>
  );
}

interface Account {
  GLACCOUNT: string;
  ACCOUNTNAME: string | null;
  LINE_ITEMS: string;
  VALUE: string;
}

export function LineSheet({ line, weekStart, onClose }: { line: PlLine | null; weekStart: string; onClose: () => void }) {
  // A rolled-up line (All sites) has no single site: its GL accounts are in the expanded rows.
  const site = line && line.SITE !== ALL_SITES ? line.SITE : null;
  const gl = !!line && isGl(line);
  const accounts = useQuery({
    queryKey: ['line-accounts', site, weekStart, line?.LINE_ID],
    enabled: !!line && !!site && gl && line.STATUS === 'Built',
    queryFn: async () => {
      const r = await fetch(
        `/api/line-accounts?site=${encodeURIComponent(site ?? '')}&week=${encodeURIComponent(weekStart)}&line=${line?.LINE_ID}`,
      );
      if (!r.ok) throw new Error((await r.json()).error ?? 'Request failed');
      return (await r.json()) as Account[];
    },
  });
  const ticket = ticketUrl(REPO_URL, line?.TICKET);
  const overhead = isRunRate(line);

  return (
    <Sheet open={!!line} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {line && (
          <div className="space-y-5">
            <SheetHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{line.LINE_GROUP}</p>
              <SheetTitle className="text-xl">{line.LINE_NAME}</SheetTitle>
              <SheetDescription>
                {line.SITE} · {formatUnit(line.VALUE, line.UNIT)}
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
            {isKill(line) && (
              <Link
                href={site ? `/kill?site=${encodeURIComponent(site)}&week=${weekStart}` : `/kill?week=${weekStart}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-pe-brand hover:underline"
              >
                See kill by day and condemnation code <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href={`/trend?${site ? `site=${encodeURIComponent(site)}&` : ''}week=${weekStart}&line=${line.LINE_ID}`}
              className="flex items-center gap-1 text-sm font-semibold text-pe-brand hover:underline"
            >
              See this line over 13 weeks <ChevronRight className="h-4 w-4" />
            </Link>
            {gl && line.STATUS === 'Built' && !site && (
              <p className="text-sm text-muted-foreground">Expand the line in the statement to see the GL accounts of each site.</p>
            )}
            {gl && line.STATUS === 'Built' && site && (
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
