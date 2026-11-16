-- Fiscal weeks for the weekly P&L (Monday to Sunday), from the finance calendar.
-- FY2026 starts on 2025-12-29. Only complete weeks up to today are listed.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK
COMMENT = 'Weekly P&L app: fiscal weeks (Monday to Sunday) from DIM_CALENDARMASTER, FY2026 onwards, complete weeks only.'
AS
SELECT DISTINCT
    FISCAL_WEEK_START_DATE                 AS WEEK_START,
    FISCAL_WEEK_END_DATE                   AS WEEK_END,
    REPORTING_FISCAL_YEAR                  AS FISCAL_YEAR,
    REPORTING_FISCAL_WEEK                  AS FISCAL_WEEK,
    REPORTING_FISCAL_YEAR_WEEK             AS FISCAL_YEAR_WEEK,
    REPORTING_FISCAL_YEAR_PERIOD           AS FISCAL_YEAR_PERIOD
FROM PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER
WHERE FISCAL_WEEK_START_DATE >= '2025-12-29'
  AND FISCAL_WEEK_END_DATE < CURRENT_DATE();
