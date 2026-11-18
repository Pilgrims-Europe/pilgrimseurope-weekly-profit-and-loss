import { describe, expect, it } from 'vitest';
import type { PlWeekLine } from '../../lib/wpl';
import { applyFilteredValues, isFiltered, toSalesFilter } from '../../lib/wpl-filter';

const row = (p: Partial<PlWeekLine>): PlWeekLine => ({
  WEEK_START: '2026-11-02',
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
  VALUE: '999',
  ACTUAL_VALUE: null,
  PREV_VALUE: null,
  MISSING_COMPONENTS: null,
  COMPONENTS: null,
  RATIO_NUM: null,
  RATIO_DEN: null,
  RATIO_SCALE: null,
  ...p,
});

describe('wpl-filter', () => {
  it('reads repeated parameters and drops empty values', () => {
    const f = toSalesFilter({ cust: ['1', ' 2 ', ''], cat: 'Cooked Meats', site: 'Redruth' });
    expect(f).toEqual({ cust: ['1', '2'], cat: ['Cooked Meats'], bu: [], mat: [] });
    expect(isFiltered(f)).toBe(true);
    expect(isFiltered(toSalesFilter({}))).toBe(false);
  });

  it('puts in the filtered leaf values and works out subtotals and ratios again', () => {
    const rows = [
      row({ LINE_ID: '2010', UNIT: 'kg' }),
      row({ LINE_ID: '2020' }),
      row({ LINE_ID: '2040' }),
      row({ LINE_ID: '2060', SOURCE_TYPE: 'Subtotal', COMPONENTS: '2020 2040' }),
      row({ LINE_ID: '2070', SOURCE_TYPE: 'Subtotal', UNIT: 'GBP/kg', RATIO_NUM: '2060', RATIO_DEN: '2010', RATIO_SCALE: '1' }),
    ];
    const out = applyFilteredValues(rows, [
      { SITE: 'Redruth', WEEK_START: '2026-11-02', LINE_ID: '2010', VALUE: '50' },
      { SITE: 'Redruth', WEEK_START: '2026-11-02', LINE_ID: '2020', VALUE: '300' },
    ]);
    const v = (id: string) => out.find((r) => r.LINE_ID === id)?.VALUE;
    expect(v('2040')).toBe('0'); // no filtered sales: 0, not last week's unfiltered value
    expect(v('2060')).toBe('300');
    expect(Number(v('2070'))).toBe(6);
    expect(rows[1].VALUE).toBe('999'); // input not changed
  });

  it('keeps No data weeks empty', () => {
    const out = applyFilteredValues(
      [row({ STATUS: 'No data', VALUE: null }), row({ LINE_ID: '2060', SOURCE_TYPE: 'Subtotal', COMPONENTS: '2020', VALUE: null })],
      [{ SITE: 'Redruth', WEEK_START: '2026-11-02', LINE_ID: '2020', VALUE: '10' }],
    );
    expect(out.map((r) => r.VALUE)).toEqual([null, null]);
    expect(out[1].MISSING_COMPONENTS).toBe('1');
  });
});
