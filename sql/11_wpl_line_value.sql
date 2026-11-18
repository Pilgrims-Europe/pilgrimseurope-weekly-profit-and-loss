-- One value for each site, week and built line (leaf lines only, no subtotals).
-- Sign: income positive, cost negative. Tonnage in tonnes, kill in head, Total KG in kg.
-- Sales margin lines (2010 to 2210) use all COPA sales of the site: external and intercompany, edible and inedible (#52).
-- Overheads are a run rate: the average weekly GL value of the 13 weeks before the week.
-- In the first weeks of FY2026 fewer than 13 weeks are in the data, so the average uses the weeks that exist.
-- ACTUAL_VALUE holds the week's own GL value for overhead lines (for comparison in the app).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE_VALUE
COMMENT = 'Weekly P&L app: value of each built leaf line by site and week, from the WPL_* source views. Overheads = 13-week run rate; ACTUAL_VALUE = the week GL actual.'
AS
WITH sales AS (
    SELECT SITE, WEEK_START,
        SUM(IFF(NOT IS_INTERCO, EDIBLE_KG, 0)) / 1000      AS EXT_T,
        SUM(IFF(NOT IS_INTERCO, INEDIBLE_KG, 0)) / 1000    AS INEDIBLE_T,
        SUM(IFF(NOT IS_INTERCO, NSV, 0))                   AS EXT_NSV,
        SUM(IFF(NOT IS_INTERCO, STD_MATERIAL, 0))          AS EXT_MATERIAL,
        SUM(IFF(NOT IS_INTERCO, STD_PACKAGING, 0))         AS EXT_PACKAGING,
        SUM(IFF(NOT IS_INTERCO, STD_LABOUR, 0))            AS EXT_LABOUR,
        SUM(IFF(NOT IS_INTERCO, STD_FREIGHT, 0))           AS EXT_FREIGHT,
        SUM(IFF(IS_INTERCO, STD_FREIGHT, 0))               AS INT_FREIGHT,
        SUM(ALL_KG)                                        AS ALL_KG,
        SUM(GSV)                                           AS ALL_GSV,
        SUM(OSC)                                           AS ALL_OSC,
        SUM(STD_MEAT)                                      AS ALL_MEAT,
        SUM(STD_LABOUR)                                    AS ALL_LABOUR,
        SUM(STD_INGREDIENTS)                               AS ALL_INGREDIENTS,
        SUM(STD_PACKAGING)                                 AS ALL_PACKAGING,
        SUM(STD_COS)                                       AS ALL_COS,
        SUM(STD_FREIGHT)                                   AS ALL_FREIGHT
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SALES_WEEK
    GROUP BY ALL
),
mv AS (
    SELECT SITE, WEEK_START,
        STO_KG / 1000 AS STO_T, STO_NSV, STO_STD_MATERIAL, STO_STD_PACKAGING, STO_STD_LABOUR,
        PRODUCTION_KG / 1000 AS PRODUCTION_T
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_MOVEMENT_WEEK
),
gl AS (
    SELECT SITE, WEEK_START, LINE_ID, SUM(VALUE) AS VALUE
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_WEEK
    GROUP BY ALL
),
pilot_week AS (
    SELECT s.SITE, w.WEEK_START
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s CROSS JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w
    WHERE s.SITE_KIND = 'PILOT'
),
base AS (
    SELECT p.SITE, p.WEEK_START,
        sa.EXT_T, sa.INEDIBLE_T, sa.EXT_NSV, sa.EXT_MATERIAL, sa.EXT_PACKAGING, sa.EXT_LABOUR, sa.EXT_FREIGHT, sa.INT_FREIGHT,
        sa.ALL_KG, sa.ALL_GSV, sa.ALL_OSC, sa.ALL_MEAT, sa.ALL_LABOUR, sa.ALL_INGREDIENTS, sa.ALL_PACKAGING, sa.ALL_COS, sa.ALL_FREIGHT,
        m.STO_T, m.STO_NSV, m.STO_STD_MATERIAL, m.STO_STD_PACKAGING, m.STO_STD_LABOUR, m.PRODUCTION_T,
        COALESCE(g440.VALUE, 0) AS GL_PACKAGING,
        COALESCE(g810.VALUE, 0) AS GL_FREIGHT,
        COALESCE(g820.VALUE, 0) AS GL_DISTRIBUTION,
        y.VALUE AS SLICING_YIELD
    FROM pilot_week p
    LEFT JOIN sales sa ON sa.SITE = p.SITE AND sa.WEEK_START = p.WEEK_START
    LEFT JOIN mv m     ON m.SITE = p.SITE AND m.WEEK_START = p.WEEK_START
    LEFT JOIN gl g440  ON g440.SITE = p.SITE AND g440.WEEK_START = p.WEEK_START AND g440.LINE_ID = 440
    LEFT JOIN gl g810  ON g810.SITE = p.SITE AND g810.WEEK_START = p.WEEK_START AND g810.LINE_ID = 810
    LEFT JOIN gl g820  ON g820.SITE = p.SITE AND g820.WEEK_START = p.WEEK_START AND g820.LINE_ID = 820
    LEFT JOIN (SELECT SITE, WEEK_START, SUM(VALUE) AS VALUE FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_YIELD_WEEK WHERE IS_SLICING GROUP BY ALL) y
           ON y.SITE = p.SITE AND y.WEEK_START = p.WEEK_START
),
wide AS (
    SELECT SITE, WEEK_START,
        COALESCE(EXT_T, 0)::FLOAT                AS "40",
        COALESCE(INEDIBLE_T, 0)::FLOAT           AS "50",
        COALESCE(PRODUCTION_T, 0)::FLOAT         AS "60",
        COALESCE(EXT_NSV, 0)::FLOAT              AS "110",
        COALESCE(EXT_MATERIAL, 0)::FLOAT         AS "120",
        COALESCE(EXT_PACKAGING, 0)::FLOAT        AS "130",
        COALESCE(EXT_LABOUR, 0)::FLOAT           AS "140",
        COALESCE(EXT_FREIGHT, 0)::FLOAT          AS "160",
        COALESCE(STO_T, 0)::FLOAT                AS "210",
        COALESCE(STO_NSV, 0)::FLOAT              AS "220",
        COALESCE(STO_STD_MATERIAL, 0)::FLOAT     AS "230",
        COALESCE(STO_STD_PACKAGING, 0)::FLOAT    AS "240",
        COALESCE(STO_STD_LABOUR, 0)::FLOAT       AS "250",
        COALESCE(INT_FREIGHT, 0)::FLOAT          AS "270",
        COALESCE(SLICING_YIELD, 0)::FLOAT        AS "430",
        (GL_PACKAGING - (COALESCE(EXT_PACKAGING, 0) + COALESCE(STO_STD_PACKAGING, 0)))::FLOAT AS "440",
        (GL_FREIGHT - COALESCE(EXT_FREIGHT, 0))::FLOAT      AS "810",
        (GL_DISTRIBUTION - COALESCE(INT_FREIGHT, 0))::FLOAT AS "820",
        COALESCE(ALL_KG, 0)::FLOAT               AS "2010",
        COALESCE(ALL_GSV, 0)::FLOAT              AS "2020",
        COALESCE(ALL_OSC, 0)::FLOAT              AS "2040",
        COALESCE(ALL_MEAT, 0)::FLOAT             AS "2110",
        COALESCE(ALL_LABOUR, 0)::FLOAT           AS "2120",
        COALESCE(ALL_INGREDIENTS, 0)::FLOAT      AS "2130",
        COALESCE(ALL_PACKAGING, 0)::FLOAT        AS "2140",
        -- Other: gold cost of sales less the four silver components, so STD Cost of Goods ties to COPA (#51).
        (COALESCE(ALL_COS, 0) - COALESCE(ALL_MEAT, 0) - COALESCE(ALL_LABOUR, 0) - COALESCE(ALL_INGREDIENTS, 0) - COALESCE(ALL_PACKAGING, 0))::FLOAT AS "2150",
        COALESCE(ALL_FREIGHT, 0)::FLOAT          AS "2210"
    FROM base
),
calc AS (
    SELECT SITE, WEEK_START, LINE_KEY::NUMBER AS LINE_ID, VALUE
    FROM wide
    UNPIVOT (VALUE FOR LINE_KEY IN ("40", "50", "60", "110", "120", "130", "140", "160", "210", "220", "230", "240", "250", "270", "430", "440", "810", "820",
                                    "2010", "2020", "2040", "2110", "2120", "2130", "2140", "2150", "2210"))
),
gl_direct AS (
    SELECT SITE, WEEK_START, LINE_ID, VALUE
    FROM gl
    WHERE LINE_ID IN (410, 510, 520, 530, 550, 610, 620, 630, 640, 720)
),
overhead_week AS (
    -- Every pilot site, week and overhead line, with 0 when the week has no postings.
    SELECT p.SITE, p.WEEK_START, l.LINE_ID, COALESCE(g.VALUE, 0) AS VALUE
    FROM pilot_week p
    CROSS JOIN (SELECT LINE_ID FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE WHERE LINE_GROUP = 'Overheads' AND SOURCE_TYPE <> 'Subtotal') l
    LEFT JOIN gl g ON g.SITE = p.SITE AND g.WEEK_START = p.WEEK_START AND g.LINE_ID = l.LINE_ID
),
overhead AS (
    SELECT SITE, WEEK_START, LINE_ID,
        AVG(VALUE) OVER (PARTITION BY SITE, LINE_ID ORDER BY WEEK_START ROWS BETWEEN 13 PRECEDING AND 1 PRECEDING) AS VALUE,
        VALUE AS ACTUAL_VALUE
    FROM overhead_week
),
kill AS (
    SELECT SITE, WEEK_START, 20 AS LINE_ID, SUM(BIRDS_KILLED) AS VALUE FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_POULTRY GROUP BY ALL
    UNION ALL
    SELECT SITE, WEEK_START, 10, SUM(PIGS_KILLED) FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_PORK GROUP BY ALL
)
SELECT SITE, WEEK_START, LINE_ID, VALUE, NULL::FLOAT AS ACTUAL_VALUE FROM calc
UNION ALL SELECT SITE, WEEK_START, LINE_ID, VALUE, NULL FROM gl_direct
UNION ALL SELECT SITE, WEEK_START, LINE_ID, VALUE, ACTUAL_VALUE FROM overhead
UNION ALL SELECT SITE, WEEK_START, LINE_ID, VALUE, NULL FROM kill;
