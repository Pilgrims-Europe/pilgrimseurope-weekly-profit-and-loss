import { describe, expect, it } from 'vitest';
import type { PlLine } from '../../lib/wpl';
import { ALL_SITES, components, rollUp } from '../../lib/wpl-rollup';

const row = (p: Partial<PlLine>): PlLine => ({
  SITE: 'Redruth',
  SITE_KIND: 'PILOT',
  LINE_ID: '110',
  LINE_GROUP: 'External sales at standard',
  LINE_NAME: 'STD Ext NSV',
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

describe('wpl-rollup', () => {
  it('adds site values and keeps the sites as children', () => {
    const [n] = rollUp([
      row({ VALUE: '100', PREV_VALUE: '90' }),
      row({ SITE: 'Bromborough', VALUE: '50', PREV_VALUE: null }),
    ]);
    expect(n.SITE).toBe(ALL_SITES);
    expect(n.VALUE).toBe('150');
    expect(n.PREV_VALUE).toBe('90');
    expect(n.SITES.map((s) => s.SITE)).toEqual(['Redruth', 'Bromborough']);
  });

  it('takes kill from the kill sites only', () => {
    const kill = { LINE_ID: '20', LINE_NAME: 'Kill Chicken', UNIT: 'head' };
    const [n] = rollUp([
      row({ ...kill, STATUS: 'Not a kill site' }),
      row({ ...kill, SITE: 'Anwick', SITE_KIND: 'POULTRY_KILL', VALUE: '1651854' }),
      row({ ...kill, SITE: 'Dungannon', SITE_KIND: 'POULTRY_KILL', VALUE: '1482956' }),
    ]);
    expect(n.STATUS).toBe('Built');
    expect(n.VALUE).toBe('3134810');
    expect(n.SITES.map((s) => s.SITE)).toEqual(['Anwick', 'Dungannon']);
  });

  it('divides rolled-up parts for a ratio line', () => {
    const lines = rollUp([
      row({ LINE_ID: '850', SOURCE_TYPE: 'Subtotal', VALUE: '1000' }),
      row({ LINE_ID: '850', SOURCE_TYPE: 'Subtotal', SITE: 'Bromborough', VALUE: '3000' }),
      row({ LINE_ID: '1110', SOURCE_TYPE: 'Subtotal', VALUE: '100' }),
      row({ LINE_ID: '1110', SOURCE_TYPE: 'Subtotal', SITE: 'Bromborough', VALUE: '300' }),
      row({ LINE_ID: '1140', SOURCE_TYPE: 'Subtotal', UNIT: '%', VALUE: '0.1', RATIO_NUM: '1110', RATIO_DEN: '850', RATIO_SCALE: '1' }),
      row({ LINE_ID: '1140', SOURCE_TYPE: 'Subtotal', UNIT: '%', SITE: 'Bromborough', VALUE: '0.1', RATIO_NUM: '1110', RATIO_DEN: '850', RATIO_SCALE: '1' }),
    ]);
    expect(Number(lines.find((l) => l.LINE_ID === '1140')?.VALUE)).toBeCloseTo(0.1);
    expect(lines.map((l) => l.LINE_ID)).toEqual(['850', '1110', '1140']);
  });

  it('lists subtotal components with their sign', () => {
    const site = new Map([['110', row({ VALUE: '5' })]]);
    const names = new Map([['110', 'STD Ext NSV'], ['120', 'STD Ext Material Cost']]);
    const c = components(row({ SOURCE_TYPE: 'Subtotal', COMPONENTS: '110 -120' }), site, names);
    expect(c.map((x) => [x.LINE_ID, x.SIGN, x.ROW?.VALUE ?? null])).toEqual([
      ['110', 1, '5'],
      ['120', -1, null],
    ]);
  });
});
