-- Sales at standard for the pilot plants (2504 Redruth, 2506 Bromborough), by posting date week.
-- Gold FACT_COPAPEUS4 (RECORD_SOURCE = 'Actual'): kg, G.S.V., O.S.C, NSV, cost of sales, standard freight, edible flag, intercompany flag.
-- COPA actuals for the pilot plants start in the week of 2025-04-21. WPL_LINE.DATA_FROM marks the lines that use them.
-- Silver C_PROFITABILITYANAL_COSTING_PEU_SAP_STG: standard cost split. Intercompany uses the gold rule
-- (payer account group Z100 or Z109), so silver and gold split the same rows.
-- Sign: G.S.V. and NSV positive, costs negative. Gold FREIGHT_STAT and TOTAL_OSC are already negative.

-- Detail: one row for each site, week, intercompany flag, sold-to customer and material.
-- The Sales margin tab filters on customer, category, business unit and material from this view.
-- Gold and silver join on sold-to and material (same SAP keys in both tables).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SALES_DETAIL
COMMENT = 'Weekly P&L app: COPA sales for Redruth and Bromborough by week, intercompany flag, sold-to customer and material, with customer name, category and business unit. Gold: kg, G.S.V., O.S.C, NSV, cost of sales, standard freight. Silver: standard cost split. Income +, cost -.'
AS
WITH gold AS (
    SELECT
        s.SITE,
        w.WEEK_START,
        c.INTERCO_FLAG = 'Interco'                                              AS IS_INTERCO,
        c.SOLD_TO_PARTY,
        c.MATERIAL,
        -- One business unit for each key (the pilot sites have one). MAX keeps the join 1 to 1.
        MAX(c.BUSINESS_UNIT)                                                    AS BUSINESS_UNIT,
        SUM(IFF(c.EDIBLE_FLAG = 'Edible',   c.SALES_KG, 0))                     AS EDIBLE_KG,
        SUM(IFF(c.EDIBLE_FLAG = 'Inedible', c.QUANTITY_IN_KG, 0))               AS INEDIBLE_KG,
        SUM(c.QUANTITY_IN_KG)                                                   AS ALL_KG,
        SUM(c.GROSS_REVENUE_GBP_CALC)                                           AS GSV,
        SUM(c.TOTAL_OSC_GBP_CALC)                                               AS OSC,
        SUM(c.NET_REVENUE_GBP_CALC)                                             AS NSV,
        -SUM(c.COS_GBP_CALC)                                                    AS STD_COS,
        SUM(c.FREIGHT_STAT_GBP_CALC)                                            AS STD_FREIGHT
    FROM PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4 c
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = c.PLANT
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON c.POSTING_DATE BETWEEN w.WEEK_START AND w.WEEK_END
    WHERE c.RECORD_SOURCE = 'Actual'
      AND c.POSTING_DATE >= '2024-12-30'
    GROUP BY s.SITE, w.WEEK_START, IS_INTERCO, c.SOLD_TO_PARTY, c.MATERIAL
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
        c.SOLD_TO_PARTY,
        c.MATERIAL,
        -SUM(COALESCE(c.COST_COMPONENT_MEAT, 0) + COALESCE(c.COST_COMPONENT_INGREDIENTS, 0)) AS STD_MATERIAL,
        -SUM(COALESCE(c.COST_COMPONENT_MEAT, 0))                                AS STD_MEAT,
        -SUM(COALESCE(c.COST_COMPONENT_INGREDIENTS, 0))                         AS STD_INGREDIENTS,
        -SUM(COALESCE(c.COST_COMPONENT_PACKAGING, 0))                           AS STD_PACKAGING,
        -SUM(COALESCE(c.CC_COST005, 0) + COALESCE(c.CC_COST009, 0))             AS STD_LABOUR
    FROM PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG c
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = c.PLANT
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON c.POSTING_DATE BETWEEN w.WEEK_START AND w.WEEK_END
    LEFT JOIN payer p ON p.SOLD_TO_NUMBER = c.PAYER
    WHERE c.POSTING_DATE >= '2024-12-30'
    GROUP BY ALL
),
customer AS (
    SELECT SOLD_TO_NUMBER, MAX(CUSTOMER_NAME) AS CUSTOMER_NAME
    FROM PROD_ANALYTICS.FINANCE_MT.DIM_CUSTOMERMASTER
    GROUP BY 1
),
material AS (
    SELECT LTRIM(MATERIAL_NUMBER, '0') AS MATERIAL_KEY, MAX(MATERIAL_DESC) AS MATERIAL_DESC, MAX(CATEGORY_HEADING) AS CATEGORY
    FROM PROD_ANALYTICS.FINANCE_MT.DIM_MASTERMATERIALGROUPINGS
    GROUP BY 1
),
joined AS (
    SELECT
        COALESCE(g.SITE, v.SITE)                    AS SITE,
        COALESCE(g.WEEK_START, v.WEEK_START)        AS WEEK_START,
        COALESCE(g.IS_INTERCO, v.IS_INTERCO)        AS IS_INTERCO,
        COALESCE(g.SOLD_TO_PARTY, v.SOLD_TO_PARTY)  AS SOLD_TO,
        COALESCE(g.MATERIAL, v.MATERIAL)            AS MATERIAL,
        g.BUSINESS_UNIT,
        g.EDIBLE_KG, g.INEDIBLE_KG, g.ALL_KG, g.GSV, g.OSC, g.NSV, g.STD_COS, g.STD_FREIGHT,
        v.STD_MATERIAL, v.STD_MEAT, v.STD_INGREDIENTS, v.STD_PACKAGING, v.STD_LABOUR
    FROM gold g
    FULL OUTER JOIN silver v
      ON v.SITE = g.SITE AND v.WEEK_START = g.WEEK_START AND v.IS_INTERCO = g.IS_INTERCO
     AND v.SOLD_TO_PARTY IS NOT DISTINCT FROM g.SOLD_TO_PARTY AND v.MATERIAL IS NOT DISTINCT FROM g.MATERIAL
)
SELECT
    j.SITE,
    j.WEEK_START,
    j.IS_INTERCO,
    j.SOLD_TO,
    COALESCE(cu.CUSTOMER_NAME, 'Unknown')           AS CUSTOMER_NAME,
    LTRIM(j.MATERIAL, '0')                          AS MATERIAL_CODE,
    COALESCE(m.MATERIAL_DESC, 'Unknown')            AS MATERIAL_DESC,
    COALESCE(m.CATEGORY, 'Unknown')                 AS CATEGORY,
    COALESCE(j.BUSINESS_UNIT, 'Unknown')            AS BUSINESS_UNIT,
    j.EDIBLE_KG, j.INEDIBLE_KG, j.ALL_KG, j.GSV, j.OSC, j.NSV, j.STD_COS, j.STD_FREIGHT,
    j.STD_MATERIAL, j.STD_MEAT, j.STD_INGREDIENTS, j.STD_PACKAGING, j.STD_LABOUR
FROM joined j
LEFT JOIN customer cu ON cu.SOLD_TO_NUMBER = j.SOLD_TO
LEFT JOIN material m ON m.MATERIAL_KEY = LTRIM(j.MATERIAL, '0');

-- Totals by site, week and intercompany flag (the P&L lines use these).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SALES_WEEK
COMMENT = 'Weekly P&L app: COPA sales for Redruth and Bromborough by week and intercompany flag. Gold: kg, edible kg, G.S.V., O.S.C, NSV, cost of sales, standard freight. Silver: standard meat, ingredients, packaging, labour. Income +, cost -.'
AS
SELECT
    SITE, WEEK_START, IS_INTERCO,
    SUM(EDIBLE_KG) AS EDIBLE_KG, SUM(INEDIBLE_KG) AS INEDIBLE_KG, SUM(ALL_KG) AS ALL_KG,
    SUM(GSV) AS GSV, SUM(OSC) AS OSC, SUM(NSV) AS NSV, SUM(STD_COS) AS STD_COS, SUM(STD_FREIGHT) AS STD_FREIGHT,
    SUM(STD_MATERIAL) AS STD_MATERIAL, SUM(STD_MEAT) AS STD_MEAT, SUM(STD_INGREDIENTS) AS STD_INGREDIENTS,
    SUM(STD_PACKAGING) AS STD_PACKAGING, SUM(STD_LABOUR) AS STD_LABOUR
FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SALES_DETAIL
GROUP BY ALL;
