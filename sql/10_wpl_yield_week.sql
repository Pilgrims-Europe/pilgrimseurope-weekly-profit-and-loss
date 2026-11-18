-- Arolink yield for the pilot plants, by week (default rule for Slicing Material Yield).
-- GAIN_LOSS_YIELD = potential output kg - actual output kg (positive = loss).
-- VALUE = -(GAIN_LOSS_YIELD x PRICE_GBP): a yield loss is a cost (negative).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_YIELD_WEEK
COMMENT = 'Weekly P&L app: Arolink yield (FACTS_YIELD) for Redruth and Bromborough by week and factory stage. VALUE = -(potential - actual output kg) x PRICE_GBP.'
AS
SELECT
    s.SITE,
    w.WEEK_START,
    y.FACTORY_STAGE,
    y.FACTORY_STAGE ILIKE '%Slicing%'                   AS IS_SLICING,
    SUM(y.GAIN_LOSS_YIELD)                              AS LOSS_KG,
    -SUM(y.GAIN_LOSS_YIELD * y.PRICE_GBP)               AS VALUE
FROM PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD y
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.PLANT = y.SITE_ID
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON y.DATE BETWEEN w.WEEK_START AND w.WEEK_END
WHERE y.DATE >= '2024-12-30'
GROUP BY ALL;
