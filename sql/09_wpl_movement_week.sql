-- Goods movements for the pilot plants (MB51 grain), by posting date week.
-- Fiscal periods 2026002 and 2026003 hold duplicate rows: keep one row for each document item.
-- STO (ticket #86): cross-plant transfers only (ISCROSSPLANTTRANSFER = 'X'). Movement type 641 credit rows (goods issue)
-- plus 642 debit rows with S (reversals of issues, negative quantity). Moves inside the plant (641 H and S of the same size) are not STO.
-- 642 rows with H reverse goods received from other plants: they are not STO. Base unit KG only.
-- Production tonnage (ticket #35, not confirmed by site finance): finished goods only.
-- Z61 receipts less Z62 reversals on GL 0005000100. Cases (CS) x material NET_WEIGHT (KG).
-- Z61 also has a receipt for each semi-finished stage (GL 0005000095): those are left out.
-- STO standard cost: released cost estimate (FACT_PRODUCT_COST_RELEASED, Z125, version 01, status FR)
-- valid on the posting date, in GBP per kg.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_MOVEMENT_WEEK
COMMENT = 'Weekly P&L app: goods movements for Redruth and Bromborough by week. STO kg (cross-plant 641 issue less 642 reversal of issue) at released standard cost per kg; production kg = finished goods (Z61 less Z62, GL 5000100, cases x net weight). Costs negative.'
AS
WITH mv AS (
    SELECT
        s.SITE,
        g.PLANT,
        g.MATERIAL,
        TRY_TO_DATE(g.POSTINGDATE, 'YYYYMMDD')                  AS POSTING_DATE,
        g.GOODSMOVEMENTTYPE,
        g.DEBITCREDITCODE,
        g.ISCROSSPLANTTRANSFER,
        g.GLACCOUNT,
        g.MATERIALBASEUNIT,
        g.QUANTITYINBASEUNIT
    FROM PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS" g
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = g.PLANT
    WHERE g.POSTINGDATE >= '20241230'
      AND (   (g.GOODSMOVEMENTTYPE IN ('641', '642') AND g.MATERIALBASEUNIT = 'KG')
           OR (g.GOODSMOVEMENTTYPE IN ('Z61', 'Z62') AND g.GLACCOUNT = '0005000100' AND g.MATERIALBASEUNIT IN ('KG', 'CS')))
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY g.MATERIALDOCUMENTYEAR, g.MATERIALDOCUMENT, g.MATERIALDOCUMENTITEM, g.MATERIALDOCUMENTRECORDTYPE
        ORDER BY g.MATERIALDOCUMENT) = 1
),
-- Net weight in kg for each material. One material can have 2 rows with the same weight.
net_weight AS (
    SELECT LTRIM(MATERIAL_NUMBER, '0') AS MATERIAL_KEY, MAX(NET_WEIGHT) AS NET_KG
    FROM PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER
    WHERE WEIGHT_UNIT = 'KG'
    GROUP BY 1
),
signed AS (
    SELECT
        mv.SITE, mv.PLANT, mv.MATERIAL, mv.POSTING_DATE,
        CASE
            WHEN mv.ISCROSSPLANTTRANSFER = 'X' AND mv.GOODSMOVEMENTTYPE = '641' AND mv.DEBITCREDITCODE = 'H' THEN mv.QUANTITYINBASEUNIT
            WHEN mv.ISCROSSPLANTTRANSFER = 'X' AND mv.GOODSMOVEMENTTYPE = '642' AND mv.DEBITCREDITCODE = 'S' THEN mv.QUANTITYINBASEUNIT
            ELSE 0
        END AS STO_KG,
        CASE
            WHEN mv.GOODSMOVEMENTTYPE NOT IN ('Z61', 'Z62') THEN 0
            WHEN mv.MATERIALBASEUNIT = 'KG'                 THEN mv.QUANTITYINBASEUNIT
            ELSE mv.QUANTITYINBASEUNIT * nw.NET_KG
        END AS PRODUCTION_KG
    FROM mv
    LEFT JOIN net_weight nw ON nw.MATERIAL_KEY = LTRIM(mv.MATERIAL, '0')
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
