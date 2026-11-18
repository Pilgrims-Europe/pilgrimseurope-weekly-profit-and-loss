'use client';

import { LineSheet, statusText } from '@/components/pl-table';
import { RagBadge } from '@/components/rag-badge';
import { cn } from '@/lib/utils';
import type { Layout, PlLine, Week } from '@/lib/wpl';
import { formatPivot } from '@/lib/wpl-format';
import type { Show } from '@/lib/wpl-period';
import type { PivotRow } from '@/lib/wpl-pivot';
import { ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

/** Sales margin layout, as in Gui's sheet: these lines are bold, and the cost components are indented. */
const MARGIN_BOLD = new Set(['2060', '2160', '2210', '2230']);
const MARGIN_INDENT = new Set(['2110', '2120', '2130', '2140', '2150']);

const NO_DATA = 'No data. COPA actuals for the pilot sites start in the week of 21 Apr 2025.';

const isRatio = (l: PlLine) => !!l.RATIO_NUM;
const isSubtotal = (l: PlLine) => l.SOURCE_TYPE === 'Subtotal';
/** Red for a negative money, price or percentage value. Volume and head are not coloured. */
const redIfNegative = (v: number | null, unit: string) => v !== null && v < 0 && (unit === 'GBP' || unit === 'GBP/kg' || unit === '%');

function shortDate(weekStart: string) {
  return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function Cells({ r, sub }: { r: PivotRow; sub?: boolean }) {
  return (
    <>
      {r.cells.map((v, i) => {
        const st = r.cellStatus[i];
        return (
          <td
            key={i}
            title={st === 'No data' ? NO_DATA : undefined}
            className={cn(
              'px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap',
              sub && 'py-1 text-xs',
              redIfNegative(v, r.line.UNIT) && 'text-pe-red',
            )}
          >
            {formatPivot(v, r.line.UNIT)}
          </td>
        );
      })}
      <td
        className={cn(
          'border-l bg-muted/40 px-3 py-1.5 text-right font-semibold tabular-nums whitespace-nowrap',
          sub && 'py-1 text-xs font-normal',
          redIfNegative(r.total, r.line.UNIT) && 'text-pe-red',
        )}
      >
        {formatPivot(r.total, r.line.UNIT)}
      </td>
    </>
  );
}

/**
 * Week-by-week P&L: lines down the left, one column for each week of the period, and a period total.
 * Template layout: a row heads each line group, and subtotals are bold. Sales margin layout: no group rows,
 * the key lines are bold and the cost components are indented. Ratio lines are italic.
 * With All sites, a line expands to its sites. Click a line for its rule, source and RAG.
 */
export function PivotTable({
  rows,
  weeks,
  layout,
  weekStart,
  show,
}: {
  rows: PivotRow[];
  weeks: Week[];
  layout: Layout;
  weekStart: string;
  show: Show;
}) {
  const margin = layout === 'Sales margin';
  const [open, setOpen] = useState<PlLine | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups = useMemo(() => {
    const out: { group: string; rows: PivotRow[] }[] = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.group === r.line.LINE_GROUP) last.rows.push(r);
      else out.push({ group: r.line.LINE_GROUP, rows: [r] });
    }
    return out;
  }, [rows]);

  const expandable = rows.filter((r) => r.sites.length > 1);
  const cols = weeks.length + 3;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="pivot-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id="pivot-title" className="text-base font-semibold">
          {margin ? 'Sales margin' : 'Weekly P&L'} week by week
        </h2>
        <div className="flex flex-wrap items-baseline gap-3 text-sm text-muted-foreground">
          <span>
            Income +, cost −. {show === 'cumulative' ? 'Each week adds the weeks before it in the period.' : 'Each column is one week.'}{' '}
            Click a line for its rule.
          </span>
          {expandable.length > 0 && (
            <span className="no-print flex gap-2">
              <button
                type="button"
                className="font-semibold text-pe-brand hover:underline"
                onClick={() => setExpanded(new Set(expandable.map((r) => r.line.LINE_ID)))}
              >
                Expand all
              </button>
              <button type="button" className="font-semibold text-pe-brand hover:underline" onClick={() => setExpanded(new Set())}>
                Collapse all
              </button>
            </span>
          )}
        </div>
      </div>
      <div className="relative max-h-[75vh] w-full overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-[#00406e] text-white">
            <tr>
              <th className="pe-head sticky left-0 z-30 min-w-[15rem] bg-[#00406e] px-4 py-2 text-left font-normal">Line</th>
              <th className="pe-head px-2 py-2 text-left font-normal">RAG</th>
              {weeks.map((w) => (
                <th key={w.WEEK_START} className="pe-head px-2.5 py-2 text-right font-normal whitespace-nowrap">
                  <div>Wk {w.FISCAL_WEEK}</div>
                  <div className="text-[11px] font-normal text-white/70">{shortDate(w.WEEK_START)}</div>
                </th>
              ))}
              <th className="pe-head border-l border-white/30 px-3 py-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.group}>
                {!margin && (
                  <tr className="bg-pe-tint-brand">
                    <td className="pe-head sticky left-0 z-10 bg-pe-tint-brand px-4 py-1.5 text-pe-brand">{g.group}</td>
                    <td colSpan={cols - 1} />
                  </tr>
                )}
                {g.rows.map((r) => {
                  const l = r.line;
                  const ratio = isRatio(l);
                  const bold = margin ? MARGIN_BOLD.has(l.LINE_ID) : isSubtotal(l) && !ratio;
                  const indent = margin ? MARGIN_INDENT.has(l.LINE_ID) : !isSubtotal(l);
                  const muted = r.status !== 'Built' && !isSubtotal(l);
                  const st = r.status === 'Built' || isSubtotal(l) ? null : statusText({ STATUS: r.status });
                  const isOpen = expanded.has(l.LINE_ID);
                  return (
                    <Fragment key={l.LINE_ID}>
                      <tr
                        onClick={() => setOpen(l)}
                        className={cn(
                          'group cursor-pointer transition-colors hover:bg-muted/50 [&>td]:border-b',
                          bold && 'font-semibold',
                          bold && !margin && 'bg-muted/30',
                          ratio && 'italic text-muted-foreground',
                          muted && 'text-muted-foreground',
                        )}
                      >
                        <td
                          className={cn(
                            'sticky left-0 z-10 bg-card px-4 py-1.5 group-hover:bg-muted',
                            indent && 'pl-8',
                            bold && !margin && 'bg-muted',
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {r.sites.length > 1 ? (
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${l.LINE_NAME}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggle(l.LINE_ID);
                                }}
                                className="no-print -ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded not-italic hover:bg-muted"
                              >
                                <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                              </button>
                            ) : (
                              <span className="inline-block h-5 w-5 shrink-0" />
                            )}
                            <span className="whitespace-nowrap">{l.LINE_NAME}</span>
                          </span>
                          {st && <span className="ml-2 text-xs font-normal italic">{st}</span>}
                          {isSubtotal(l) && !ratio && r.missing > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">excl. {r.missing} not built</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 not-italic">{isSubtotal(l) ? null : <RagBadge rag={l.RAG} />}</td>
                        <Cells r={r} />
                      </tr>
                      {isOpen &&
                        r.sites.map((s) => (
                          <tr
                            key={`${l.LINE_ID}:${s.line.SITE}`}
                            onClick={() => setOpen(s.line)}
                            className="group cursor-pointer bg-muted/15 text-muted-foreground transition-colors hover:bg-muted/50 [&>td]:border-b"
                          >
                            <td className="sticky left-0 z-10 bg-card py-1 pr-4 pl-14 text-xs group-hover:bg-muted">{s.line.SITE}</td>
                            <td />
                            <Cells r={s} sub />
                          </tr>
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
