-- Goods movements for the pilot plants (MB51 grain), by posting date week. Base unit KG only.
-- Fiscal periods 2026002 and 2026003 hold duplicate rows: keep one row for each document item.
-- STO (default rule): movement type 641 credit rows (goods issue) less 642 reversals.
-- Production tonnage (default rule): Z61 receipts less Z62 reversals.
-- STO standard cost: released cost estimate (FACT_PRODUCT_COST_RELEASED, Z125, version 01, status FR)
-- valid on the posting date, in GBP per kg.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_MOVEMENT_WEEK
COMMENT = 'Weekly P&L app: goods movements for Redruth and Bromborough by week. STO kg (641 issue less 642) at released standard cost per kg; production kg (Z61 less Z62). Costs negative.'
AS
WITH mv AS (
    SELECT
        s.SITE,
        g.PLANT,
        g.MATERIAL,
        TRY_TO_DATE(g.POSTINGDATE, 'YYYYMMDD')                  AS POSTING_DATE,
        g.GOODSMOVEMENTTYPE,
        g.DEBITCREDITCODE,
        g.QUANTITYINBASEUNIT
    FROM PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS" g
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = g.PLANT
    WHERE g.POSTINGDATE >= '20251229'
      AND g.MATERIALBASEUNIT = 'KG'
      AND g.GOODSMOVEMENTTYPE IN ('641', '642', 'Z61', 'Z62')
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY g.MATERIALDOCUMENTYEAR, g.MATERIALDOCUMENT, g.MATERIALDOCUMENTITEM, g.MATERIALDOCUMENTRECORDTYPE
        ORDER BY g.MATERIALDOCUMENT) = 1
),
signed AS (
    SELECT
        SITE, PLANT, MATERIAL, POSTING_DATE,
        CASE
            WHEN GOODSMOVEMENTTYPE = '641' AND DEBITCREDITCODE = 'H' THEN QUANTITYINBASEUNIT
            WHEN GOODSMOVEMENTTYPE = '642'                           THEN QUANTITYINBASEUNIT
            ELSE 0
        END AS STO_KG,
        CASE WHEN GOODSMOVEMENTTYPE IN ('Z61', 'Z62') THEN QUANTITYINBASEUNIT ELSE 0 END AS PRODUCTION_KG
    FROM mv
),
cost AS (
    SELECT PLANT, MATERIAL,
        COST_ESTIMATE_VALIDITY_START_DATE AS VALID_FROM,
        COST_ESTIMATE_VALIDITY_END_DATE   AS VALID_TO,
        COALESCE(MEAT, 0) + COALESCE(INGREDIENTS, 0)            AS MATERIAL_PER_KG,
        COALESCE(PACKAGING, 0)                                  AS PACKAGING_PER_KG,
        COALESCE(LABOR_DIRECT, 0) + COALESCE(LABOUR_INDIRECT, 0) AS LABOUR_PER_KG,
        COALESCE(TOTAL_COST, 0)                                 AS TOTAL_PER_KG
    FROM PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED
    WHERE PLANT IN ('2504', '2506')
      AND COSTING_VARIANT = 'Z125'
      AND COSTING_VERSION = '01'
      AND COSTING_STATUS = 'FR'
      AND BASE_UNIT = 'KG'
      AND COALESCE(MATERIAL_PRICE_UNIT_QUANTITY, 1) = 1
    QUALIFY ROW_NUMBER() OVER (PARTITION BY PLANT, MATERIAL, COST_ESTIMATE_VALIDITY_START_DATE ORDER BY COST_ESTIMATE_RELEASE_DATE DESC) = 1
)
SELECT
    sg.SITE,
    w.WEEK_START,
    SUM(sg.STO_KG)                                              AS STO_KG,
    SUM(IFF(sg.STO_KG <> 0 AND c.MATERIAL IS NULL, sg.STO_KG, 0)) AS STO_KG_NO_COST,
    SUM(sg.STO_KG * c.TOTAL_PER_KG)                             AS STO_NSV,
    -SUM(sg.STO_KG * c.MATERIAL_PER_KG)                         AS STO_STD_MATERIAL,
    -SUM(sg.STO_KG * c.PACKAGING_PER_KG)                        AS STO_STD_PACKAGING,
    -SUM(sg.STO_KG * c.LABOUR_PER_KG)                           AS STO_STD_LABOUR,
    SUM(sg.PRODUCTION_KG)                                       AS PRODUCTION_KG
FROM signed sg
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON sg.POSTING_DATE BETWEEN w.WEEK_START AND w.WEEK_END
LEFT JOIN cost c
  ON c.PLANT = sg.PLANT AND c.MATERIAL = sg.MATERIAL
 AND sg.POSTING_DATE BETWEEN c.VALID_FROM AND c.VALID_TO
GROUP BY ALL;
