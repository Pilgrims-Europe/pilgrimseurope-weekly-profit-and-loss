-- Fiscal weeks for the weekly P&L (Monday to Sunday), from the finance calendar.
-- History starts at FY2025 week 1 (2024-12-30), so Last 12 Months works. Only complete weeks up to today are listed.
-- Fiscal months have 4, 5 and 4 weeks in each quarter. The app uses month, quarter and year for MTD, QTD and YTD.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK
COMMENT = 'Weekly P&L app: fiscal weeks (Monday to Sunday) from DIM_CALENDARMASTER, FY2025 onwards, complete weeks only, with fiscal month and quarter.'
AS
SELECT DISTINCT
    FISCAL_WEEK_START_DATE                 AS WEEK_START,
    FISCAL_WEEK_END_DATE                   AS WEEK_END,
    REPORTING_FISCAL_YEAR                  AS FISCAL_YEAR,
    REPORTING_FISCAL_WEEK                  AS FISCAL_WEEK,
    REPORTING_FISCAL_YEAR_WEEK             AS FISCAL_YEAR_WEEK,
    REPORTING_FISCAL_YEAR_PERIOD           AS FISCAL_YEAR_PERIOD,
    REPORTING_FISCAL_MONTH_NAME            AS FISCAL_MONTH_NAME,
    REPORTING_FISCAL_QUARTER               AS FISCAL_QUARTER
FROM PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER
WHERE FISCAL_WEEK_START_DATE >= '2024-12-30'
  AND FISCAL_WEEK_END_DATE < CURRENT_DATE();
