# Does the weekly P&L GL map agree with the Monthly P&L mapping?

Ticket: #78. The Monthly P&L has a maintenance app. The app maps each GL account to an account group, and each account group to P&L levels. Gui wants the weekly P&L to use the same mapping for G.S.V. ("gross sales"), sales deductions, COGS at standard and overheads. This note finds the mapping in Snowflake and compares it with the weekly P&L GL map for Redruth and Bromborough. Research date: 2026-11-20.

## Short answer

1. The mapping is in two tables of the Streamlit app "Pilgrims Europe: Profit & Loss Maintenance v1.0". `S4ACC_MANAGED` maps a GL account to an account group. `ACCOUNTGROUPS_MANAGED` maps an account group to a group name and 13 P&L levels. Both are in `PROD_STAGING.FINANCE_PL`.
2. Overheads: the weekly P&L already uses this mapping, through `FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE`. 11 of 16 overhead lines agree account by account. Five lines differ, because of two weekly rules. The Recharges line takes 4 accounts out of Fees and Marketing Costs. The amounts are GBP 3.05 million at Redruth and GBP 4.28 million at Bromborough. Consumables takes 2 accounts from Engineering Costs (GBP 0.12 million, GBP 0.03 million). The sum of the overhead lines is the same.
3. G.S.V., O.S.C and STD Cost of Goods: the weekly P&L reads COPA, not the GL. The main GL account of each group agrees with COPA. The monthly groups also hold manual accounts that are not in COPA. Example: 5003810 COGS manual, GBP 1.54 million at Redruth.
4. Variances: the monthly groups do not agree with the weekly variance lines. Gui said not to use them. The mapping has groups named Price Variances, Purchasing Variances and Stock Variances, but no labour or yield group. It has no group for Credit Note Adj, Price Corrections, Overrider Adj or Promotional Adj.
5. Some monthly groups have postings at the pilot sites but no weekly line. The largest are Direct Wages (GBP 5.80 million, GBP 7.37 million) and 5004600 COGS-Purchases-Interco (GBP 1.59 million at Redruth).
6. Yes, the weekly P&L can read the mapping directly from `S4ACC_STG` and `ACCOUNTGROUPS_STG`. The same role owns these views and the weekly views. The weekly rules (Recharges, Consumables, variance lines) must stay in the weekly map.

Confidence: high for the objects and the account comparison. Medium for how the Monthly P&L shows Recharges, because this note did not test the app screens. Low for the meaning of the manual sales and COGS accounts.

## Question 1: which Snowflake objects hold the mapping?

### What was searched

| Search | Result |
| --- | --- |
| `SHOW OBJECTS IN SCHEMA FINANCE_STORE.P_AND_L` | 58 objects of the P&L app. Comments name the "Maintenance app" tables `ACCOUNTGROUPS`, `ACCOUNTSTRUCTURES_DETAIL/SOP/PILGRIMS` and `BW_LIVE_BRIDGE_STG`. |
| Table names like `%ACCOUNTGROUP%`, `%ACCOUNT_GROUP%`, `%ACCOUNTSTRUCT%`, `%BRIDGE%STG%`, `%MAINTENANCE%` (`SNOWFLAKE.ACCOUNT_USAGE.TABLES`) | The tables below, their DEV copies, the SharePoint raw tables, and `MASTERDATE_ACCOUNT_GROUP_CENQVDDATA_STG`. |
| `PROD_STAGING.INFORMATION_SCHEMA.TABLES`, schema `FINANCE_PL` | 121 objects. Most `*_STG` views have the comment "maintained in the P&L Workbook Maintenance Streamlit app". |
| `SHOW STREAMLITS IN ACCOUNT` | `PROD_STAGING.FINANCE_PL.VUQ2DC67D46FWBJZ`, title "Pilgrims Europe: Profit & Loss Maintenance v1.0". |
| `cortex search object` for "account group P&L level mapping maintenance" | The same objects, plus `PROD_ANALYTICS.FINANCE_PL_MT.DIM_ACCOUNT_GROUP`. |
| `PROD_STAGING.FINANCE.MASTERDATE_ACCOUNT_GROUP_CENQVDDATA_STG` | Not this mapping. It maps customers (for example ALDI, NANDOS) to groups. |

### What is in Snowflake

| Object | What it holds | Rows |
| --- | --- | --- |
| `PROD_STAGING.FINANCE_PL.S4ACC_MANAGED` | GL account (`ECCACCT`, old ECC or S4 number) to S4 account (`S4ACCT`, 7 digits) and account group (`ACCOUNTGROUP`). | 4,049 |
| `PROD_STAGING.FINANCE_PL.S4ACC_STG` | View over `S4ACC_MANAGED`. Blanks are NULL. | - |
| `PROD_STAGING.FINANCE_PL.ACCOUNTGROUPS_MANAGED` | Account group to `GROUP_NAME` and `PL_NAME_1` to `PL_NAME_13`. | 46 |
| `PROD_STAGING.FINANCE_PL.ACCOUNTGROUPS_STG` | View over `ACCOUNTGROUPS_MANAGED`. | - |
| `PROD_STAGING.FINANCE_PL.ACCOUNTSTRUCTURES_DETAIL_MANAGED` (and `_SOP`, `_PILGRIMS`, `_SUB1`, `_SUB2`) | The report lines of each Monthly P&L layout, in order. | 107 (Detail) |
| `PROD_STAGING.FINANCE_PL.PL_WORKBOOK_AUDIT` | Audit trail of changes in the app. | 2,445 |
| `PROD_ANALYTICS.FINANCE_PL_MT.DIM_ACCOUNT_GROUP` | Pass-through of `ACCOUNTGROUPS_STG`, with three flags. | - |

`S4ACC_STG` has 1,615 distinct S4 accounts. Each S4 account has exactly one account group or no group. 1,814 of 4,049 rows have no group. `S4ACCT` has 7 digits, so it must be padded to 10 digits to match `GLACCOUNT`.

The 46 account groups all start with `0001TUK_`. For example, `0001TUK_ENGCST` has group name Engineering Costs, `PL_NAME_3` Overheads and `PL_NAME_7` Site Costs. The Detail layout shows one line for each overhead group name, from Indirect Wages/Salaries to Other.

The app audit shows 6 changes to S4 Accounts, all on 2026-11-07. Each change gave an account group to a row that had none. Source: `PL_WORKBOOK_AUDIT`, `DATASET_NAME = 'S4 Accounts'`.

### How the Monthly P&L uses it

1. `PROD_STAGING.FINANCE_PL.BW_ACTUALS_STG` sums the GL line items by period. It joins `S4ACC_STG` on `ECCACCT = LTRIM(NORMALIZE_GL_ACCOUNT(GLACCOUNT), '0')`. Then it joins `ACCOUNTGROUPS_STG` on the account group. Source: `GET_DDL`.
2. `BW_LIVE_V4_STG` changes the group of people costs for company TLA PFM only. Company 125 keeps the mapped group. Source: `GET_DDL`.
3. `BW_LIVE_V4_STG` sets `RECHARGES` from `RECHARGES_ACCOUNTS_STG`. That view is a fixed list of accounts from a Power BI measure. It is not a table in the app.
4. `BW_LIVE_BRIDGE_STG` puts each posting on its group name line and on all its P&L level lines. A recharge account also goes to a separate RECHARGES line. Source: `GET_DDL`, and `PL_APP_BRIDGE` for accounts 6000990, 6001600, 6001900, 7206100.
5. `FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE` holds the result for the P&L app.

For company 125, the group in `PL_APP_FACT_BASE` agrees with `S4ACC_STG` for 392 of 394 accounts. 0 accounts have a different group. The other 2 have no `S4ACC` row (a blank account and 0000212000 Legal Reserves).

## Question 2: which GL accounts agree, and which do not?

### Method

- GL: `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`, company 125, ledger 1L, `ACTUALPLANCODE = 'A'`, posting dates 2025-12-29 to 2026-11-15 (FY2026 fiscal weeks 1 to 46).
- Sites: profit centres `PRED01` (Redruth, plant 2504) and `PBRO01` (Bromborough, plant 2506). The weekly P&L joins GL line items on profit centre (`sql/05_wpl_gl_week.sql:17-18`). COPA joins on plant.
- Weekly line: `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP` (`sql/04_wpl_gl_account_map.sql`).
- Monthly group: `S4ACC_STG` and `ACCOUNTGROUPS_STG`, joined as in `BW_ACTUALS_STG`.
- Value: minus the company code amount, in GBP. Income is positive. Cost is negative. Overhead values are GL actuals for the whole period, not the run rate.

Every P&L account with postings at the two sites has a monthly group. The accounts with no group are all balance sheet accounts (1xxxxxx to 3xxxxxx).

### Overheads: lines that agree

The weekly line takes the same accounts as the monthly group of the same name.

| Weekly line | Monthly group | Accounts | Redruth GBP | Bromborough GBP |
| --- | --- | --- | --- | --- |
| 910 Indirect Wages/Salaries | Indirect Wages/Salaries | 9 | -4,923,548 | -5,624,230 |
| 920 Employee Benefits | Employee Benefits | 9 | -141,375 | -281,594 |
| 930 Travel Costs | Travel Costs | 6 | -7,322 | -17,345 |
| 940 Utilities | Utilities | 6 | -1,899,633 | -691,686 |
| 960 Hire/Rental | Hire/Rental | 2 | -548,201 | -119,917 |
| 970 Site Services | Site Services | 12 | -2,390,021 | -466,526 |
| 980 Information Technology | Information Technology | 4 | -62,434 | -56,266 |
| 1010 Fleet Costs | Fleet Costs | 3 | -4,984 | -4,617 |
| 1020 Insurance | Insurance | 2 | -282,287 | -261,696 |
| 1040 Others | Other | 3 | -16,130 | -33,082 |
| 1050 Depreciation | Depreciation | 17 | -2,577,158 | -2,246,323 |

### Overheads: lines that do not agree

| Weekly line | Monthly group | Accounts that differ | Redruth weekly | Redruth monthly | Bromborough weekly | Bromborough monthly |
| --- | --- | --- | --- | --- | --- | --- |
| 950 Engineering Costs | Engineering Costs | 5297000 Supplies-Maintenance and 5297100 Supplies-Tools go to Consumables in the weekly P&L. | -1,665,871 | -1,786,201 | -1,613,848 | -1,648,566 |
| 1000 Consumables | Consumables | The same 2 accounts. Gui confirmed this move (#22). | -385,188 | -264,858 | -373,973 | -339,255 |
| 990 Fees | Fees | 6000990 Mngt Charges-Alloc (Otr), 6001900 Corp Charges-Alloc Mngt/Acctg and 7206100 Misc Expense-Interco Mngt Fees go to Recharges in the weekly P&L. | -504,962 | -3,314,155 | -437,117 | -4,452,943 |
| 1030 Marketing Costs | Marketing Costs | 6001600 Corp Charges-Alloc Sales/Mrktg goes to Recharges in the weekly P&L. | -120,405 | -365,277 | -36,469 | -302,283 |
| 1060 Recharges | No group. The Monthly P&L shows a separate RECHARGES line with the same 4 accounts. | 6000990, 6001900, 7206100, 6001600 | -3,054,065 | Unknown | -4,281,640 | Unknown |

The monthly values for Fees and Marketing Costs agree to the pound with `PL_APP_FACT_BASE` (ledger 1L, source ACTUAL, FY2026). So the Monthly P&L keeps the recharge accounts in Fees and Marketing Costs.

The total of the overhead lines is the same in both P&Ls. Only the split between lines changes.

Other overhead differences:

- The Monthly P&L has the group R&D Expenses (`0001TUK_SALES`). The weekly map has no line for it (`sql/04_wpl_gl_account_map.sql:49-67`). No account in this group has postings at the two sites in FY2026.
- Weekly Total Overheads (1070) includes Depreciation and Recharges (`sql/02_wpl_line.sql:113`). The monthly Overheads line does not include Depreciation. Depreciation is below EBITDA in the Detail layout.
- The Monthly P&L adds rows from the maintenance app. `CORRECTIVE POSTINGS` change Fees by GBP -2,411 at Redruth and about GBP -4,200 at Bromborough. `NON RECURRING` rows are excluded in the app by default (`PL_APP_DEFAULT_FILTER`). The weekly P&L reads GL line items only.

### G.S.V., O.S.C and STD Cost of Goods

The weekly P&L takes these lines from COPA (`sql/08_wpl_sales_week.sql`), not from the GL. This table compares COPA with the GL accounts of the monthly groups. COPA: `PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4`, `RECORD_SOURCE = 'Actual'`, plants 2504 and 2506, the same dates. It includes intercompany sales. The weekly lines use external sales only.

| Weekly line (COPA) | Monthly group and GL account | Redruth COPA | Redruth GL | Bromborough COPA | Bromborough GL |
| --- | --- | --- | --- | --- | --- |
| G.S.V. | Gross Turnover 4000000 Sales, plus Internal Turnover 4208000 Interco Sales (PPC) | 81,825,267 | 81,818,200 | 123,958,026 | 123,955,656 |
| | Gross Turnover 4000020 Sales-Manual | - | 149,649 | - | -80,591 |
| O.S.C | Income Reduction 4504500 Deducts-Rebates | -5,865,095 | -5,865,091 | -3,115,238 | -3,115,233 |
| | Income Reduction 4501020 Deducts-Sales Adjustments Other | - | 220,950 | - | 240,331 |
| | Income Reduction 4501410 Deducts-Claims Manual | - | 101,872 | - | 118,676 |
| STD Cost of Goods | COGS: Cost of Goods Sold 5003800 | -49,464,790 | -49,647,642 | -99,712,923 | -99,842,298 |
| | COGS: Cost of Goods Sold 5003810 COGS Manual | - | 1,540,443 | - | 0 |
| | COGS: Cost of Goods Sold 5003860 Purchased Goods Sold | - | 0 | - | 638,303 |

Group totals in the GL: Gross Turnover plus Internal Turnover 81,967,849 and 123,875,065. Income Reduction -5,542,268 and -2,756,226. COGS: Cost of Goods Sold -48,107,199 and -99,203,995.

So COPA agrees with the main account of each group. It does not include the manual accounts. Unknown: if the manual accounts are the sales adjustments (Credit Note Adj, Price Corrections, Overrider Adj, Promotional Adj).

The 46 account groups have no group named Credit Note Adj, Price Corrections, Overrider Adj or Promotional Adj. This agrees with Gui.

### Variance lines

Gui said not to use the mapping for variances. This table shows the monthly groups behind each weekly variance line, for information. Accounts with no postings at the two sites are included.

| Weekly line | Monthly groups of its accounts |
| --- | --- |
| 410 Production Material Yield | Meat (5000295), Ingredients (5000395, 5000490), Production output (5000035, 5000095, 5000100, 5000435) |
| 440 Packaging Yield | Packaging (13 accounts) |
| 510 Materials (PPV) | Price Variances (5000800, 5000805, 5000810, 5000895), Ingredients (5000820) |
| 520 Packaging (PPV) | Packaging (5030025) |
| 550 Intersite Tfrs (PPV) | Packaging (5030050), Stock Variances (5000700, 5000705), Production output (5000710) |
| 610 Materials (STK) | Scrapped inventory (5001000, 5001020), Stock Variances (5000500, 5000520, 5000900, 5000915, 5000995) |
| 620 Packaging (STK) | Scrapped inventory (5030070, 5030075), Packaging (5030030) |
| 630 WIP (STK) | Scrapped inventory (5001005), Stock Variances (5000505, 5000905) |
| 640 F.Goods (STK) | Scrapped inventory (5001010), Production output (5000510, 5000910) |
| 645 Revaluation (STK) | Stock Variances (5000600, 5000605, 5000615), Production output (5000610), Ingredients (5000620), Packaging (5030060) |
| 720 Packaging (OCI) | Packaging (5005100, 5900230), Other (7002990) |
| 810 Freight | Distribution (5010000, 5010010, 5010020, 5010050) |
| 820 Distribution | Distribution (5012000) |

Gui said the mapping has no PPV group. The mapping has the group Price Variances (`0001TUK_PPV`) with 4 accounts. Weekly Materials (PPV) also takes 5000820, which is in the group Ingredients. The mapping has no labour variance group and no yield group. This agrees with Gui.

7002990 Misc Income-Other is in the monthly group Other (an overhead). The weekly P&L puts it in Packaging (OCI). It has no postings at the two sites in FY2026.

### Monthly groups that no weekly line takes

These accounts have postings at the two sites, but `WPL_GL_ACCOUNT_MAP` does not map them.

| Monthly group | Accounts | Redruth GBP | Bromborough GBP | Note |
| --- | --- | --- | --- | --- |
| Gross Turnover, Internal Turnover, Income Reduction, COGS: Cost of Goods Sold | See the table above | - | - | The weekly P&L takes these values from COPA. |
| Direct Wages | 5100000, 5100010, 5100090, 5103010, 5106400, 5106430, 5510100 | -5,796,035 | -7,365,374 | The weekly P&L takes standard labour from COPA. Labour Efficiency is manual. |
| Purchasing Variances | 5004600 COGS-Purchases-Interco | -1,585,341 | 0 | No weekly line. |
| Stock Variances | 5005530 COGS-Inv Reserve Write Down | 210,825 | 10,278 | No weekly line. |
| Distribution | 5005015 COGS-Freight In, 5019900 Freight-Other, 5030500 Packaging-Pallets, 5030510 Pallet Exchg Program | -119,816 | -301,821 | Not in Freight or Distribution. |
| Extra Ordinary costs | 9303100 | -33,473 | 0 | Below EBIT in the Monthly P&L. |
| Interest costs | 9101000, 9102000 | -2,564 | -12,214 | Below EBIT in the Monthly P&L. |
| TAX | 7206500 Misc Expense-PSS Tax Mark-ups | -190,113 | -287,722 | Below EBIT in the Monthly P&L. |

`WPL_DQ_UNMAPPED` checks accounts 4000000 to 7999999 only (`sql/13_wpl_dq.sql:146`). So it does not show 9303100, 9101000 or 9102000.

## Question 3: can the weekly P&L read the mapping directly?

Yes. The weekly P&L can join `S4ACC_STG` and `ACCOUNTGROUPS_STG` in the same way as `BW_ACTUALS_STG`.

Evidence:

- Both views exist in `PROD_STAGING.FINANCE_PL`. `ENGINEER_ROLE` owns them. `ENGINEER_ROLE` also owns `WPL_GL_ACCOUNT_MAP`. Source: `SHOW GRANTS ON VIEW`, `SHOW VIEWS`.
- The join key is `S4ACC_STG.ECCACCT = LTRIM(NORMALIZE_GL_ACCOUNT(GLACCOUNT), '0')`, as in `BW_ACTUALS_STG`. Each S4 account has one group.
- The group from the views agrees with `PL_APP_FACT_BASE` for all 392 company 125 accounts that have both.

What changes if the weekly P&L reads the views:

- Today the weekly map reads `PL_APP_FACT_BASE`. An account gets an overhead line only after the account has a posting in that table. The views give the group when the app maps the account.
- `PL_APP_FACT_BASE` is an internal table of the P&L app ("internal, no viewer grants" in its comment). The views are the interface over the app tables.
- No number moves today, because the groups are the same.

What must stay in the weekly map:

- The Recharges line. The Monthly P&L takes the recharge flag from `RECHARGES_ACCOUNTS_STG`, a fixed list in a view. The weekly P&L can read the same view.
- The move of 5297000 and 5297100 to Consumables.
- The packaging split (lines 440, 520, 550, 620, 645, 720) and the fixed variance lists.

If the weekly P&L reads the views, the change also needs a new line in `docs/data-flow/flow.yml`. This note does not make that change.

## Questions for Gui

1. Must Fees and Marketing Costs keep the recharge accounts, as in the Monthly P&L? Or must the weekly P&L keep a separate Recharges line? At Redruth, Fees is GBP -504,962 in the weekly P&L and GBP -3,314,155 in the Monthly P&L.
2. Which weekly line takes 5004600 COGS-Purchases-Interco (GBP -1.59 million at Redruth)?
3. Which weekly line takes 5005530 COGS-Inv Reserve Write Down and the pallet accounts 5030500 and 5030510?
4. Are 4000020, 4501020, 4501410, 5003810 and 5003860 the sales adjustments? Or are they something different?
5. Must 7002990 Misc Income-Other stay in Packaging (OCI), or go to Others as in the Monthly P&L?

Answers: Unknown.

## Open questions

1. Who owns the account mapping in the maintenance app? Unknown. The Streamlit comment shows the last user who changed the app code, not the mapping owner.
2. How do the Monthly P&L screens show the RECHARGES line, and is it in EBIT? The bridge puts the recharge accounts in EBIT. This note did not test the screens.

## Sources

All checks are read-only queries in Snowflake account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-20.

1. `SHOW OBJECTS IN SCHEMA FINANCE_STORE.P_AND_L`: object comments of the P&L app.
2. `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `PROD_STAGING.INFORMATION_SCHEMA.TABLES` and `COLUMNS`: the name searches above.
3. `SHOW STREAMLITS IN ACCOUNT`: the maintenance app.
4. `PROD_STAGING.FINANCE_PL.S4ACC_STG` and `ACCOUNTGROUPS_STG`: rows, groups, P&L levels.
5. `GET_DDL` of `PROD_STAGING.FINANCE_PL.BW_ACTUALS_STG`, `BW_LIVE_V3_STG`, `BW_LIVE_V4_STG`, `BW_LIVE_BRIDGE_STG`, `RECHARGES_ACCOUNTS_STG` and `PROD_ANALYTICS.FINANCE_PL_MT.DIM_ACCOUNT_GROUP`.
6. `PROD_STAGING.FINANCE_PL.ACCOUNTSTRUCTURES_DETAIL_STG`: the Detail layout.
7. `PROD_STAGING.FINANCE_PL.PL_WORKBOOK_AUDIT`: changes to S4 Accounts.
8. `FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE`, `PL_APP_BRIDGE` and `PL_APP_DEFAULT_FILTER`: groups, sources, report lines of the recharge accounts, default filters.
9. `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`: GL values by account.
10. `PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4`: COPA totals.
11. `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP`, `WPL_LINE` and `WPL_SITE`: the weekly map, lines and sites.
12. `cortex search object`: the search above.
13. Repo files: `sql/02_wpl_line.sql`, `sql/04_wpl_gl_account_map.sql`, `sql/05_wpl_gl_week.sql`, `sql/08_wpl_sales_week.sql`, `sql/11_wpl_line_value.sql`, `sql/13_wpl_dq.sql`, `docs/meeting-transcripts/181126_Meeting.txt` (lines 934 to 1049).

Weekly line against monthly group:

```sql
WITH gl AS (
  SELECT g.GLACCOUNT,
    -SUM(IFF(g.PROFITCENTER='PRED01',g.AMOUNTINCOMPANYCODECURRENCY,0)) RED,
    -SUM(IFF(g.PROFITCENTER='PBRO01',g.AMOUNTINCOMPANYCODECURRENCY,0)) BRO
  FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL" g
  WHERE g.COMPANYCODE='125' AND g.LEDGER='1L' AND g.ACTUALPLANCODE='A'
    AND g.POSTINGDATE BETWEEN '20251229' AND '20261115'
    AND g.PROFITCENTER IN ('PRED01','PBRO01') GROUP BY 1),
x AS (
  SELECT g.*, m.LINE_ID, ag.GROUP_NAME
  FROM gl g
  LEFT JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP m ON m.GLACCOUNT=g.GLACCOUNT
  LEFT JOIN PROD_STAGING.FINANCE_PL.S4ACC_STG a ON a.ECCACCT = LTRIM(g.GLACCOUNT,'0')
  LEFT JOIN PROD_STAGING.FINANCE_PL.ACCOUNTGROUPS_STG ag ON ag.ACCOUNT_GROUP=a.ACCOUNTGROUP
  WHERE ag.GROUP_NAME IS NOT NULL OR m.LINE_ID IS NOT NULL)
SELECT x.LINE_ID, l.LINE_NAME, x.GROUP_NAME, COUNT(*) ACCTS,
  LISTAGG(LTRIM(x.GLACCOUNT,'0'), ' ') WITHIN GROUP (ORDER BY x.GLACCOUNT) ACCOUNTS,
  ROUND(SUM(x.RED)) RED, ROUND(SUM(x.BRO)) BRO
FROM x LEFT JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE l ON l.LINE_ID=x.LINE_ID
GROUP BY 1,2,3 ORDER BY 1 NULLS LAST,3;
```

Monthly fact against the live mapping (company 125):

```sql
WITH f AS (SELECT DISTINCT ACCOUNT, GROUP_NAME FROM FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE
           WHERE COMPANY_CODE='C125' AND A_B='ACTUAL'),
m AS (SELECT s.ECCACCT, UPPER(ag.GROUP_NAME) GROUP_NAME
      FROM PROD_STAGING.FINANCE_PL.S4ACC_STG s
      LEFT JOIN PROD_STAGING.FINANCE_PL.ACCOUNTGROUPS_STG ag ON ag.ACCOUNT_GROUP=s.ACCOUNTGROUP)
SELECT COUNT(*) N, COUNT_IF(f.GROUP_NAME = m.GROUP_NAME) SAME,
       COUNT_IF(m.ECCACCT IS NULL) NO_S4, COUNT_IF(f.GROUP_NAME <> m.GROUP_NAME) DIFF
FROM f LEFT JOIN m ON m.ECCACCT = LTRIM(f.ACCOUNT,'0');
```
