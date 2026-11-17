-- Sales at standard for the pilot plants (2504 Redruth, 2506 Bromborough), by posting date week.
-- Gold FACT_COPAPEUS4 (RECORD_SOURCE = 'Actual'): kg, NSV, standard freight, edible flag, intercompany flag.
-- Silver C_PROFITABILITYANAL_COSTING_PEU_SAP_STG: standard cost split. Intercompany uses the gold rule
-- (payer account group Z100 or Z109), so silver and gold split the same rows.
-- Sign: NSV positive, costs negative. Gold FREIGHT_STAT is already negative.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SALES_WEEK
COMMENT = 'Weekly P&L app: COPA sales for Redruth and Bromborough by week and intercompany flag. Gold: kg, edible kg, NSV, standard freight. Silver: standard material, packaging, labour. Income +, cost -.'
AS
WITH gold AS (
    SELECT
        s.SITE,
        w.WEEK_START,
        c.INTERCO_FLAG = 'Interco'                                              AS IS_INTERCO,
        SUM(IFF(c.EDIBLE_FLAG = 'Edible',   c.SALES_KG, 0))                     AS EDIBLE_KG,
        SUM(IFF(c.EDIBLE_FLAG = 'Inedible', c.QUANTITY_IN_KG, 0))               AS INEDIBLE_KG,
        SUM(c.NET_REVENUE_GBP_CALC)                                             AS NSV,
        SUM(c.FREIGHT_STAT_GBP_CALC)                                            AS STD_FREIGHT
    FROM PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4 c
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = c.PLANT
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON c.POSTING_DATE BETWEEN w.WEEK_START AND w.WEEK_END
    WHERE c.RECORD_SOURCE = 'Actual'
      AND c.POSTING_DATE >= '2025-12-29'
    GROUP BY ALL
),
payer AS (
    SELECT SOLD_TO_NUMBER, CUSTOMER_ACCOUNT_GROUP
    FROM PROD_ANALYTICS.FINANCE_MT.DIM_CUSTOMERMASTER
    QUALIFY ROW_NUMBER() OVER (PARTITION BY SOLD_TO_NUMBER ORDER BY SOLD_TO_NUMBER) = 1
),
silver AS (
    SELECT
        s.SITE,
        w.WEEK_START,
        COALESCE(p.CUSTOMER_ACCOUNT_GROUP IN ('Z100', 'Z109'), FALSE)           AS IS_INTERCO,
        -SUM(COALESCE(c.COST_COMPONENT_MEAT, 0) + COALESCE(c.COST_COMPONENT_INGREDIENTS, 0)) AS STD_MATERIAL,
        -SUM(COALESCE(c.COST_COMPONENT_PACKAGING, 0))                           AS STD_PACKAGING,
        -SUM(COALESCE(c.CC_COST005, 0) + COALESCE(c.CC_COST009, 0))             AS STD_LABOUR
    FROM PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG c
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = c.PLANT
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON c.POSTING_DATE BETWEEN w.WEEK_START AND w.WEEK_END
    LEFT JOIN payer p ON p.SOLD_TO_NUMBER = c.PAYER
    WHERE c.POSTING_DATE >= '2025-12-29'
    GROUP BY ALL
)
SELECT
    COALESCE(g.SITE, v.SITE)                AS SITE,
    COALESCE(g.WEEK_START, v.WEEK_START)    AS WEEK_START,
    COALESCE(g.IS_INTERCO, v.IS_INTERCO)    AS IS_INTERCO,
    g.EDIBLE_KG,
    g.INEDIBLE_KG,
    g.NSV,
    g.STD_FREIGHT,
    v.STD_MATERIAL,
    v.STD_PACKAGING,
    v.STD_LABOUR
FROM gold g
FULL OUTER JOIN silver v
  ON v.SITE = g.SITE AND v.WEEK_START = g.WEEK_START AND v.IS_INTERCO = g.IS_INTERCO;
