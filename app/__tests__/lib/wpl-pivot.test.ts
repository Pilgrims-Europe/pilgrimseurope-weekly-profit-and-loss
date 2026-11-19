import { describe, expect, it } from 'vitest';
import type { PlWeekLine, Week } from '../../lib/wpl';
import { periodText, periodWeeks } from '../../lib/wpl-period';
import { pivot } from '../../lib/wpl-pivot';

const row = (p: Partial<PlWeekLine>): PlWeekLine => ({
  WEEK_START: '2026-10-26',
  SITE: 'Redruth',
  SITE_KIND: 'PILOT',
  LINE_ID: '2020',
  LINE_GROUP: 'Sales margin',
  LINE_NAME: 'G.S.V.',
  SOURCE_TYPE: 'System',
  SOURCE_SYSTEM: 'COPA',
  RAG: 'Amber',
  REASON: null,
  RULE: null,
  UNIT: 'GBP',
  TICKET: null,
  STATUS: 'Built',
  VALUE: null,
  ACTUAL_VALUE: null,
  PREV_VALUE: null,
  MISSING_COMPONENTS: null,
  COMPONENTS: null,
  RATIO_NUM: null,
  RATIO_DEN: null,
  RATIO_SCALE: null,
  ...p,
});

const week = (WEEK_START: string, FISCAL_WEEK: string, FISCAL_YEAR_PERIOD: string, FISCAL_QUARTER: string, FISCAL_YEAR = '2026'): Week => ({
  WEEK_START,
  FISCAL_WEEK,
  FISCAL_YEAR,
  FISCAL_YEAR_PERIOD,
  FISCAL_MONTH_NAME: 'Nov',
  FISCAL_QUARTER,
});

const WEEKS: Week[] = [
  week('2025-11-17', '47', '2025011', 'Q4', '2025'),
  week('2026-09-21', '39', '2026009', 'Q3'),
  week('2026-09-28', '40', '2026010', 'Q4'),
  week('2026-10-26', '44', '2026011', 'Q4'),
  week('2026-11-02', '45', '2026011', 'Q4'),
  week('2026-11-09', '46', '2026011', 'Q4'),
];

describe('wpl-period', () => {
  it('ends MTD, QTD and YTD at the selected week', () => {
    const sel = WEEKS[4];
    expect(periodWeeks(WEEKS, sel, 'MTD').map((w) => w.FISCAL_WEEK)).toEqual(['44', '45']);
    expect(periodWeeks(WEEKS, sel, 'QTD').map((w) => w.FISCAL_WEEK)).toEqual(['40', '44', '45']);
    expect(periodWeeks(WEEKS, sel, 'YTD').map((w) => w.FISCAL_WEEK)).toEqual(['39', '40', '44', '45']);
  });

  it('takes the last 52 weeks for Last 12 Months, across years', () => {
    const many: Week[] = Array.from({ length: 60 }, (_, i) =>
      week(new Date(Date.UTC(2025, 0, 6 + 7 * i)).toISOString().slice(0, 10), String(i + 1), '2025001', 'Q1'),
    );
    const l12 = periodWeeks(many, many[59], 'L12M');
    expect(l12).toHaveLength(52);
    expect(l12[51].WEEK_START).toBe(many[59].WEEK_START);
    expect(periodWeeks(WEEKS, WEEKS[5], 'L12M')[0].FISCAL_WEEK).toBe('47');
  });

  it('names the period', () => {
    expect(periodText('MTD', [WEEKS[3], WEEKS[4]])).toBe('MTD Nov 2026, weeks 44 to 45');
  });
});

describe('wpl-pivot', () => {
  const weeks = ['2026-10-26', '2026-11-02'];
  const rows = [
    row({ LINE_ID: '2010', UNIT: 'kg', VALUE: '100' }),
    row({ LINE_ID: '2010', UNIT: 'kg', VALUE: '300', WEEK_START: weeks[1] }),
    row({ LINE_ID: '2010', UNIT: 'kg', VALUE: '100', SITE: 'Bromborough' }),
    row({ LINE_ID: '2010', UNIT: 'kg', VALUE: '100', SITE: 'Bromborough', WEEK_START: weeks[1] }),
    row({ VALUE: '500' }),
    row({ VALUE: '900', WEEK_START: weeks[1] }),
    row({ VALUE: '100', SITE: 'Bromborough' }),
    row({ VALUE: '300', SITE: 'Bromborough', WEEK_START: weeks[1] }),
    ...['Redruth', 'Bromborough'].flatMap((SITE) =>
      weeks.map((WEEK_START) =>
        row({ SITE, WEEK_START, LINE_ID: '2030', SOURCE_TYPE: 'Subtotal', UNIT: 'GBP/kg', RATIO_NUM: '2020', RATIO_DEN: '2010', RATIO_SCALE: '1', VALUE: '0' }),
      ),
    ),
  ];

  it('gives weekly cells, a total, and site rows', () => {
    const [kg, gsv, price] = pivot(rows, weeks, 'weekly');
    expect(kg.cells).toEqual([200, 400]);
    expect(kg.total).toBe(600);
    expect(gsv.cells).toEqual([600, 1200]);
    expect(gsv.sites.map((s) => [s.line.SITE, s.total])).toEqual([
      ['Redruth', 1400],
      ['Bromborough', 400],
    ]);
    // Ratio lines divide the rolled-up parts, week by week and for the total.
    expect(price.cells).toEqual([3, 3]);
    expect(price.total).toBe(3);
    expect(price.sites[0].total).toBeCloseTo(1400 / 400);
  });

  it('adds the weeks for cumulative cells and ratios', () => {
    const [kg, , price] = pivot(rows, weeks, 'cumulative');
    expect(kg.cells).toEqual([200, 600]);
    expect(price.cells).toEqual([3, 3]);
    expect(price.sites[1].cells).toEqual([1, 2]);
  });

  it('keeps No data weeks empty and out of the total', () => {
    const [gsv] = pivot(
      [row({ STATUS: 'No data', VALUE: null }), row({ VALUE: '50', WEEK_START: weeks[1] })],
      weeks,
      'weekly',
    );
    expect(gsv.cells).toEqual([null, 50]);
    expect(gsv.cellStatus).toEqual(['No data', 'Built']);
    expect(gsv.total).toBe(50);
    expect(gsv.status).toBe('Built');
  });
});
