-- GL account to template line.
-- Variance lines: accounts from Gui's PHASE 1 sheet (see reports/anaplan-line-tags.html),
-- changed by Gui's answers to questionnaires/line-sources-for-gui.html (tickets #4, #22).
-- STK lines also take physical inventory and production cost variance accounts: Raw and Ingredients to Materials,
-- SF to WIP, FG to F.Goods. Gui did not give a line for Trading Goods and Other: they go to Materials (assumption).
-- Stock revaluation accounts go to Revaluation (STK), not Traded Good (PPV).
-- Consumables: the P&L group CONSUMABLES plus 5297000 and 5297100 (P&L group ENGINEERING COSTS; Gui puts them in Consumables).
-- Production Material Yield also takes the production output credits (at standard), so actual less standard shows.
-- Packaging Yield: all other accounts in P&L group PACKAGING (actual packaging consumption).
-- Freight also takes the other carrier accounts (5010010 holds most of the freight cost).
-- Overhead lines: P&L group (GROUP_NAME) of company 125 in the P&L app fact. Recharge accounts go to Recharges.
-- Accounts are 10 digits with leading zeros, as in C_ACTUALPLANGL.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP
COMMENT = 'Weekly P&L app: GL account (10 digits) to template line. PHASE 1 accounts for variance lines; P&L group of company 125 for overhead lines.'
AS
WITH fixed (GLACCOUNT, LINE_ID) AS (
    SELECT column1, column2 FROM VALUES
    -- Production variances
    ('0005000295', 410), ('0005000395', 410), ('0005000435', 410), ('0005000490', 410),
    ('0005000035', 410), ('0005000095', 410), ('0005000100', 410),
    -- PPV
    ('0005000800', 510), ('0005000810', 510), ('0005000820', 510), ('0005000895', 510),
    ('0005030025', 520),
    ('0005000805', 510),
    ('0005030050', 550), ('0005000700', 550), ('0005000705', 550), ('0005000710', 550),
    -- STK
    ('0005001000', 610), ('0005001020', 610), ('0005000500', 610), ('0005000520', 610),
    ('0005000900', 610), ('0005000915', 610), ('0005000995', 610),
    ('0005030070', 620), ('0005030075', 620), ('0005030030', 620),
    ('0005001005', 630), ('0005000505', 630), ('0005000905', 630),
    ('0005001010', 640), ('0005000510', 640), ('0005000910', 640),
    ('0005000600', 645), ('0005000605', 645), ('0005000610', 645), ('0005000615', 645), ('0005000620', 645),
    ('0005030060', 645),
    -- OCI
    ('0005005100', 720), ('0005900230', 720), ('0007002990', 720),
    -- Consumables (accounts from P&L group ENGINEERING COSTS)
    ('0005297000', 1000), ('0005297100', 1000),
    -- Freight and distribution
    ('0005010000', 810), ('0005010010', 810), ('0005010020', 810), ('0005010050', 810),
    ('0005012000', 820)
),
pl_group AS (
    SELECT DISTINCT ACCOUNT AS GLACCOUNT, ACCOUNTNAME, GROUP_NAME, RECHARGES
    FROM FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE
    WHERE COMPANY_CODE = 'C125' AND A_B = 'ACTUAL'
),
overhead AS (
    SELECT GLACCOUNT,
        CASE
            WHEN RECHARGES = 'RECHARGES'                    THEN 1060
            WHEN GROUP_NAME = 'PACKAGING'                   THEN 440
            WHEN GROUP_NAME = 'INDIRECT WAGES/SALARIES'     THEN 910
            WHEN GROUP_NAME = 'EMPLOYEE BENEFITS'           THEN 920
            WHEN GROUP_NAME = 'TRAVEL COSTS'                THEN 930
            WHEN GROUP_NAME = 'UTILITIES'                   THEN 940
            WHEN GROUP_NAME = 'ENGINEERING COSTS'           THEN 950
            WHEN GROUP_NAME = 'HIRE/RENTAL'                 THEN 960
            WHEN GROUP_NAME = 'SITE SERVICES'               THEN 970
            WHEN GROUP_NAME = 'INFORMATION TECHNOLOGY'      THEN 980
            WHEN GROUP_NAME = 'FEES'                        THEN 990
            WHEN GROUP_NAME = 'CONSUMABLES'                 THEN 1000
            WHEN GROUP_NAME = 'FLEET COSTS'                 THEN 1010
            WHEN GROUP_NAME = 'INSURANCE'                   THEN 1020
            WHEN GROUP_NAME = 'MARKETING COSTS'             THEN 1030
            WHEN GROUP_NAME = 'OTHER'                       THEN 1040
            WHEN GROUP_NAME = 'DEPRECIATION'                THEN 1050
        END AS LINE_ID
    FROM pl_group
)
SELECT f.GLACCOUNT, f.LINE_ID, g.ACCOUNTNAME, g.GROUP_NAME, 'Fixed list (PHASE 1, Gui)' AS MAP_SOURCE
FROM fixed f LEFT JOIN pl_group g ON g.GLACCOUNT = f.GLACCOUNT
UNION ALL
SELECT o.GLACCOUNT, o.LINE_ID, g.ACCOUNTNAME, g.GROUP_NAME,
    IFF(o.LINE_ID = 440, 'P&L group (packaging consumption)', 'P&L group') AS MAP_SOURCE
FROM overhead o JOIN pl_group g ON g.GLACCOUNT = o.GLACCOUNT
WHERE o.LINE_ID IS NOT NULL
  AND o.GLACCOUNT NOT IN (SELECT GLACCOUNT FROM fixed);
