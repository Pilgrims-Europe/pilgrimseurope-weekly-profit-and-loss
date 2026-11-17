-- GL line items for the pilot sites, summed by site, fiscal week and account, with the template line.
-- Company code 125, ledger 1L only (0L holds the same lines), actuals, period 000 out.
-- VALUE sign: income positive, cost negative (= minus the company code amount).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_WEEK
COMMENT = 'Weekly P&L app: GL line items (C_ACTUALPLANGL, company 125, ledger 1L) for Redruth and Bromborough by fiscal week and account, mapped to template lines. VALUE: income +, cost -.'
AS
SELECT
    s.SITE,
    w.WEEK_START,
    m.LINE_ID,
    g.GLACCOUNT,
    m.ACCOUNTNAME,
    m.GROUP_NAME,
    COUNT(*)                                        AS LINE_ITEMS,
    -SUM(g.AMOUNTINCOMPANYCODECURRENCY)             AS VALUE
FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL" g
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s
  ON s.PROFIT_CENTER = g.PROFITCENTER
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP m
  ON m.GLACCOUNT = g.GLACCOUNT
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w
  ON TRY_TO_DATE(g.POSTINGDATE, 'YYYYMMDD') BETWEEN w.WEEK_START AND w.WEEK_END
WHERE g.COMPANYCODE = '125'
  AND g.LEDGER = '1L'
  AND g.POSTINGDATE >= '20251229'
  AND g.POSTINGDATE <> '00000000'
GROUP BY ALL;
