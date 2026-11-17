/**
 * Server-side data access for the weekly P&L app. Owner's rights: the app reads the WPL_T_* tables
 * in DEV_ANALYTICS.FINANCE_PL_WEEKLY. WPL_REFRESH rebuilds them each day at 11:00 UTC from the WPL_* views.
 * WPL_SCHEMA (local development only) points the app at a test copy of the schema.
 * Every user-supplied value goes in as a bind parameter. Server code only.
 */
import { snowflake } from '@/lib/snowflake';

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
}

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
    `SELECT DISTINCT TO_VARCHAR(WEEK_START, 'YYYY-MM-DD') AS WEEK_START, FISCAL_WEEK, FISCAL_YEAR
     FROM ${SCHEMA}.WPL_T_WEEKLY_PL ORDER BY WEEK_START DESC`,
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
export async function getPl(weekStart: string, site?: string): Promise<PlLine[]> {
  return rows<PlLine>(
    `SELECT c.SITE, c.SITE_KIND, c.LINE_ID, c.LINE_GROUP, c.LINE_NAME, c.SOURCE_TYPE, c.SOURCE_SYSTEM, c.RAG, c.REASON, c.RULE,
            c.UNIT, c.TICKET, c.STATUS, c.VALUE, c.ACTUAL_VALUE, p.VALUE AS PREV_VALUE, c.MISSING_COMPONENTS, c.COMPONENTS,
            l.RATIO_NUM, l.RATIO_DEN, l.RATIO_SCALE
     FROM ${SCHEMA}.WPL_T_WEEKLY_PL c
     JOIN ${SCHEMA}.WPL_LINE l ON l.LINE_ID = c.LINE_ID
     LEFT JOIN ${SCHEMA}.WPL_T_WEEKLY_PL p
       ON p.SITE = c.SITE AND p.LINE_ID = c.LINE_ID AND p.WEEK_START = DATEADD(week, -1, c.WEEK_START)
     WHERE c.WEEK_START = ? AND (? = '' OR c.SITE = ?)
     ORDER BY c.LINE_ID, c.SITE_ORDER`,
    [weekStart, site ?? '', site ?? ''],
  );
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
    rows<{ VALUE: string | null; LINE_GROUP: string; SOURCE_TYPE: string }>(
      `SELECT VALUE, LINE_GROUP, SOURCE_TYPE FROM ${SCHEMA}.WPL_T_WEEKLY_PL WHERE SITE = ? AND WEEK_START = ? AND LINE_ID = ?`,
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
  if (line?.LINE_GROUP === 'Overheads') {
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
    `SELECT LINE_ID, LINE_GROUP, LINE_NAME, SOURCE_TYPE, SOURCE_SYSTEM, RAG, REASON, RULE, UNIT, TICKET, COMPONENTS
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
