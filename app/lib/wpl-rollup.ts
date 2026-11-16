/**
 * Roll the per-site P&L rows up to one row for each template line. Pure functions, safe in server and client code.
 * Each rolled-up line keeps its site rows as children, so the P&L table can expand line > site > detail.
 */
import type { PlLine } from '@/lib/wpl';
import { toNumber } from '@/lib/wpl-format';

export const ALL_SITES = 'All sites';

export interface PlNode extends PlLine {
  /** Site rows behind this line (sites where the line applies). One row when a single site is selected. */
  SITES: PlLine[];
}

function sum(values: (string | null)[]): number | null {
  const ns = values.map(toNumber).filter((n): n is number => n !== null);
  return ns.length === 0 ? null : ns.reduce((a, b) => a + b, 0);
}

function str(n: number | null): string | null {
  return n === null ? null : String(n);
}

function ratio(num: number | null, den: number | null, scale: string | null): number | null {
  const s = toNumber(scale) ?? 1;
  return num === null || den === null || den * s === 0 ? null : num / (den * s);
}

/** A site row counts for a line when the line applies to that site (a pilot site does not kill). */
export function appliesToSite(l: PlLine): boolean {
  return l.STATUS !== 'Not a kill site';
}

/**
 * One row for each line, in template order. Values add the site values. Ratio lines divide the rolled-up
 * numerator by the rolled-up denominator. MISSING_COMPONENTS is the largest count of any site.
 */
export function rollUp(rows: PlLine[]): PlNode[] {
  const byLine = new Map<string, PlLine[]>();
  for (const r of rows) {
    const list = byLine.get(r.LINE_ID);
    if (list) list.push(r);
    else byLine.set(r.LINE_ID, [r]);
  }

  const nodes = new Map<string, PlNode>();
  for (const [id, list] of byLine) {
    const sites = list.filter(appliesToSite);
    const first = list[0];
    const status = sites.some((s) => s.STATUS === 'Built')
      ? 'Built'
      : first.SOURCE_TYPE === 'Subtotal'
        ? 'Subtotal'
        : (sites[0]?.STATUS ?? first.STATUS);
    const missing = sites.map((s) => toNumber(s.MISSING_COMPONENTS)).filter((n): n is number => n !== null);
    nodes.set(id, {
      ...first,
      SITE: sites.length === 1 ? sites[0].SITE : ALL_SITES,
      STATUS: status,
      VALUE: str(sum(sites.map((s) => s.VALUE))),
      PREV_VALUE: str(sum(sites.map((s) => s.PREV_VALUE))),
      ACTUAL_VALUE: str(sum(sites.map((s) => s.ACTUAL_VALUE))),
      MISSING_COMPONENTS: missing.length ? String(Math.max(...missing)) : first.MISSING_COMPONENTS,
      SITES: sites,
    });
  }

  for (const n of nodes.values()) {
    if (!n.RATIO_NUM || !n.RATIO_DEN || n.SITES.length < 2) continue;
    const num = nodes.get(n.RATIO_NUM);
    const den = nodes.get(n.RATIO_DEN);
    n.VALUE = str(ratio(toNumber(num?.VALUE), toNumber(den?.VALUE), n.RATIO_SCALE));
    n.PREV_VALUE = str(ratio(toNumber(num?.PREV_VALUE), toNumber(den?.PREV_VALUE), n.RATIO_SCALE));
  }

  return [...nodes.values()].sort((a, b) => Number(a.LINE_ID) - Number(b.LINE_ID));
}

export interface Component {
  LINE_ID: string;
  LINE_NAME: string;
  SIGN: 1 | -1;
  ROW: PlLine | undefined;
}

/**
 * The lines that make up a subtotal or ratio for one site: subtotal components (with their sign),
 * or the numerator and denominator of a ratio. `siteRows` maps LINE_ID to that site's row.
 */
export function components(line: PlLine, siteRows: Map<string, PlLine>, names: Map<string, string>): Component[] {
  const ids: { id: string; sign: 1 | -1 }[] = line.RATIO_NUM
    ? [
        { id: line.RATIO_NUM, sign: 1 },
        ...(line.RATIO_DEN ? [{ id: line.RATIO_DEN, sign: 1 as const }] : []),
      ]
    : (line.COMPONENTS ?? '')
        .split(' ')
        .filter(Boolean)
        .map((c) => ({ id: c.replace(/^-/, ''), sign: c.startsWith('-') ? -1 : 1 }));
  return ids.map(({ id, sign }) => ({
    LINE_ID: id,
    LINE_NAME: names.get(id) ?? `Line ${id}`,
    SIGN: sign,
    ROW: siteRows.get(id),
  }));
}
