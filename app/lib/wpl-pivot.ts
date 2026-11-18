/**
 * Pivot the P&L rows of a period into one row for each line, with one cell for each week and a period total.
 * Pure functions, safe in server and client code.
 *
 * Weekly cells are the week's value. Cumulative cells add the weeks from the start of the period.
 * The total adds all the weeks. Ratio lines (price per kg, %) are not added: they divide the added
 * numerator by the added denominator, so a total ratio is the ratio of the totals.
 */
import type { PlLine, PlWeekLine } from '@/lib/wpl';
import type { Show } from '@/lib/wpl-period';
import { toNumber } from '@/lib/wpl-format';
import { appliesToSite, rollUp } from '@/lib/wpl-rollup';

export interface PivotRow {
  /** The line, from the last week of the period (rolled up when there is more than one site). */
  line: PlLine;
  /** One value for each week, in the order of the weeks. */
  cells: (number | null)[];
  /** The status of each cell: Built, Subtotal, No data, Not built, Empty. */
  cellStatus: string[];
  total: number | null;
  /** Built when one week is built, else the status of the last week. */
  status: string;
  /** The largest count of components with no value, in any week. */
  missing: number;
  /** Site rows behind the line. Empty for a site row, or when one site is selected. */
  sites: PivotRow[];
}

type WeekMap = Map<string, PlLine>;

function sum(ns: (number | null)[]): number | null {
  const v = ns.filter((n): n is number => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
}

function ratio(num: number | null, den: number | null, scale: string | null): number | null {
  const s = toNumber(scale) ?? 1;
  return num === null || den === null || den * s === 0 ? null : num / (den * s);
}

/** Running sums: each cell adds the weeks up to it. Null until the first week with a value. */
function running(ns: (number | null)[]): (number | null)[] {
  let acc: number | null = null;
  return ns.map((n) => {
    if (n !== null) acc = (acc ?? 0) + n;
    return acc;
  });
}

/**
 * Rows for one set of week maps (all sites rolled up, or one site). `byWeek[i]` maps LINE_ID to the line
 * in week i. `ids` gives the line order.
 */
function build(byWeek: WeekMap[], ids: string[], show: Show): Map<string, PivotRow> {
  const out = new Map<string, PivotRow>();
  const weekly = new Map<string, (number | null)[]>();
  for (const id of ids) weekly.set(id, byWeek.map((m) => toNumber(m.get(id)?.VALUE)));

  for (const id of ids) {
    const lines = byWeek.map((m) => m.get(id));
    const last = [...lines].reverse().find((l): l is PlLine => !!l);
    if (!last) continue;
    const cellStatus = lines.map((l) => l?.STATUS ?? 'No data');
    let cells = weekly.get(id) ?? [];
    let total: number | null;
    if (last.RATIO_NUM && last.RATIO_DEN) {
      const num = weekly.get(last.RATIO_NUM) ?? [];
      const den = weekly.get(last.RATIO_DEN) ?? [];
      total = ratio(sum(num), sum(den), last.RATIO_SCALE);
      if (show === 'cumulative') {
        const rn = running(num);
        const rd = running(den);
        cells = rn.map((n, i) => ratio(n, rd[i], last.RATIO_SCALE));
      }
    } else {
      total = sum(cells);
      if (show === 'cumulative') cells = running(cells);
    }
    const missing = Math.max(0, ...lines.map((l) => toNumber(l?.MISSING_COMPONENTS) ?? 0));
    out.set(id, {
      line: last,
      cells,
      cellStatus,
      total,
      status: cellStatus.includes('Built') ? 'Built' : last.STATUS,
      missing,
      sites: [],
    });
  }
  return out;
}

/**
 * One row for each line, in template order. `weeks` are the week start dates of the period, oldest first.
 * With more than one site in `rows`, each row holds its site rows (sites where the line applies).
 */
export function pivot(rows: PlWeekLine[], weeks: string[], show: Show): PivotRow[] {
  const perWeek = new Map<string, PlWeekLine[]>(weeks.map((w) => [w, []]));
  for (const r of rows) perWeek.get(r.WEEK_START)?.push(r);
  const ids = [...new Set(rows.map((r) => r.LINE_ID))].sort((a, b) => Number(a) - Number(b));

  const rolled = weeks.map((w) => new Map<string, PlLine>(rollUp(perWeek.get(w) ?? []).map((n) => [n.LINE_ID, n])));
  const result = build(rolled, ids, show);

  const sites = [...new Set(rows.map((r) => r.SITE))];
  if (sites.length > 1) {
    const bySite = new Map<string, Map<string, PivotRow>>();
    for (const s of sites) {
      const maps = weeks.map(
        (w) => new Map<string, PlLine>((perWeek.get(w) ?? []).filter((r) => r.SITE === s).map((r) => [r.LINE_ID, r])),
      );
      bySite.set(s, build(maps, ids, show));
    }
    for (const [id, row] of result) {
      row.sites = sites
        .map((s) => bySite.get(s)?.get(id))
        .filter((r): r is PivotRow => !!r && appliesToSite(r.line));
    }
  }
  return ids.map((id) => result.get(id)).filter((r): r is PivotRow => !!r);
}
