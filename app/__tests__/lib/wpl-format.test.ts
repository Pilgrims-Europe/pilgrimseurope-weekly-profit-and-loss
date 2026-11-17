import { describe, expect, it } from 'vitest';
import { formatCompactUnit, formatUnit, ticketUrl, toNumber, weekLabel } from '../../lib/wpl-format';

describe('wpl-format', () => {
  it('parses Snowflake decimal strings', () => {
    expect(toNumber('1893744.82')).toBe(1893744.82);
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
  });

  it('formats each unit in en-GB', () => {
    expect(formatUnit('1893744.82', 'GBP')).toBe('£1,893,745');
    expect(formatUnit('-1071.03', 'GBP')).toBe('-£1,071');
    expect(formatUnit('252.992', 't')).toBe('253.0 t');
    expect(formatUnit('1482956', 'head')).toBe('1,482,956');
    expect(formatUnit('0.315', '%')).toBe('31.5%');
    expect(formatUnit('0.0895', 'GBP/kg')).toBe('£0.090');
    expect(formatUnit(null, 'GBP')).toBe('—');
  });

  it('abbreviates chart ticks', () => {
    expect(formatCompactUnit(1_250_000, 'GBP')).toBe('£1.3M');
    expect(formatCompactUnit(-34_000, 'GBP')).toBe('-£34K');
  });

  it('labels a fiscal week', () => {
    expect(weekLabel('45', '2026-11-02')).toBe('Week 45 (2 Nov to 8 Nov 2026)');
  });

  it('links a ticket', () => {
    expect(ticketUrl('https://github.com/o/r', '#20')).toBe('https://github.com/o/r/issues/20');
    expect(ticketUrl('https://github.com/o/r', null)).toBeNull();
  });
});
