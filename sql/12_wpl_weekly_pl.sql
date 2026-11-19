-- The weekly P&L: one row for each site, week and template line, with value, RAG, status and rule.
-- Pilot sites get every line. Kill sites get their kill line only.
-- Leaf lines: value from WPL_LINE_VALUE (0 when the week has no data). Red lines have no value.
-- Weeks before the line's DATA_FROM (COPA starts 2025-04-21) get status 'No data' and no value.
-- Subtotals: sum of their leaf components. MISSING_COMPONENTS counts components with no value (Red or empty).
-- Ratios: numerator / (denominator x scale). EBIT % and Percentage Ext C/S are shown as a fraction.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEKLY_PL
COMMENT = 'Weekly P&L app: the weekly P&L by site, week and template line with value, RAG, status, rule and subtotals. Income +, cost -.'
AS
WITH grid AS (
    SELECT s.SITE, s.SITE_KIND, s.SITE_ORDER, w.WEEK_START, w.WEEK_END, w.FISCAL_YEAR, w.FISCAL_WEEK, w.FISCAL_YEAR_WEEK, l.*
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s
    CROSS JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w
    CROSS JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE l
    WHERE s.SITE_KIND = 'PILOT' OR l.SITE_SCOPE = s.SITE_KIND
),
leaf AS (
    SELECT g.*,
        CASE
            WHEN g.SOURCE_TYPE = 'Subtotal'                              THEN 'Subtotal'
            WHEN g.RAG = 'Red'                                           THEN 'Not built'
            WHEN g.SITE_SCOPE IN ('POULTRY_KILL', 'PORK_KILL')
             AND g.SITE_KIND <> g.SITE_SCOPE                             THEN 'Not a kill site'
            WHEN g.WEEK_START < g.DATA_FROM                              THEN 'No data'
            WHEN g.LINE_ID IN (420, 710)                                 THEN 'Empty'
            ELSE 'Built'
        END AS STATUS,
        v.ACTUAL_VALUE,
        v.VALUE AS RAW_VALUE
    FROM grid g
    LEFT JOIN (
        SELECT SITE, WEEK_START, LINE_ID, SUM(VALUE) AS VALUE, SUM(ACTUAL_VALUE) AS ACTUAL_VALUE
        FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE_VALUE GROUP BY ALL
    ) v ON v.SITE = g.SITE AND v.WEEK_START = g.WEEK_START AND v.LINE_ID = g.LINE_ID
),
leaf_value AS (
    SELECT leaf.* EXCLUDE (RAW_VALUE),
        IFF(STATUS = 'Built', COALESCE(RAW_VALUE, 0), NULL) AS VALUE
    FROM leaf
),
component AS (
    SELECT l.SITE, l.WEEK_START, l.LINE_ID,
        IFF(STARTSWITH(c.VALUE, '-'), -1, 1)     AS SIGN,
        LTRIM(c.VALUE, '-')::NUMBER              AS COMPONENT_ID
    FROM leaf_value l,
    LATERAL SPLIT_TO_TABLE(l.COMPONENTS, ' ') c
    WHERE l.SOURCE_TYPE = 'Subtotal' AND l.COMPONENTS IS NOT NULL
),
subtotal AS (
    SELECT c.SITE, c.WEEK_START, c.LINE_ID,
        SUM(c.SIGN * v.VALUE)                    AS VALUE,
        COUNT_IF(v.VALUE IS NULL)                AS MISSING_COMPONENTS,
        COUNT(*)                                 AS COMPONENT_COUNT
    FROM component c
    JOIN leaf_value v ON v.SITE = c.SITE AND v.WEEK_START = c.WEEK_START AND v.LINE_ID = c.COMPONENT_ID
    GROUP BY ALL
),
step1 AS (
    SELECT l.* EXCLUDE (VALUE),
        COALESCE(s.VALUE, l.VALUE)               AS VALUE,
        s.MISSING_COMPONENTS,
        s.COMPONENT_COUNT
    FROM leaf_value l
    LEFT JOIN subtotal s ON s.SITE = l.SITE AND s.WEEK_START = l.WEEK_START AND s.LINE_ID = l.LINE_ID
)
SELECT
    a.SITE, a.SITE_KIND, a.SITE_ORDER, a.WEEK_START, a.WEEK_END, a.FISCAL_YEAR, a.FISCAL_WEEK, a.FISCAL_YEAR_WEEK,
    a.LINE_ID, a.LINE_GROUP, a.LINE_NAME, a.SOURCE_TYPE, a.SOURCE_SYSTEM, a.RAG, a.REASON, a.RULE, a.UNIT, a.TICKET, a.LAYOUT,
    a.STATUS,
    CASE
        WHEN a.RATIO_NUM IS NOT NULL THEN DIV0NULL(n.VALUE, d.VALUE * a.RATIO_SCALE)
        ELSE a.VALUE
    END                                          AS VALUE,
    a.ACTUAL_VALUE,
    COALESCE(a.MISSING_COMPONENTS, IFF(a.RATIO_NUM IS NOT NULL, COALESCE(n.MISSING_COMPONENTS, 0) + COALESCE(d.MISSING_COMPONENTS, 0), NULL)) AS MISSING_COMPONENTS,
    a.COMPONENT_COUNT,
    a.COMPONENTS
FROM step1 a
LEFT JOIN step1 n ON n.SITE = a.SITE AND n.WEEK_START = a.WEEK_START AND n.LINE_ID = a.RATIO_NUM
LEFT JOIN step1 d ON d.SITE = a.SITE AND d.WEEK_START = a.WEEK_START AND d.LINE_ID = a.RATIO_DEN;
