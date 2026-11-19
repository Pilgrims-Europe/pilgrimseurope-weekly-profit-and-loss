/**
 * Contract of the SQL in lib/wpl.ts, with no database. Each mocked query returns one row with
 * exactly the columns that its own SELECT list names. The tests then check that:
 * - the functions return the fields that their TypeScript types declare,
 * - each `?` in the SQL has one bind value, and filter values go in as binds only,
 * - each object the app reads is created in sql/ and has a block in sql/checks/app_contract.sql.
 * sql/checks/app_contract.sql checks the same columns against the live tables.
 */
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Freshness, PlLine, PlWeekLine, Site, Week } from '../../lib/wpl';
import * as wpl from '../../lib/wpl';

const SCHEMA = 'DEV_ANALYTICS.FINANCE_PL_WEEKLY';
const SQL_DIR = fileURLToPath(new URL('../../../sql/', import.meta.url));

type Call = { sql: string; binds: (string | number)[] };

/** Remove string literals, so that quotes, commas and brackets in them do not count. */
const stripStrings = (sql: string) => sql.replace(/'(?:[^']|'')*'/g, "''");

/** The output column names of the outer SELECT. Plain columns give their name, expressions their alias. */
function outputColumns(sql: string): string[] {
  const s = stripStrings(sql);
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && /^SELECT\b/i.test(s.slice(i)) && !/\w/.test(s[i - 1] ?? '')) start = i + 'SELECT'.length;
  }
  if (start < 0) throw new Error(`No outer SELECT in: ${sql}`);
  const items: string[] = [];
  let item = '';
  depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (depth === 0 && /^\s+FROM\b/i.test(s.slice(i))) break;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(item);
      item = '';
    } else item += ch;
  }
  items.push(item);
  return items.map((raw) => {
    const t = raw.trim();
    const alias = t.match(/\bAS\s+"?(\w+)"?$/i);
    if (alias) return alias[1];
    const plain = t.match(/^(?:\w+\.)?(\w+)$/);
    if (!plain) throw new Error(`Expression without an alias: ${t}`);
    return plain[1];
  });
}

const placeholders = (sql: string) => (stripStrings(sql).match(/\?/g) ?? []).length;
const objectsIn = (sql: string) => [...sql.matchAll(new RegExp(`${SCHEMA.replace('.', '\\.')}\\.(\\w+)`, 'g'))].map((m) => m[1]);

/** All keys of T, checked by the compiler: a missing or extra key does not compile. */
const keys = <T>(o: Record<keyof T, true>) => Object.keys(o).sort();

const SITE = keys<Site>({ SITE: true, SITE_KIND: true });
const WEEK = keys<Week>({
  WEEK_START: true,
  FISCAL_WEEK: true,
  FISCAL_YEAR: true,
  FISCAL_YEAR_PERIOD: true,
  FISCAL_MONTH_NAME: true,
  FISCAL_QUARTER: true,
});
const PL_LINE = keys<PlLine>({
  SITE: true,
  SITE_KIND: true,
  LINE_ID: true,
  LINE_GROUP: true,
  LINE_NAME: true,
  SOURCE_TYPE: true,
  SOURCE_SYSTEM: true,
  RAG: true,
  REASON: true,
  RULE: true,
  UNIT: true,
  TICKET: true,
  STATUS: true,
  VALUE: true,
  ACTUAL_VALUE: true,
  PREV_VALUE: true,
  MISSING_COMPONENTS: true,
  COMPONENTS: true,
  RATIO_NUM: true,
  RATIO_DEN: true,
  RATIO_SCALE: true,
});
const PL_WEEK_LINE = keys<PlWeekLine>({ ...Object.fromEntries(PL_LINE.map((k) => [k, true])), WEEK_START: true } as Record<
  keyof PlWeekLine,
  true
>);
const FRESHNESS = keys<Freshness>({ SOURCE: true, OBJECT_NAME: true, LAST_LOADED: true, DATA_TO: true, REFRESHED_AT: true });

const mocks = vi.hoisted(() => ({ calls: [] as Call[], outputColumns: (_sql: string): string[] => [] }));

vi.mock('../../lib/snowflake', () => ({
  snowflake: {
    query: vi.fn(async (sql: string, opts?: { binds?: (string | number)[] }) => {
      mocks.calls.push({ sql, binds: opts?.binds ?? [] });
      return { rows: [Object.fromEntries(mocks.outputColumns(sql).map((c) => [c, '1']))] };
    }),
  },
}));
mocks.outputColumns = outputColumns;

const NO_FILTER = { cust: [], cat: [], bu: [], mat: [] };

/** Every exported query function with sample arguments. */
const CASES: Record<string, () => Promise<unknown>> = {
  getSites: () => wpl.getSites(),
  getWeeks: () => wpl.getWeeks(),
  resolveFilters: () => wpl.resolveFilters({ site: 'Redruth', week: '2026-11-02' }),
  getPl: () => wpl.getPl('2026-11-02', 'Redruth', 'Sales margin'),
  getPlAllSites: () => wpl.getPl('2026-11-02'),
  getPlRange: () => wpl.getPlRange('2026-04-06', '2026-11-02', 'Anaplan template', 'Redruth'),
  getSalesLeafValues: () => wpl.getSalesLeafValues('2026-04-06', '2026-11-02', { ...NO_FILTER, cat: ['Cooked Meats'] }),
  getSalesFilterOptions: () => wpl.getSalesFilterOptions('2026-04-06', '2026-11-02', 'Redruth'),
  getLineDetailPoultry: () => wpl.getLineDetail('Dungannon', '2026-11-02', 20),
  getLineDetailPork: () => wpl.getLineDetail('Ballymena', '2026-11-02', 10),
  getLineDetailGl: () => wpl.getLineDetail('Redruth', '2026-11-02', 2020),
  getRagCounts: () => wpl.getRagCounts(),
  getLines: () => wpl.getLines(),
  getLineAccounts: () => wpl.getLineAccounts('Redruth', '2026-11-02', 2020),
  getTrend: () => wpl.getTrend('Redruth', '2026-11-02', 2020),
  getPoultryKill: () => wpl.getPoultryKill('Dungannon', '2026-11-02'),
  getPoultryCodes: () => wpl.getPoultryCodes('Dungannon', '2026-11-02'),
  getPorkKill: () => wpl.getPorkKill('Ballymena', '2026-11-02'),
  getFreshness: () => wpl.getFreshness(),
  getUnmapped: () => wpl.getUnmapped(),
};

async function capture(fn: () => Promise<unknown>) {
  mocks.calls.length = 0;
  const result = await fn();
  return { result, calls: [...mocks.calls] };
}

async function allCalls(): Promise<Call[]> {
  const out: Call[] = [];
  for (const fn of Object.values(CASES)) out.push(...(await capture(fn)).calls);
  return out;
}

const firstRow = (result: unknown) => (result as Record<string, unknown>[])[0];

describe('wpl.ts SQL contract', () => {
  beforeEach(() => {
    mocks.calls.length = 0;
  });

  it('covers every exported query function', () => {
    const exported = Object.entries(wpl)
      .filter(([, v]) => typeof v === 'function')
      .map(([k]) => k);
    const tested = new Set(Object.keys(CASES).map((k) => k.replace(/(AllSites|Poultry|Pork|Gl)$/, '')));
    expect(exported.filter((k) => !tested.has(k))).toEqual([]);
  });

  it.each(Object.entries(CASES))('%s: one bind value for each ? in the SQL', async (_name, fn) => {
    const { calls } = await capture(fn);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.binds.length, c.sql).toBe(placeholders(c.sql));
      for (const b of c.binds) expect(['string', 'number']).toContain(typeof b);
    }
  });

  it('returns the fields of the typed results', async () => {
    expect(Object.keys(firstRow((await capture(CASES.getSites)).result)).sort()).toEqual(SITE);
    expect(Object.keys(firstRow((await capture(CASES.getWeeks)).result)).sort()).toEqual(WEEK);
    expect(Object.keys(firstRow((await capture(CASES.getPl)).result)).sort()).toEqual(PL_LINE);
    expect(Object.keys(firstRow((await capture(CASES.getFreshness)).result)).sort()).toEqual(FRESHNESS);
    // Two queries joined on LINE_ID in TypeScript: the values and the line text.
    expect(Object.keys(firstRow((await capture(CASES.getPlRange)).result)).sort()).toEqual(PL_WEEK_LINE);
  });

  it('returns the columns that the pages and API routes read', async () => {
    const columns = async (name: string) => Object.keys(firstRow((await capture(CASES[name])).result)).sort();
    expect(await columns('getLineAccounts')).toEqual(['ACCOUNTNAME', 'GLACCOUNT', 'LINE_ITEMS', 'VALUE']);
    expect(await columns('getTrend')).toEqual(['ACTUAL_VALUE', 'FISCAL_WEEK', 'VALUE', 'WEEK_START']);
    expect(await columns('getLines')).toEqual(
      ['COMPONENTS', 'LAYOUT', 'LINE_GROUP', 'LINE_ID', 'LINE_NAME', 'REASON', 'RAG', 'RULE', 'SOURCE_SYSTEM', 'SOURCE_TYPE', 'TICKET', 'UNIT'].sort(),
    );
    expect(await columns('getPoultryKill')).toEqual(['BIRDS_DELIVERED', 'BIRDS_KILLED', 'CONDEMNED', 'DOA', 'KILL_DATE', 'LOADS']);
    expect(await columns('getPoultryCodes')).toEqual(['CALCULATIONCATEGORY', 'CODE', 'CODE_NAME', 'HEAD']);
    expect(await columns('getPorkKill')).toEqual(
      ['BOOKINGS', 'CASUALTY', 'DIP', 'DOA', 'KILLED_QTY', 'KILL_DATE', 'PIGS_DELIVERED', 'PIGS_KILLED', 'TC_FACTORY_RESP', 'TC_PRODUCER_RESP'].sort(),
    );
    expect(await columns('getUnmapped')).toEqual(['ACCOUNTNAME', 'GLACCOUNT', 'GROUP_NAME', 'LINE_ITEMS', 'SITE', 'VALUE']);
  });

  it('gives a value for each Sales margin leaf line from the SQL aliases', async () => {
    const { result } = await capture(CASES.getSalesLeafValues);
    const leaves = result as { LINE_ID: string; VALUE: unknown }[];
    expect(leaves.map((l) => l.LINE_ID)).toEqual(['2010', '2020', '2040', '2110', '2120', '2130', '2140', '2150', '2210']);
    expect(leaves.filter((l) => l.VALUE === undefined).map((l) => l.LINE_ID)).toEqual([]);
  });

  it('reads the kill build-up columns that the line detail uses', async () => {
    const poultry = (await capture(CASES.getLineDetailPoultry)).result as wpl.LineDetail;
    expect(poultry.items.map((i) => i.VALUE)).toEqual([1, -1, 1]);
    const pork = (await capture(CASES.getLineDetailPork)).result as wpl.LineDetail;
    expect(pork.items.slice(0, 3).map((i) => i.VALUE)).toEqual([1, -1, -1]);
  });

  it('puts Sales margin filter values in binds, never in the SQL text', async () => {
    const evil = "x') OR 1=1 --";
    const filter = { cust: [evil], cat: ['Cooked Meats', evil], bu: [evil], mat: [evil] };
    const { calls } = await capture(() => wpl.getSalesLeafValues('2026-04-06', '2026-11-02', filter, evil));
    for (const c of calls) {
      expect(c.sql).not.toContain(evil);
      expect(c.binds.filter((b) => b === evil)).toHaveLength(6); // site twice, then one for each filter value
      expect(c.binds.length).toBe(placeholders(c.sql));
    }
  });

  it('reads only objects that are created in sql/', async () => {
    const created = new Set<string>();
    for (const f of readdirSync(SQL_DIR).filter((n) => n.endsWith('.sql'))) {
      const text = readFileSync(SQL_DIR + f, 'utf8');
      for (const m of text.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?DEV_ANALYTICS\.FINANCE_PL_WEEKLY\.(\w+)/gi))
        created.add(m[1]);
    }
    const read = new Set((await allCalls()).flatMap((c) => objectsIn(c.sql)));
    expect([...read].filter((o) => !created.has(o))).toEqual([]);
  });

  it('has a block in sql/checks/app_contract.sql for each object it reads, and no other', async () => {
    const contract = readFileSync(SQL_DIR + 'checks/app_contract.sql', 'utf8');
    const checked = new Set([...contract.matchAll(/FROM DEV_ANALYTICS\.FINANCE_PL_WEEKLY\.(\w+) WHERE FALSE/g)].map((m) => m[1]));
    const read = new Set((await allCalls()).flatMap((c) => objectsIn(c.sql)));
    expect([...read].sort()).toEqual([...checked].sort());
  });
});
