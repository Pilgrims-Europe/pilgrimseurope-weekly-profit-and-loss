/**
 * Server-side data access for the weekly P&L app. Owner's rights: the app reads the WPL_T_* tables
 * in DEV_ANALYTICS.FINANCE_PL_WEEKLY. WPL_REFRESH rebuilds them each day at 11:00 UTC from the WPL_* views.
 * WPL_SCHEMA (local development only) points the app at a test copy of the schema.
 * Every user-supplied value goes in as a bind parameter. Server code only.
 */
import { snowflake } from '@/lib/snowflake';
import type { LeafValue, SalesFilter, SalesFilterParam } from '@/lib/wpl-filter';
import { isRunRate } from '@/lib/wpl-format';

const SCHEMA =
  process.env.NODE_ENV === 'development' && /^[A-Z0-9_]+\.[A-Z0-9_]+$/.test(process.env.WPL_SCHEMA ?? '')
    ? (process.env.WPL_SCHEMA as string)
    : 'DEV_ANALYTICS.FINANCE_PL_WEEKLY';

type Row = Record<string, string | null>;

async function rows<T = Row>(sql: string, binds: (string | number)[] = []): Promise<T[]> {
  const result = await snowflake.query(sql, { binds });
  return result.rows as T[];
}

export interface Site {
  SITE: string;
  SITE_KIND: 'PILOT' | 'POULTRY_KILL' | 'PORK_KILL';
}

export interface Week {
  WEEK_START: string;
  FISCAL_WEEK: string;
  FISCAL_YEAR: string;
  /** Fiscal year and month, for example "2026011". */
  FISCAL_YEAR_PERIOD: string;
  FISCAL_MONTH_NAME: string;
  /** "Q1" to "Q4". */
  FISCAL_QUARTER: string;
}

/** The two line layouts in WPL_LINE. */
export type Layout = 'Anaplan template' | 'Sales margin';

export interface PlLine {
  SITE: string;
  SITE_KIND: string;
  LINE_ID: string;
  LINE_GROUP: string;
  LINE_NAME: string;
  SOURCE_TYPE: string;
  SOURCE_SYSTEM: string | null;
  RAG: string | null;
  REASON: string | null;
  RULE: string | null;
  UNIT: string;
  TICKET: string | null;
  STATUS: string;
  VALUE: string | null;
  ACTUAL_VALUE: string | null;
  PREV_VALUE: string | null;
  MISSING_COMPONENTS: string | null;
  /** Subtotal components, space separated LINE_IDs. A leading "-" takes the line off. */
  COMPONENTS: string | null;
  RATIO_NUM: string | null;
  RATIO_DEN: string | null;
  RATIO_SCALE: string | null;
}

export async function getSites(): Promise<Site[]> {
  return rows<Site>(`SELECT SITE, SITE_KIND FROM ${SCHEMA}.WPL_SITE ORDER BY SITE_ORDER`);
}

export async function getWeeks(): Promise<Week[]> {
  return rows<Week>(
    `SELECT TO_VARCHAR(w.WEEK_START, 'YYYY-MM-DD') AS WEEK_START, w.FISCAL_WEEK, w.FISCAL_YEAR, w.FISCAL_YEAR_PERIOD,
            w.FISCAL_MONTH_NAME, w.FISCAL_QUARTER
     FROM ${SCHEMA}.WPL_WEEK w
     WHERE w.WEEK_START IN (SELECT DISTINCT WEEK_START FROM ${SCHEMA}.WPL_T_WEEKLY_PL)
     ORDER BY w.WEEK_START DESC`,
  );
}

/** Resolve the site and week from the URL, falling back to the first pilot site and the latest week. */
export async function resolveFilters(params: { site?: string; week?: string }, kinds: Site['SITE_KIND'][] = ['PILOT']) {
  const [sites, weeks] = await Promise.all([getSites(), getWeeks()]);
  const allowed = sites.filter((s) => kinds.includes(s.SITE_KIND));
  const site = allowed.find((s) => s.SITE === params.site) ?? allowed[0];
  const week = weeks.find((w) => w.WEEK_START === params.week) ?? weeks[0];
  return { sites: allowed, weeks, site, week };
}

/**
 * The template lines for each site and one week, with last week's value for comparison.
 * With no site, all sites (pilot and kill sites). Roll them up with `rollUp` in lib/wpl-rollup.ts.
 */
export async function getPl(weekStart: string, site?: string, layout: Layout = 'Anaplan template'): Promise<PlLine[]> {
  return rows<PlLine>(
    `SELECT c.SITE, c.SITE_KIND, c.LINE_ID, c.LINE_GROUP, c.LINE_NAME, c.SOURCE_TYPE, c.SOURCE_SYSTEM, c.RAG, c.REASON, c.RULE,
            c.UNIT, c.TICKET, c.STATUS, c.VALUE, c.ACTUAL_VALUE, p.VALUE AS PREV_VALUE, c.MISSING_COMPONENTS, c.COMPONENTS,
            l.RATIO_NUM, l.RATIO_DEN, l.RATIO_SCALE
     FROM ${SCHEMA}.WPL_T_WEEKLY_PL c
     JOIN ${SCHEMA}.WPL_LINE l ON l.LINE_ID = c.LINE_ID
     LEFT JOIN ${SCHEMA}.WPL_T_WEEKLY_PL p
       ON p.SITE = c.SITE AND p.LINE_ID = c.LINE_ID AND p.WEEK_START = DATEADD(week, -1, c.WEEK_START)
     WHERE c.WEEK_START = ? AND (? = '' OR c.SITE = ?) AND l.LAYOUT = ?
     ORDER BY c.LINE_ID, c.SITE_ORDER`,
    [weekStart, site ?? '', site ?? '', layout],
  );
}

export interface PlWeekLine extends PlLine {
  WEEK_START: string;
}

/**
 * The lines of one layout for each site and each week from `fromWeek` to `toWeek` (both included).
 * With no site, all sites. Pivot them with `pivot` in lib/wpl-pivot.ts.
 * The values and the line text come in two queries: a year of weeks has about 9,000 rows, and the
 * rule and reason text on each row made one query take 6 to 8 seconds.
 */
export async function getPlRange(fromWeek: string, toWeek: string, layout: Layout, site?: string): Promise<PlWeekLine[]> {
  type Value = Pick<PlWeekLine, 'WEEK_START' | 'SITE' | 'SITE_KIND' | 'LINE_ID' | 'STATUS' | 'VALUE' | 'MISSING_COMPONENTS'>;
  type Meta = Omit<PlLine, 'SITE' | 'SITE_KIND' | 'STATUS' | 'VALUE' | 'ACTUAL_VALUE' | 'PREV_VALUE' | 'MISSING_COMPONENTS'>;
  const [values, meta] = await Promise.all([
    rows<Value>(
      `SELECT TO_VARCHAR(c.WEEK_START, 'YYYY-MM-DD') AS WEEK_START, c.SITE, c.SITE_KIND, c.LINE_ID, c.STATUS, c.VALUE,
              c.MISSING_COMPONENTS
       FROM ${SCHEMA}.WPL_T_WEEKLY_PL c
       WHERE c.WEEK_START BETWEEN ?::DATE AND ?::DATE AND (? = '' OR c.SITE = ?) AND c.LAYOUT = ?
       ORDER BY c.WEEK_START, c.LINE_ID, c.SITE_ORDER`,
      [fromWeek, toWeek, site ?? '', site ?? '', layout],
    ),
    rows<Meta>(
      `SELECT LINE_ID, LINE_GROUP, LINE_NAME, SOURCE_TYPE, SOURCE_SYSTEM, RAG, REASON, RULE, UNIT, TICKET, COMPONENTS,
              RATIO_NUM, RATIO_DEN, RATIO_SCALE
       FROM ${SCHEMA}.WPL_LINE WHERE LAYOUT = ?`,
      [layout],
    ),
  ]);
  const byId = new Map(meta.map((m) => [String(m.LINE_ID), m]));
  return values.flatMap((v) => {
    const m = byId.get(String(v.LINE_ID));
    return m ? [{ ...m, ...v, LINE_ID: String(v.LINE_ID), ACTUAL_VALUE: null, PREV_VALUE: null }] : [];
  });
}

/** Column of WPL_T_SALES_DETAIL for each Sales margin filter. Fixed names, never from user input. */
const FILTER_COLUMN: Record<SalesFilterParam, string> = {
  cust: 'SOLD_TO',
  cat: 'CATEGORY',
  bu: 'BUSINESS_UNIT',
  mat: 'MATERIAL_CODE',
};

/** WHERE text and binds for the Sales margin filters. Values go in as bind parameters. */
function filterSql(f: SalesFilter): { sql: string; binds: string[] } {
  const parts: string[] = [];
  const binds: string[] = [];
  for (const [param, column] of Object.entries(FILTER_COLUMN) as [SalesFilterParam, string][]) {
    const values = f[param];
    if (!values.length) continue;
    parts.push(`${column} IN (${values.map(() => '?').join(', ')})`);
    binds.push(...values);
  }
  return { sql: parts.map((p) => ` AND ${p}`).join(''), binds };
}

/**
 * Sales margin leaf values from the COPA detail, for one site or all pilot sites, with the filters.
 * External sales only. The same rules as WPL_LINE_VALUE (lines 2010 to 2210).
 */
export async function getSalesLeafValues(fromWeek: string, toWeek: string, filter: SalesFilter, site?: string): Promise<LeafValue[]> {
  const f = filterSql(filter);
  const sums = await rows<Record<string, string | null>>(
    `SELECT SITE, TO_VARCHAR(WEEK_START, 'YYYY-MM-DD') AS WEEK_START,
            SUM(EDIBLE_KG) AS "2010", SUM(GSV) AS "2020", SUM(OSC) AS "2040",
            SUM(STD_MEAT) AS "2110", SUM(STD_LABOUR) AS "2120", SUM(STD_INGREDIENTS) AS "2130", SUM(STD_PACKAGING) AS "2140",
            SUM(COALESCE(STD_COS, 0) - COALESCE(STD_MEAT, 0) - COALESCE(STD_LABOUR, 0) - COALESCE(STD_INGREDIENTS, 0)
                - COALESCE(STD_PACKAGING, 0)) AS "2150",
            SUM(STD_FREIGHT) AS "2210"
     FROM ${SCHEMA}.WPL_T_SALES_DETAIL
     WHERE NOT IS_INTERCO AND WEEK_START BETWEEN ?::DATE AND ?::DATE AND (? = '' OR SITE = ?)${f.sql}
     GROUP BY ALL`,
    [fromWeek, toWeek, site ?? '', site ?? '', ...f.binds],
  );
  const ids = ['2010', '2020', '2040', '2110', '2120', '2130', '2140', '2150', '2210'];
  return sums.flatMap((s) => ids.map((id) => ({ SITE: s.SITE ?? '', WEEK_START: s.WEEK_START ?? '', LINE_ID: id, VALUE: s[id] })));
}

export interface FilterValue {
  VALUE: string;
  LABEL: string;
}

/**
 * The values for each Sales margin filter: customers, categories, business units and materials with external
 * sales at the site (or all pilot sites) in the weeks, largest N.S.V. first.
 */
export async function getSalesFilterOptions(
  fromWeek: string,
  toWeek: string,
  site?: string,
): Promise<Record<SalesFilterParam, FilterValue[]>> {
  const r = await rows<{ DIM: SalesFilterParam; VALUE: string; LABEL: string }>(
    `WITH d AS (
       SELECT * FROM ${SCHEMA}.WPL_T_SALES_DETAIL
       WHERE NOT IS_INTERCO AND WEEK_START BETWEEN ?::DATE AND ?::DATE AND (? = '' OR SITE = ?)
     )
     SELECT DIM, VALUE, LABEL FROM (
       SELECT 'cust' AS DIM, SOLD_TO AS VALUE, MAX(CUSTOMER_NAME) || ' (' || LTRIM(SOLD_TO, '0') || ')' AS LABEL, SUM(NSV) AS N FROM d GROUP BY SOLD_TO
       UNION ALL SELECT 'cat', CATEGORY, CATEGORY, SUM(NSV) FROM d GROUP BY CATEGORY
       UNION ALL SELECT 'bu', BUSINESS_UNIT, BUSINESS_UNIT, SUM(NSV) FROM d GROUP BY BUSINESS_UNIT
       UNION ALL SELECT 'mat', MATERIAL_CODE, MATERIAL_CODE || ' - ' || MAX(MATERIAL_DESC), SUM(NSV) FROM d GROUP BY MATERIAL_CODE
     )
     WHERE VALUE IS NOT NULL
     ORDER BY DIM, N DESC NULLS LAST`,
    [fromWeek, toWeek, site ?? '', site ?? ''],
  );
  const out: Record<SalesFilterParam, FilterValue[]> = { cust: [], cat: [], bu: [], mat: [] };
  for (const x of r) out[x.DIM]?.push({ VALUE: x.VALUE, LABEL: x.LABEL });
  return out;
}

export interface DetailItem {
  /** Short label, for example a GL account number or "Dead on arrival". */
  LABEL: string;
  SUBLABEL: string | null;
  VALUE: number | null;
  UNIT: string;
}

export interface LineDetail {
  items: DetailItem[];
  /** One sentence that says what the items are and how they add up to the line. */
  note: string;
}

/**
 * The items behind one built leaf line for one site and week: the kill build-up for kill lines,
 * else the GL accounts. Calculation lines also get a row for the standard cost they take off,
 * so the items add up to the line value.
 */
export async function getLineDetail(site: string, weekStart: string, lineId: number): Promise<LineDetail> {
  const head = (LABEL: string, VALUE: unknown, SUBLABEL: string | null = null): DetailItem => ({
    LABEL,
    SUBLABEL,
    VALUE: VALUE === null || VALUE === undefined ? null : Number(VALUE),
    UNIT: 'head',
  });

  if (lineId === 20) {
    const [k] = await rows<{ D: string; DOA: string; C: string; K: string; L: string }>(
      `SELECT SUM(BIRDS_DELIVERED) AS D, SUM(DOA) AS DOA, SUM(CONDEMNED) AS C, SUM(BIRDS_KILLED) AS K, SUM(LOADS) AS L
       FROM ${SCHEMA}.WPL_T_KILL_POULTRY WHERE SITE = ? AND WEEK_START = ?`,
      [site, weekStart],
    );
    return {
      note: 'Dungannon rule: birds delivered less dead on arrival. Condemnations are shown, but are not taken off. Void loads are out.',
      items: [
        head('Birds delivered', k?.D, `PLANTHDCOUNT, ${k?.L ?? 0} loads`),
        head('Less dead on arrival', k?.DOA === null || k?.DOA === undefined ? null : -Number(k.DOA), 'DOA'),
        head('Condemnations (not taken off)', k?.C, 'All codes, including croppings. Not in kill'),
      ],
    };
  }

  if (lineId === 10) {
    const [k] = await rows<{ Q: string; P: string; F: string; K: string; D: string }>(
      `SELECT SUM(KILLED_QTY) AS Q, SUM(TC_PRODUCER_RESP) AS P, SUM(TC_FACTORY_RESP) AS F, SUM(PIGS_KILLED) AS K,
              SUM(PIGS_DELIVERED) AS D
       FROM ${SCHEMA}.WPL_T_KILL_PORK WHERE SITE = ? AND WEEK_START = ?`,
      [site, weekStart],
    );
    const q = Number(k?.Q ?? 0);
    const p = Number(k?.P ?? 0);
    const f = Number(k?.F ?? 0);
    const floor = Number(k?.K ?? 0) - (q - p - f);
    return {
      note: `Pig rule: pigs over scale (Killed Qty) less TC'd pigs. Pigs delivered this week: ${Number(k?.D ?? 0).toLocaleString('en-GB')}.`,
      items: [
        head('Pigs over scale', q, 'Killed Qty on the Hellenic booking'),
        head("Less TC'd, producer resp.", -p, 'Condemnation, 3rd party'),
        head("Less TC'd, factory resp.", -f, 'Condemnation, 1st party'),
        ...(floor !== 0 ? [head('Days where Killed Qty is not final', floor, 'Kill for a day is not below 0')] : []),
      ],
    };
  }

  const [accounts, [line]] = await Promise.all([
    getLineAccounts(site, weekStart, lineId),
    rows<{ VALUE: string | null; LINE_GROUP: string; SOURCE_TYPE: string; RULE: string | null }>(
      `SELECT VALUE, LINE_GROUP, SOURCE_TYPE, RULE FROM ${SCHEMA}.WPL_T_WEEKLY_PL WHERE SITE = ? AND WEEK_START = ? AND LINE_ID = ?`,
      [site, weekStart, lineId],
    ),
  ]);
  const items: DetailItem[] = accounts.map((a) => ({
    LABEL: a.GLACCOUNT.replace(/^0+/, ''),
    SUBLABEL: a.ACCOUNTNAME ?? 'Unknown',
    VALUE: Number(a.VALUE),
    UNIT: 'GBP',
  }));
  const glTotal = items.reduce((s, i) => s + (i.VALUE ?? 0), 0);
  if (isRunRate(line)) {
    return {
      items,
      note: items.length
        ? 'GL accounts this week (actual). The P&L shows the 13-week run rate, so the accounts do not add up to the line.'
        : 'No GL postings this week. The P&L shows the 13-week run rate.',
    };
  }
  const diff = Number(line?.VALUE ?? 0) - glTotal;
  if (line?.SOURCE_TYPE === 'Calculation' && Math.abs(diff) >= 0.5) {
    items.push({ LABEL: 'Less standard cost', SUBLABEL: 'From COPA and released standard cost (see the rule)', VALUE: diff, UNIT: 'GBP' });
  }
  return { items, note: items.length ? 'GL line items this week, ledger 1L, by account.' : 'No GL postings this week.' };
}

/** RAG counts of the template (from the catalogue, not a site). */
export async function getRagCounts(): Promise<Record<string, number>> {
  const r = await rows<{ K: string; N: string }>(
    `SELECT COALESCE(RAG, 'Subtotal') AS K, COUNT(*) AS N FROM ${SCHEMA}.WPL_LINE GROUP BY 1`,
  );
  return Object.fromEntries(r.map((x) => [x.K, Number(x.N)]));
}

export async function getLines() {
  return rows(
    `SELECT LINE_ID, LINE_GROUP, LINE_NAME, SOURCE_TYPE, SOURCE_SYSTEM, RAG, REASON, RULE, UNIT, TICKET, COMPONENTS, LAYOUT
     FROM ${SCHEMA}.WPL_LINE ORDER BY LINE_ID`,
  );
}

/** GL accounts behind one line, for one site and week. */
export async function getLineAccounts(site: string, weekStart: string, lineId: number) {
  return rows<{ GLACCOUNT: string; ACCOUNTNAME: string | null; LINE_ITEMS: string; VALUE: string }>(
    `SELECT GLACCOUNT, ACCOUNTNAME, LINE_ITEMS, VALUE
     FROM ${SCHEMA}.WPL_T_GL_WEEK
     WHERE SITE = ? AND WEEK_START = ? AND LINE_ID = ?
     ORDER BY ABS(VALUE) DESC`,
    [site, weekStart, lineId],
  );
}

/** One line over the 13 weeks up to and including the given week. */
export async function getTrend(site: string, weekStart: string, lineId: number) {
  return rows<{ WEEK_START: string; FISCAL_WEEK: string; VALUE: string | null; ACTUAL_VALUE: string | null }>(
    `SELECT TO_VARCHAR(WEEK_START, 'YYYY-MM-DD') AS WEEK_START, FISCAL_WEEK, VALUE, ACTUAL_VALUE
     FROM ${SCHEMA}.WPL_T_WEEKLY_PL
     WHERE SITE = ? AND LINE_ID = ? AND WEEK_START BETWEEN DATEADD(week, -12, ?::DATE) AND ?::DATE
     ORDER BY WEEK_START`,
    [site, lineId, weekStart, weekStart],
  );
}

export async function getPoultryKill(site: string, weekStart: string) {
  return rows(
    `SELECT TO_VARCHAR(KILL_DATE, 'YYYY-MM-DD') AS KILL_DATE, LOADS, BIRDS_DELIVERED, DOA, CONDEMNED, BIRDS_KILLED
     FROM ${SCHEMA}.WPL_T_KILL_POULTRY WHERE SITE = ? AND WEEK_START = ? ORDER BY KILL_DATE`,
    [site, weekStart],
  );
}

export async function getPoultryCodes(site: string, weekStart: string) {
  return rows(
    `SELECT CODE, CODE_NAME, CALCULATIONCATEGORY, SUM(HEAD) AS HEAD
     FROM ${SCHEMA}.WPL_T_KILL_POULTRY_CODE WHERE SITE = ? AND WEEK_START = ?
     GROUP BY ALL HAVING SUM(HEAD) <> 0 ORDER BY HEAD DESC`,
    [site, weekStart],
  );
}

export async function getPorkKill(site: string, weekStart: string) {
  return rows(
    `SELECT TO_VARCHAR(KILL_DATE, 'YYYY-MM-DD') AS KILL_DATE, BOOKINGS, PIGS_DELIVERED, DOA, DIP, CASUALTY,
            TC_PRODUCER_RESP, TC_FACTORY_RESP, KILLED_QTY, PIGS_KILLED
     FROM ${SCHEMA}.WPL_T_KILL_PORK WHERE SITE = ? AND WEEK_START = ? ORDER BY KILL_DATE`,
    [site, weekStart],
  );
}

export interface Freshness {
  SOURCE: string;
  OBJECT_NAME: string;
  LAST_LOADED: string | null;
  DATA_TO: string | null;
  REFRESHED_AT: string | null;
}

export async function getFreshness(): Promise<Freshness[]> {
  return rows<Freshness>(
    `SELECT SOURCE, OBJECT_NAME, TO_VARCHAR(LAST_LOADED, 'YYYY-MM-DD HH24:MI') AS LAST_LOADED,
            TO_VARCHAR(DATA_TO, 'YYYY-MM-DD') AS DATA_TO, TO_VARCHAR(REFRESHED_AT, 'YYYY-MM-DD HH24:MI') AS REFRESHED_AT
     FROM ${SCHEMA}.WPL_T_DQ_FRESHNESS ORDER BY SOURCE`,
  );
}

export async function getUnmapped() {
  return rows(
    `SELECT SITE, GLACCOUNT, ACCOUNTNAME, GROUP_NAME, LINE_ITEMS, VALUE
     FROM ${SCHEMA}.WPL_T_DQ_UNMAPPED ORDER BY ABS(VALUE) DESC LIMIT 200`,
  );
}
