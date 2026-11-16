/**
 * Server-side data access for the weekly P&L app. Owner's rights: the app reads the WPL_T_* tables
 * in DEV_ANALYTICS.FINANCE_PL_WEEKLY. WPL_REFRESH rebuilds them each day at 11:00 UTC from the WPL_* views.
 * Every user-supplied value goes in as a bind parameter. Server code only.
 */
import { snowflake } from '@/lib/snowflake';

const SCHEMA = 'DEV_ANALYTICS.FINANCE_PL_WEEKLY';

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

/** The template lines for one site and week, with last week's value for comparison. */
export async function getPl(site: string, weekStart: string): Promise<PlLine[]> {
  return rows<PlLine>(
    `SELECT c.LINE_ID, c.LINE_GROUP, c.LINE_NAME, c.SOURCE_TYPE, c.SOURCE_SYSTEM, c.RAG, c.REASON, c.RULE, c.UNIT, c.TICKET,
            c.STATUS, c.VALUE, c.ACTUAL_VALUE, p.VALUE AS PREV_VALUE, c.MISSING_COMPONENTS
     FROM ${SCHEMA}.WPL_T_WEEKLY_PL c
     LEFT JOIN ${SCHEMA}.WPL_T_WEEKLY_PL p
       ON p.SITE = c.SITE AND p.LINE_ID = c.LINE_ID AND p.WEEK_START = DATEADD(week, -1, c.WEEK_START)
     WHERE c.SITE = ? AND c.WEEK_START = ?
     ORDER BY c.LINE_ID`,
    [site, weekStart],
  );
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
            TC_PRODUCER_RESP, TC_FACTORY_RESP, PIGS_KILLED
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
