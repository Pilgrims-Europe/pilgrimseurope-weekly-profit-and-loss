/**
 * Sales margin filters (customer, category, business unit, material). Pure functions, safe in server and client code.
 * The filtered leaf values come from WPL_T_SALES_DETAIL. Subtotals and ratios are worked out again here,
 * with the same rules as WPL_WEEKLY_PL: a subtotal adds its components, a ratio is num / (den x scale).
 */
import type { PlWeekLine } from '@/lib/wpl';
import { toNumber } from '@/lib/wpl-format';

/** URL parameter for each filter. Each parameter can repeat: ?cust=1&cust=2. */
export const SALES_FILTERS = [
  { param: 'cust', label: 'Customer' },
  { param: 'cat', label: 'Category' },
  { param: 'bu', label: 'Business unit' },
  { param: 'mat', label: 'Material' },
] as const;

export type SalesFilterParam = (typeof SALES_FILTERS)[number]['param'];
export type SalesFilter = Record<SalesFilterParam, string[]>;

/** Read the filters from the page search parameters. Values are trimmed; empty values are dropped. */
export function toSalesFilter(params: Record<string, string | string[] | undefined>): SalesFilter {
  const list = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v === undefined ? [] : [v]).map((s) => s.trim()).filter(Boolean);
  return { cust: list(params.cust), cat: list(params.cat), bu: list(params.bu), mat: list(params.mat) };
}

export function isFiltered(f: SalesFilter): boolean {
  return SALES_FILTERS.some((d) => f[d.param].length > 0);
}

export interface LeafValue {
  SITE: string;
  WEEK_START: string;
  LINE_ID: string;
  VALUE: string | number | null;
}

/**
 * Put filtered leaf values in the rows, then work out the subtotals and ratios again for each site and week.
 * A built leaf line with no filtered sales gets 0. Lines with another status (No data) keep no value.
 */
export function applyFilteredValues(rows: PlWeekLine[], values: LeafValue[]): PlWeekLine[] {
  const key = (site: string, week: string, id: string) => `${site}|${week}|${id}`;
  const leaf = new Map(values.map((v) => [key(v.SITE, v.WEEK_START, String(v.LINE_ID)), toNumber(v.VALUE)]));
  const out = rows.map((r) => {
    if (r.SOURCE_TYPE === 'Subtotal' || r.STATUS !== 'Built') return { ...r };
    return { ...r, VALUE: String(leaf.get(key(r.SITE, r.WEEK_START, r.LINE_ID)) ?? 0) };
  });
  const byKey = new Map(out.map((r) => [key(r.SITE, r.WEEK_START, r.LINE_ID), r]));
  const value = (r: PlWeekLine, id: string) => toNumber(byKey.get(key(r.SITE, r.WEEK_START, id))?.VALUE);

  // Subtotals first (they only add leaf lines), then ratios (they can divide subtotals).
  for (const r of out) {
    if (r.SOURCE_TYPE !== 'Subtotal' || !r.COMPONENTS) continue;
    const parts = r.COMPONENTS.split(' ').filter(Boolean);
    const vals = parts.map((c) => {
      const v = value(r, c.replace(/^-/, ''));
      return v === null ? null : c.startsWith('-') ? -v : v;
    });
    const known = vals.filter((v): v is number => v !== null);
    r.VALUE = known.length ? String(known.reduce((a, b) => a + b, 0)) : null;
    r.MISSING_COMPONENTS = String(vals.length - known.length);
  }
  for (const r of out) {
    if (!r.RATIO_NUM || !r.RATIO_DEN) continue;
    const num = value(r, r.RATIO_NUM);
    const den = value(r, r.RATIO_DEN);
    const s = toNumber(r.RATIO_SCALE) ?? 1;
    r.VALUE = num === null || den === null || den * s === 0 ? null : String(num / (den * s));
  }
  return out;
}
