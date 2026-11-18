/**
 * Display rules for weekly P&L values. Pure functions, safe in server and client code.
 * Values arrive from Snowflake as decimal strings; `toNumber` turns them into numbers.
 */

export type Rag = 'Green' | 'Amber' | 'Red';

export type LineStatus = 'Built' | 'Not built' | 'Empty' | 'Subtotal' | 'Not a kill site' | 'No data';

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const gbp3 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 3, maximumFractionDigits: 3 });
const int = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat('en-GB', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format a value in its line unit: GBP, t, head, kg, %, GBP/kg or FTE. Missing values show "—". */
export function formatUnit(value: unknown, unit: string | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return '—';
  switch (unit) {
    case 'GBP':
      return gbp0.format(n);
    case 'GBP/kg':
      return gbp3.format(n);
    case '%':
      return pct.format(n);
    case 't':
      return `${one.format(n)} t`;
    case 'kg':
      return `${int.format(n)} kg`;
    case 'FTE':
      return one.format(n);
    case 'head':
    default:
      return int.format(n);
  }
}

/**
 * Short form for the week columns of the pivot tables, as in Gui's sheet: no £ sign or unit name.
 * GBP and kg as whole numbers, GBP/kg with 2 decimals, % with 1 decimal. Missing values show "—".
 */
export function formatPivot(value: unknown, unit: string | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return '—';
  switch (unit) {
    case 'GBP/kg':
      return two.format(n);
    case '%':
      return pct.format(n);
    case 't':
    case 'FTE':
      return one.format(n);
    default:
      return int.format(n);
  }
}

/** Short form for chart ticks: £1.2M, £340K, 12.3 t. */
export function formatCompactUnit(value: number, unit: string | null | undefined): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const scaled = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `${(abs / 1_000).toFixed(0)}K` : abs.toFixed(abs < 10 ? 2 : 0);
  if (unit === 'GBP' || unit === 'GBP/kg') return `${sign}£${scaled}`;
  if (unit === '%') return pct.format(value);
  if (unit === 't') return `${sign}${scaled} t`;
  return `${sign}${scaled}`;
}

/** Text colour class for a P&L value: costs and losses red, income and gains green, for GBP only. */
export function valueTone(value: unknown, unit: string | null | undefined): string {
  const n = toNumber(value);
  if (n === null || (unit !== 'GBP' && unit !== '%' && unit !== 'GBP/kg')) return '';
  if (n < 0) return 'text-pe-red';
  return '';
}

/** "Week 45 (2 Nov to 8 Nov 2026)" from a week start date string (YYYY-MM-DD). */
export function weekLabel(fiscalWeek: unknown, weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = (d: Date, year: boolean) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  return `Week ${fiscalWeek ?? '?'} (${fmt(start, false)} to ${fmt(end, true)})`;
}

/** True for lines that show a 13-week run rate (overheads, not Consumables). WPL_LINE_VALUE uses the same test. */
export function isRunRate(line: { RULE?: string | null } | null | undefined): boolean {
  return !!line?.RULE?.startsWith('Run rate');
}

/** Ticket text such as "#20" to a GitHub issue URL. */
export function ticketUrl(repoUrl: string, ticket: string | null | undefined): string | null {
  const m = ticket?.match(/#(\d+)/);
  return m ? `${repoUrl}/issues/${m[1]}` : null;
}
