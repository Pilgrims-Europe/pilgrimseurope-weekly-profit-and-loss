# Which stock movement and BOM data is in Snowflake?

Ticket: #5. Site finance uses MB51, ZL20, ZR63G and ZVAR for stock, and ZPP56 for the BOM. This note lists the matching data in Snowflake for the pilot sites and for the Carrickmacross model. Research date: 2026-11-12.

## Short answer

Stock movements are in Snowflake. The table `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"` has one row for each material document item, the same grain as MB51. It covers all sites from 2024-12-30 to today, and it loads every day.

Stock balances are in Snowflake by fiscal period, not by week. `V_MATERIALPRICEMBEW` has the current stock. `V_MATERIALPRICEMBEWH` has stock at the end of past periods.

The BOM is not in a production schema. The only BOM copy is a one-off load from 2026-06-11 in a personal sandbox.

The tables behind ZL20, ZR63G, ZVAR and ZPP56 are Unknown.

Two facts change the variance design:

- Carrickmacross books production to manufacturing orders. Redruth and Bromborough do not. They use movement types 201 and Z61 against cost centres.
- Fiscal periods 2026002 and 2026003 have duplicate rows in the goods movement table.

## Sites

| Site | Plant | Company code | Source |
| --- | --- | --- | --- |
| Redruth | 2504 | 125 Pilgrim's Pride LTD | `PROD_ANALYTICS.FINANCE_MT.DIM_PLANTMASTER` |
| Bromborough | 2506 | 125 Pilgrim's Pride LTD | `DIM_PLANTMASTER` |
| Carrickmacross (PFM) | PF68 | 168 Pilgrims Food Masters ROI | `DIM_PLANTMASTER` |
| Carrickmacross (C&M) | WM41 | 168 Pilgrims Food Masters ROI | `DIM_PLANTMASTER` |

Unknown: which of PF68 and WM41 is the Carrickmacross model. This note uses PF68, because it has the production orders.

## MB51 (material document list)

Table: `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`. It has 125,021,852 rows and 97 columns.

Load: Talend (user `TALEND_SECURE`) loads the current fiscal period into `PROD_RAW.SAP."jbs_bw4_hana_edw_scm_mmic/C_GOODSMOVEMENTDOCUMENTS_current_fiscalYearPeriod"`. The task `C_GOODSMOVEMENTDOCUMENTS_TASK` then deletes that period from the main table and inserts it again. The task ran each day at 10:15 UTC in the last 7 days.

Key fields:

- Document: `MATERIALDOCUMENTYEAR`, `MATERIALDOCUMENT`, `MATERIALDOCUMENTITEM`, `MATERIALDOCUMENTRECORDTYPE`
- Where and what: `PLANT`, `STORAGELOCATION`, `MATERIAL`, `MATERIALTYPE`, `BATCH`
- Movement: `GOODSMOVEMENTTYPE`, `DEBITCREDITCODE`, `STOCKCHANGECATEGORY`, `ISREVERSALMOVEMENTTYPE`, `GOODSMOVEMENTISCANCELLED`
- Dates: `POSTINGDATE` (text, `YYYYMMDD`), `DOCUMENTDATE`, `FISCALYEARPERIOD`, `FISCALYEARVARIANT`
- Links: `PURCHASEORDER`, `SUPPLIER`, `MANUFACTURINGORDER`, `ORDERTYPE`, `COSTCENTER`, `GLACCOUNT`, `PROFITCENTER`, `SALESORDER`, `DELIVERYDOCUMENT`
- Quantity: `QUANTITYINBASEUNIT`, `MATLSTKCHANGEQTYINBASEUNIT`, `MATLCNSMPNQTYINMATLBASEUNIT`, `MATERIALBASEUNIT`
- Value (company code currency): `TOTALGOODSMVTAMTINCCCRCY`, `GOODSMOVEMENTSTKAMTINCCCRCY`, `GOODSMVTCNSMPNAMTINCCCRCY`, `COMPANYCODECURRENCY`

Coverage:

| Plant | Rows | First posting date | Last posting date | Movement types | Manufacturing orders |
| --- | --- | --- | --- | --- | --- |
| 2504 Redruth | 2,799,343 | 2024-12-30 | 2026-11-12 | 36 | 12 |
| 2506 Bromborough | 3,242,867 | 2024-12-30 | 2026-11-12 | 36 | 36 |
| PF68 Carrickmacross | 5,320,314 | 2024-12-30 | 2026-11-12 | 27 | 9,177 |
| WM41 Carrickmacross | 260,694 | 2024-12-30 | 2026-11-12 | 17 | 1 |

Other plants have some later posting dates. On 2026-11-13, plant AG03 had one row with posting date 2026-11-27. Unknown: why.

The table has no data before fiscal period 2025001.

Main movement types since 2026-01-01:

- PF68:
  - 261 (issue to an order): 1.95 million rows. All rows have an order.
  - 101 (receipt): 77,212 rows have an order.
- 2504 and 2506:
  - 201 (issue to a cost centre) and Z61 (receipt with a cost centre).
  - 601 (delivery), 641 (stock transfer) and 101 (receipt).
  - Only 32 rows at 2504 and 91 rows at 2506 have an order.
- At 2504 and 2506, the 101 rows since 2026-10-01 all have a purchase order. These are goods received from suppliers.

Unknown: what Z61, Z62, Z71 and Z72 mean. They are custom movement types.

Fiscal periods: variant F9. Periods have 4, 4 or 5 weeks. For example, 2026002 runs from 2026-01-26 to 2026-03-01.

## ZL20

Unknown: the source tables of ZL20.

Data in Snowflake that can give opening stock and goods received:

- Goods received: the MB51 table above, movement type 101 with `PURCHASEORDER`.
- Stock at period end: `PROD_RAW.SAP."jbs_bw4_hana_edw_scm_mmic_V_MATERIALPRICEMBEWH"`. See "Stock balances" below.

## ZR63G

Unknown: the source tables of ZR63G.

Data in Snowflake that can give closing stock:

- Current stock: `PROD_RAW.SAP."jbs_bw4_hana_edw_scm_mmic_V_MATERIALPRICEMBEW"`. See "Stock balances" below.

## Stock balances (for ZL20 and ZR63G)

Fields in both tables: `PLANT`, `MATERIAL`, `VALUATIONAREA`, `INVENTORYVALUATIONTYPE`, `FISCALYEARPERIOD`, `TOTALVALUATEDSTOCKQTY`, `TOTALVALUATEDAMOUNT`, `MATERIALPRICECONTROL`, `STANDARDPRICE`, `MOVINGAVERAGEPRICE`, `MATERIALPRICEUNITQTY`, `CURRENCY`, `VALUATIONCLASS`.

| Table | Plant | Rows | First period | Last period | Materials |
| --- | --- | --- | --- | --- | --- |
| MBEW | 2504 | 17,010 | 2019003 | 2026011 | 15,899 |
| MBEW | 2506 | 12,875 | 2020008 | 2026011 | 11,616 |
| MBEW | PF68 | 15,782 | 2016001 | 2026011 | 14,392 |
| MBEWH | 2504 | 331,718 | 2017012 | 2026010 | 15,899 |
| MBEWH | 2506 | 227,956 | 2018012 | 2026010 | 11,616 |
| MBEWH | PF68 | 150,437 | 2014012 | 2026010 | 14,392 |

MBEW has one row for each material. `FISCALYEARPERIOD` in MBEW is the period of the last change, not a snapshot date.

MBEWH does not have a row for every period. For example, 2504 has 81 distinct periods between 2017012 and 2026010. Unknown: the rule that this extract uses to write a row.

Talend loads MBEWH with `COPY INTO`. It loaded 49 times in the last 7 days.

Weekly stock: no table has stock at the end of each week. `DEV_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_STOCK_BY_PERIOD"` has the fields for this (`FISCALYEARWEEK`, `CALENDARDATE`, `MATSTKCHGQTYTOTALBASEUNIT`, `STKAMOUNTTOTALCCCRCY`). It has 0 rows, and it is not in PROD.

A possible method (not tested): start from MBEW current stock. Then subtract the goods movements after each week end.

## ZVAR

Unknown: the source tables of ZVAR.

Data in Snowflake for production variances:

- Actual issues and receipts: the MB51 table. At PF68, use 261 and 262 (issues to an order) and 101 and 102 with `MANUFACTURINGORDER` (receipts from an order).
- Standard cost: `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"`. Fields: `PLANT`, `PRODUCT`, `COSTINGVARIANT`, `COSTESTIMATEVALIDITYSTARTDATE`, `COSTESTIMATEVALIDITYENDDATE`, `COSTCOMPONENT`, `COST001` to `COST016`, `C_TOTALCOST`, `LOTSIZEFORPRODUCTCOSTING`, `FISCALYEARPERIOD`.

| Plant | Rows | Products | Periods | Costing variants |
| --- | --- | --- | --- | --- |
| 2504 | 107,679 | 4,047 | 2026001 to 2026011 | Z125, ZPKG |
| 2506 | 67,390 | 3,217 | 2026001 to 2026011 | Z125, ZPKG |
| PF68 | 30,356 | 2,498 | 2026001 to 2026011 | PPC1 |

`C_PRODUCTCOSTRELEASEDCE_HISTORY` has periods 2025001 to 2026010 for the same plants.

No table in Snowflake has order variances (planned against actual by order). No production order header tables (AFKO, AFPO, AUFK) or confirmations (AFRU) were found.

## ZPP56 (BOM)

Unknown: the source tables of ZPP56.

No BOM table is in a PROD or DEV schema. A search for STPO, STKO, MAST and BOM names found none.

The only BOM copy is `SNOWFLAKE_LEARNING_DB.CHRISMC_WORKING_WITH_SEMI_STRUCTURED_DATA.BOM_V1` (view `LATEST_BOM` on top). It is a one-off load on 2026-06-11. It has 752,390 rows.

Fields: `Plant - Key`, `Material - Key`, `Material - Text`, `Alternative BOM - Key`, `Component (BOM) - Key`, `QUANTITY`, `QUANTITY_UNIT`, `BASE_QUANTITY`, `Base Quantity(1) Unit`, `BOM_NUMBER`, `APPLICATION_ID`.

| Plant | Rows | Parent materials | Components | Alternatives | Application |
| --- | --- | --- | --- | --- | --- |
| 2504 | 13,471 | 1,561 | 783 | 1 | PC01 |
| 2506 | 7,476 | 533 | 873 | 6 | PC01 |
| PF68 | 49,726 | 867 | 1,288 | 1 | PI01 |

It has no validity dates and no change dates. Unknown: the SAP source of this load.

## Related: yield

`PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD` has Arolink yield for 2504 and 2506 from 2024-12-30 to 2026-11-11. It has no rows for PF68 or WM41. It is not SAP data.

## Gaps

1. No BOM in a PROD schema. The sandbox copy is from 2026-06-11 and does not refresh.
2. No weekly stock balance. MBEW and MBEWH are by fiscal period. `C_STOCK_BY_PERIOD` is empty and only in DEV.
3. Goods movements start on 2024-12-30. There is no earlier history.
4. Fiscal period 2026002 has every row 2 times. Fiscal period 2026003 has every row 3 times. This is true for all plants. Remove duplicates on the document key before use.
5. Redruth and Bromborough do not post production to manufacturing orders. The Carrickmacross order-based variance method does not apply to them without change.
6. No order variance, production order or confirmation tables.
7. The tables behind ZL20, ZR63G, ZVAR and ZPP56 are Unknown.

## Open questions

1. Which SAP tables or BW queries do ZL20, ZR63G, ZVAR and ZPP56 read?
2. What do movement types Z61, Z62, Z71 and Z72 mean at Redruth and Bromborough?
3. How do Redruth and Bromborough calculate production variances today, without orders?
4. Is the Carrickmacross model plant PF68, WM41 or both?
5. Who owns the BOM load to `BOM_V1`, and can it move to `PROD_RAW.SAP` with a daily refresh?
6. Who owns `C_GOODSMOVEMENTDOCUMENTS_TASK`, and can they remove the duplicate rows in 2026002 and 2026003?
7. Does site finance need stock at week end, or is period-end stock enough?

## Sources

All checks are read-only queries in Snowflake account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-12.

1. `SNOWFLAKE.ACCOUNT_USAGE.TABLES`: table names, row counts, created and altered dates.
2. `SNOWFLAKE.ACCOUNT_USAGE.VIEWS`: views that read these tables.
3. `PROD_RAW.INFORMATION_SCHEMA.COLUMNS`, `DEV_RAW.INFORMATION_SCHEMA.COLUMNS`, `SNOWFLAKE_LEARNING_DB.INFORMATION_SCHEMA.COLUMNS`: fields.
4. `PROD_ANALYTICS.FINANCE_MT.DIM_PLANTMASTER`: plant codes.
5. `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`: coverage, movement types, duplicates.
6. `PROD_RAW.SAP."jbs_bw4_hana_edw_scm_mmic_V_MATERIALPRICEMBEW"` and `..._V_MATERIALPRICEMBEWH`: coverage.
7. `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"` and `..._HISTORY`: coverage.
8. `SNOWFLAKE_LEARNING_DB.CHRISMC_WORKING_WITH_SEMI_STRUCTURED_DATA.BOM_V1`: coverage.
9. `PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD`: sites and dates.
10. `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` and `TASK_HISTORY`, last 7 days: load method.
