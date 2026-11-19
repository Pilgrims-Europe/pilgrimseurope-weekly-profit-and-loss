/**
 * Periods for the week-by-week views. Pure functions, safe in server and client code.
 * A period ends at the selected week: MTD, QTD and YTD start at the first week of its fiscal month,
 * quarter or year. Last 12 Months is the 52 weeks up to and including it.
 */
import type { Week } from '@/lib/wpl';

export const PERIODS = [
  { value: 'MTD', label: 'MTD' },
  { value: 'QTD', label: 'QTD' },
  { value: 'YTD', label: 'YTD' },
  { value: 'L12M', label: 'Last 12 Months' },
] as const;

export type Period = (typeof PERIODS)[number]['value'];

export const SHOWS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'cumulative', label: 'Cumulative' },
] as const;

export type Show = (typeof SHOWS)[number]['value'];

export function toPeriod(v: string | undefined): Period {
  return PERIODS.some((p) => p.value === v) ? (v as Period) : 'MTD';
}

export function toShow(v: string | undefined): Show {
  return v === 'cumulative' ? 'cumulative' : 'weekly';
}

export function periodLabel(p: Period): string {
  return PERIODS.find((x) => x.value === p)?.label ?? p;
}

/** The weeks of the period that ends at `selected`, oldest first. `weeks` can be in any order. */
export function periodWeeks(weeks: Week[], selected: Week, period: Period): Week[] {
  const upTo = [...weeks].filter((w) => w.WEEK_START <= selected.WEEK_START).sort((a, b) => a.WEEK_START.localeCompare(b.WEEK_START));
  switch (period) {
    case 'MTD':
      return upTo.filter((w) => w.FISCAL_YEAR_PERIOD === selected.FISCAL_YEAR_PERIOD);
    case 'QTD':
      return upTo.filter((w) => w.FISCAL_YEAR === selected.FISCAL_YEAR && w.FISCAL_QUARTER === selected.FISCAL_QUARTER);
    case 'YTD':
      return upTo.filter((w) => w.FISCAL_YEAR === selected.FISCAL_YEAR);
    case 'L12M':
      return upTo.slice(-52);
  }
}

/** "MTD Nov 2026, weeks 44 to 46" for the page subtitle. */
export function periodText(period: Period, weeks: Week[]): string {
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (!first || !last) return periodLabel(period);
  const name =
    period === 'MTD'
      ? `MTD ${last.FISCAL_MONTH_NAME} ${last.FISCAL_YEAR}`
      : period === 'QTD'
        ? `QTD ${last.FISCAL_QUARTER} ${last.FISCAL_YEAR}`
        : period === 'YTD'
          ? `YTD ${last.FISCAL_YEAR}`
          : 'Last 12 Months';
  const span =
    first.FISCAL_YEAR === last.FISCAL_YEAR
      ? `weeks ${first.FISCAL_WEEK} to ${last.FISCAL_WEEK}`
      : `week ${first.FISCAL_WEEK} ${first.FISCAL_YEAR} to week ${last.FISCAL_WEEK} ${last.FISCAL_YEAR}`;
  return `${name}, ${weeks.length === 1 ? `week ${last.FISCAL_WEEK}` : span}`;
}
