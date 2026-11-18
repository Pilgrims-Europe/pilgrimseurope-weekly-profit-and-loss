# Do SAP goods movements show finished goods write-offs?

Ticket: #56. Ticket #34 put F.Goods (OCI) as Not in v1. The FP&A draft manual says F.Goods (OCI) must agree with a SAP stock adjustment document. This note finds if SAP goods movements in Snowflake show finished goods write-offs at Redruth and Bromborough, by week. Research date: 2026-11-18.

## Short answer

Partly. SAP goods movements show two types of finished goods stock adjustment at both sites:

1. Scrapping: movement types 551 and 552. They post to GL 5001010 "COGS-Mat Scrp-FG".
2. Physical inventory differences: movement types 701 and 702, and Z71 and Z72. They post to GL 5000510 "COGS-Phy Inv G/L-FG".

The scrapping value is already in the weekly P&L. GL 5001010 is mapped to line F.Goods (STK). The goods movement value agrees with the GL line items to the pound. A new F.Goods (OCI) line on 551 and 552 counts the same value two times.

The physical inventory value is not in the weekly P&L. GL 5000510 is not in `sql/04_wpl_gl_account_map.sql`. So 701, 702, Z71 and Z72 are the only candidate source for F.Goods (OCI) in Snowflake. The value is small: GBP 8,534 at Redruth and GBP 41,075 at Bromborough since 2025-12-29 (net gains).

The same pattern applies to semi-finished goods. Scrapping (GL 5001005) is already in WIP (STK). Physical inventory differences (GL 5000505) are not in a weekly P&L line.

Unknown: if F.Goods (OCI) in the site workbook is physical inventory differences, scrapping, or a different adjustment. The FP&A draft manual is not in this repo. A person must confirm. See "Who can confirm".

Confidence: high for the movements, GL accounts and values. Low for which of them F.Goods (OCI) and WIP (OCI) mean.

## All movement types at the pilot plants

Source: `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`. Plants 2504 and 2506. Posting date 2025-12-29 to 2026-11-18. Duplicates removed.

The table has a posted value field: `GOODSMOVEMENTSTKAMTINCCCRCY` (stock value change, company code currency GBP). This note uses it as the posted value.

| Movement type | SAP standard meaning | GL account on the row | P&L account? |
| --- | --- | --- | --- |
| 101, 102, 122 | Goods receipt, reversal, return to supplier | Blank, or cost accounts for non-stock items | Not a write-off |
| 201, 202 | Goods issue to a cost centre | 5000295, 5000395, 5000435, 5000490, packaging | Consumption (Production Material Yield, Packaging Yield) |
| 301 to 312, 343, 344 | Transfer postings (plant, storage location, material, stock type) | Blank | No GL account on the row |
| 453, 454 | Returns transfer posting | 5003800 COGS-COGS | Not a write-off |
| 551, 552 | Scrapping, reversal | 5001000, 5001005, 5001010, 5001020, 5030075, 5800030 | Yes |
| 553 to 556 | Scrapping from quality or blocked stock | 0 rows | - |
| 601, 602, 641, 642, 651 to 654 | Delivery, stock transport, returns | 5003800, 5030800, blank | Not a write-off |
| 701, 702 | Inventory difference in unrestricted stock | 5000500, 5000505, 5000510, 5000520, 5030045, 5291500 | Yes |
| 711, 712 | Inventory difference in quality stock | 0 rows | - |
| Z61, Z62 | Unknown (custom). Production receipt. | 5000035, 5000095, 5000100 | Production output (see `research/z61-movement-type.md`) |
| Z71, Z72 | Unknown (custom) | 5000500, 5000505, 5000510, 5000520, 5030045, 5291500, 5800090 | Yes |

The SAP standard meanings are general SAP knowledge. They are not from a source in Snowflake. No movement type text table is in Snowflake (see `research/z61-movement-type.md`).

309 rows have a posted value (Redruth GBP 13,948 net, Bromborough GBP -40,618 net) but no GL account on the row. Unknown: which GL account takes that value.

## GL accounts of the candidate movements

Names from `PROD_ANALYTICS.FINANCE_MT.DIM_GLACCOUNTMASTER` (chart of accounts CA). P&L group from `FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE` (company C125). Weekly P&L line from `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_GL_ACCOUNT_MAP`.

| GL account | Name | Movement types | P&L group | Weekly P&L line |
| --- | --- | --- | --- | --- |
| 5001000 | COGS-Mat Scrp-RawMat | 551, 552 | SCRAPPED INVENTORY | 610 Materials (STK) |
| 5001005 | COGS-Mat Scrp-SF | 551, 552 | SCRAPPED INVENTORY | 630 WIP (STK) |
| 5001010 | COGS-Mat Scrp-FG | 551, 552 | SCRAPPED INVENTORY | 640 F.Goods (STK) |
| 5001020 | COGS-Mat Scrp-Ingred | 551, 552 | SCRAPPED INVENTORY | 610 Materials (STK) |
| 5030075 | Pkg-Inv Scrapped Obs | 551, 552 | SCRAPPED INVENTORY | 620 Packaging (STK) |
| 5800030 | R&M-Inv Res Ob Man | 551, 552 | ENGINEERING COSTS | 950 Engineering Costs |
| 5000500 | COGS-Phy Inv G/L-Raw | 701, 702, Z71, Z72 | STOCK VARIANCES | None |
| 5000505 | COGS-Phy Inv G/L-SF | 701, 702, Z71, Z72 | STOCK VARIANCES | None |
| 5000510 | COGS-Phy Inv G/L-FG | 701, 702, Z71, Z72 | PRODUCTION OUTPUT | None |
| 5000520 | COGS-Phy Inv G/L-Ing | 701, 702, Z71, Z72 | STOCK VARIANCES | None |
| 5030045 | Pkg-Inv G/L Manual | 701, 702, Z71, Z72 | PACKAGING | 440 Packaging Yield |
| 5291500 | Sup-Inv Adjustment | 701, 702, Z71, Z72 | CONSUMABLES | 1000 Consumables |
| 5800090 | R&M-Inv Adjustment | Z71, Z72 | ENGINEERING COSTS | 950 Engineering Costs |

"Scrp" is scrapped. "Phy Inv G/L" is physical inventory gain or loss. "SF" is semi-finished. "FG" is finished goods.

`sql/04_wpl_gl_account_map.sql` maps 5001000 to 5001020 in its fixed PHASE 1 list. It maps the other accounts by P&L group. The P&L groups STOCK VARIANCES and PRODUCTION OUTPUT are not in the overhead list. So 5000500, 5000505, 5000510 and 5000520 are in no weekly P&L line.

`sql/05_wpl_gl_week.sql` has no filter that drops these postings. It keeps company code 125, ledger 1L, posting date from 2025-12-29, and the pilot profit centres.

## Finished goods or semi-finished

The GL account shows the material class. The material number prefix does not:

- Prefix 30 holds finished goods, but also ingredients (for example "BRINEBLEND D9825771 10.56KG" on GL 5001020 and 5000520).
- Finished goods accounts 5001010 and 5000510 also hold prefixes 36 and 39 (for example "PORK HIND HOCK", "BQAP RT LNK D.CURE SMK STREAK IST").
- Semi-finished accounts 5001005 and 5000505 hold prefix 38 only.

All candidate rows on these four accounts have material type `FERT`. So this note uses the GL account: 5001010 and 5000510 are finished goods. 5001005 and 5000505 are semi-finished (WIP).

Unknown: the SAP valuation class rule that selects the GL account. A person must confirm that GL account is the correct class.

## Values since 2025-12-29

Posting date 2025-12-29 to 2026-11-18. Value sign as in the weekly P&L: income positive, cost negative. "Posted" is `GOODSMOVEMENTSTKAMTINCCCRCY`. "Standard" is quantity x released standard `TOTAL_COST` per kg, as in the `cost` CTE of `sql/09_wpl_movement_week.sql`. Standard is for base unit KG rows only.

| Plant | Movement | GL account | Rows | Net t (KG) | Net cases | Cases as t | Posted GBP | Posted, KG rows | Standard, KG rows |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2504 | 551/552 | 5001010 (FG) | 165 | -7.5 | -67 | -0.2 | -17,940 | -16,398 | -16,409 |
| 2506 | 551/552 | 5001010 (FG) | 103 | -12.4 | -144 | -0.5 | -22,643 | -20,692 | -20,691 |
| 2504 | 701/702 | 5000510 (FG) | 782 | 2.6 | 6 | 0.0 | 7,898 | 8,889 | 8,883 |
| 2504 | Z71/Z72 | 5000510 (FG) | 1,670 | -1.0 | -73 | -0.2 | -6,072 | -4,896 | -4,798 |
| 2506 | 701/702 | 5000510 (FG) | 5,079 | 7.8 | 558 | 2.5 | 50,097 | 40,759 | 40,333 |
| 2506 | Z71/Z72 | 5000510 (FG) | 1,753 | -3.0 | 0 | 0.0 | -11,705 | -11,705 | -11,692 |
| 2504 | 551/552 | 5001005 (SF) | 1,349 | -137.1 | 0 | 0.0 | -58,101 | -58,101 | -58,091 |
| 2506 | 551/552 | 5001005 (SF) | 119 | -11.2 | 0 | 0.0 | -13,137 | -13,137 | -13,137 |
| 2504 | 701/702 | 5000505 (SF) | 17 | -1.1 | 0 | 0.0 | -5,825 | -5,825 | -5,824 |
| 2504 | Z71/Z72 | 5000505 (SF) | 406 | -39.9 | 0 | 0.0 | -29,487 | -29,487 | -29,357 |
| 2506 | 701/702 | 5000505 (SF) | 62 | 8.0 | 0 | 0.0 | 9,786 | 9,786 | 9,785 |
| 2506 | Z71/Z72 | 5000505 (SF) | 113 | -1.8 | 0 | 0.0 | -4,699 | -4,699 | -4,700 |

Posted value and standard value agree within GBP 500 on each line. The materials are valued at standard price. 39 finished goods KG rows have no released standard cost.

Cases: the table gives a posted value for CS rows. So no conversion is needed for value. Tonnes use cases x material `NET_WEIGHT` (KG) from `PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER`.

## Goods movements against GL line items

Source: `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`, company code 125, ledger 1L, profit centres PRED01 and PBRO01, posting date 2025-12-29 to 2026-11-18. Value = minus the company code amount.

| Site | GL account | GL value (GBP) | Goods movement posted (GBP) | GL document types |
| --- | --- | --- | --- | --- |
| Redruth | 5001010 (FG scrap) | -17,940 | -17,940 | WA |
| Bromborough | 5001010 (FG scrap) | -22,643 | -22,643 | WA, plus 1 AC (+1,500) and 1 CA (-1,500) |
| Redruth | 5000510 (FG phys inv) | 8,534 | 1,827 | WA -6,072, WI 14,606 |
| Bromborough | 5000510 (FG phys inv) | 41,075 | 38,392 | WA -11,681, WI 52,756 |
| Redruth | 5001005 (SF scrap) | -58,101 | -58,101 | WA |
| Bromborough | 5001005 (SF scrap) | -13,137 | -13,137 | WA |
| Redruth | 5000505 (SF phys inv) | -35,312 | -35,312 | WA, WI |
| Bromborough | 5000505 (SF phys inv) | 5,273 | 5,087 | WA, WI |

All GL line items on these accounts have reference procedure `MKPF` (material document), except the AC and CA pair. In standard SAP, WA is a goods issue document and WI is an inventory document. This is general SAP knowledge.

On 5000510, the GL value is higher than the goods movement stock value. The difference is on 701 rows in cases. On those rows `TOTALGOODSMVTAMTINCCCRCY` agrees with the GL, and `GOODSMOVEMENTSTKAMTINCCCRCY` does not. Unknown: why. Use the GL line items as the P&L value for these accounts.

`WPL_GL_WEEK` gives Bromborough 5001005 GBP -12,705, not -13,137. The difference is one item of GBP -432 posted on 2026-11-18. `WPL_WEEK` ends on 2026-11-15, so the view does not show it yet.

## Weekly value, last 9 complete weeks

Source: GL line items, as above. Weeks from `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK` (Monday to Sunday). Values in GBP.

| Week start | Redruth FG scrap 5001010 | Redruth FG phys inv 5000510 | Redruth SF scrap 5001005 | Redruth SF phys inv 5000505 | Bromborough FG scrap 5001010 | Bromborough FG phys inv 5000510 | Bromborough SF scrap 5001005 | Bromborough SF phys inv 5000505 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-14 | -308 | -227 | 0 | -1,137 | 0 | 2,581 | -446 | -26 |
| 2026-09-21 | -198 | -115 | -350 | 0 | 0 | -4,710 | -1,778 | 2,030 |
| 2026-09-28 | -62 | 487 | 0 | -865 | -1,526 | 70 | -655 | -86 |
| 2026-10-05 | -1,231 | 1,420 | -2,081 | 0 | -10 | 3,505 | -416 | 5 |
| 2026-10-12 | -1,141 | 967 | -2,542 | -26 | 0 | 1,851 | -945 | 439 |
| 2026-10-19 | -552 | -1,110 | -417 | -6,435 | 1,402 | 543 | -1,019 | -38 |
| 2026-10-26 | -138 | 3,873 | -2,210 | -65 | -1,500 | 2,523 | -20 | -28 |
| 2026-11-02 | -383 | -333 | -2,507 | -2,784 | -1,557 | 267 | -528 | -198 |
| 2026-11-09 | -130 | 252 | -809 | -242 | -583 | -918 | -54 | -88 |

Bromborough FG scrap in weeks 2026-10-19 and 2026-10-26 includes the manual AC (+1,500) and CA (-1,500) pair.

Values are small in most weeks: below GBP 5,000 for each account and site. The largest single week since 2025-12-29 is GBP -6,435 (Redruth SF physical inventory, week 2026-10-19). Postings occur in almost every week. They are not only at period end.

## Who posts them

| Plant | Movement | Rows | Created by | Reason codes |
| --- | --- | --- | --- | --- |
| 2504 | 551 | 1,510 | `BACKGROUND` on 1,509 rows | 0020, 0406 |
| 2506 | 551 | 216 | 7 users. `BACKGROUND` on 120 rows | 0002, 0007, 0008, 0020, 0401, 0402, 0404, 0406, 0441 |
| 2504 | 701, 702 | 799 | 4 to 5 named users | 0000 |
| 2506 | 701, 702 | 5,141 | 4 named users | 0000 |
| 2504 | Z71, Z72 | 2,076 | `BACKGROUND` | 0000 |
| 2506 | Z71, Z72 | 1,866 | `BACKGROUND` | 0000 |

Rows are for GL accounts 5001005, 5001010, 5000505 and 5000510 only. All rows have cost centre C125RED160 (Redruth) or C125BRO160 (Bromborough).

Unknown: the text of the reason codes. No SAP reason text table (T157D or T157E) is in Snowflake. Unknown: which interface posts 551, Z71 and Z72 as `BACKGROUND`.

## Other sources of stock adjustments

These searches found no other SAP source:

| Search | Result |
| --- | --- |
| Table name like `%SCRAP%`, `%WRITEOFF%`, `%STOCKADJ%`, `%INVENTORYDIFF%`, `%PHYSINV%`, `%PHYSICALINV%`, `%IKPF%`, `%ISEG%`, `%WASTE%`, `%STOCKCOUNT%` | Only Mtech `BIMENTITYPHYSICALINVENTORY` tables (0 rows, poultry). No SAP table. |
| Column name like `%SCRAP%`, `%WRITEOFF%`, `%PHYSINV%`, `%PHYSICALINVENTORY%`, `%INVDIFF%` (PROD and DEV databases) | Only Mtech feed tables in `DEV_RAW.MTECH_DEV`. No SAP column. |
| Table name like `%T157%`, `%MOVEMENTREASON%`, `%REASONCODE%` | Only Mtech reason tables. No SAP reason text. |
| Repo text "stock adjustment document", "draft manual" | No match. The FP&A draft manual is not in this repo. |

The SAP physical inventory document tables (IKPF and ISEG) are not in Snowflake. The goods movement table and the GL line items are the only sources.

## Other observations

- Raw material physical inventory (GL 5000500) is larger: GBP 62,474 at Redruth and GBP -133,608 at Bromborough since 2025-12-29. It is not in a weekly P&L line. This can be relevant to Materials (OCI) (ticket #22).
- At Redruth, GL 5001020 (ingredients scrap) has manual journals (document types AC and CA) with a net of GBP 84,037. They are in Materials (STK).
- At Redruth, 701 on GL 5000500 has 35 rows with 266.2 t for GBP 4,474. Unknown: why the value is so low for that quantity.

## What this means for F.Goods (OCI)

The scrapping movements 551 and 552 are already in the weekly P&L, in F.Goods (STK) and WIP (STK). Do not use them for F.Goods (OCI) or WIP (OCI). That counts the value two times.

The physical inventory movements (701, 702, Z71, Z72) on GL 5000510 and 5000505 are in Snowflake by week. They are in no weekly P&L line today.

Possible rules, for a person to choose. This note does not choose one.

- A: F.Goods (OCI) = GL line items on 5000510. WIP (OCI) = GL line items on 5000505. Source `C_ACTUALPLANGL`, as for the other GL lines.
- B: Keep F.Goods (OCI) and WIP (OCI) as Not in v1. Add 5000510 and 5000505 to F.Goods (STK) and WIP (STK), so that the P&L total is complete.
- C: F.Goods (OCI) is a different adjustment that site finance enters by hand. Its source is Unknown. Keep Not in v1.

For A and B, the GL line item is the correct value. For 701 rows in cases, the goods movement stock value does not agree with the GL.

## Who can confirm

- Aswani Nune, SAP BW Developer, Information Technology: the SAP text of Z71 and Z72, and of the 551 reason codes. If T157D can be extracted to `PROD_RAW.SAP`. Which interface posts 551, Z71 and Z72 as `BACKGROUND`. Why the stock value and total value differ on 701 rows in cases.
- Simon Thompson, Head of Finance Systems, Finance: if GL 5000510 and 5000505 are the "stock adjustment" in the FP&A draft manual. Why 5000510 is in P&L group PRODUCTION OUTPUT and 5000505 is in STOCK VARIANCES.
- Redruth and Bromborough site finance: what F.Goods (OCI) and WIP (OCI) hold in the workbook today, and which SAP document they agree it with. Owner name: Unknown.

## Open questions

1. What does F.Goods (OCI) hold in the site workbook: physical inventory differences, scrapping, or another adjustment?
2. Which SAP stock adjustment document does the FP&A draft manual mean? Is it an inventory document (WI)?
3. What is the SAP text of Z71 and Z72? How are they different from 701 and 702?
4. What do 551 reason codes 0002 to 0441 mean?
5. Must GL 5000510 and 5000505 be in the weekly P&L? If yes, in the OCI lines or in the STK lines?
6. Is raw material physical inventory (GL 5000500) part of Materials (OCI)?

## Sources

All checks are read-only queries in Snowflake account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-18.

1. `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`: movement types, GL accounts, quantities, posted values, users, reason codes. Filter: `PLANT IN ('2504','2506')`, `POSTINGDATE >= '20251229'`. Duplicates removed with `QUALIFY ROW_NUMBER() OVER (PARTITION BY MATERIALDOCUMENTYEAR, MATERIALDOCUMENT, MATERIALDOCUMENTITEM, MATERIALDOCUMENTRECORDTYPE ORDER BY MATERIALDOCUMENT) = 1`. Stock direction from `DEBITCREDITCODE` (S in, H out) and `ABS(QUANTITYINBASEUNIT)`.
2. `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`: GL line items. Filter: `COMPANYCODE = '125'`, `LEDGER = '1L'`, `POSTINGDATE >= '20251229'`, profit centres from `WPL_SITE`.
3. `PROD_ANALYTICS.FINANCE_MT.DIM_GLACCOUNTMASTER`: GL account names (`GL_ACCOUNT_LONG_DESC`, chart of accounts CA).
4. `FINANCE_STORE.P_AND_L.PL_APP_FACT_BASE`: P&L group of each account (company C125, actuals).
5. `PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER`: material descriptions and `NET_WEIGHT` (KG). Join on `LTRIM(MATERIAL_NUMBER, '0') = LTRIM(MATERIAL, '0')`.
6. `PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED`: released standard cost (Z125, version 01, status FR, base unit KG, valid on the posting date).
7. `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE`, `WPL_WEEK`, `WPL_GL_ACCOUNT_MAP`, `WPL_GL_WEEK`: weekly P&L app views (read only).
8. `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `SNOWFLAKE.ACCOUNT_USAGE.COLUMNS`: search for other sources, by the name patterns above.
9. Repo files: `sql/02_wpl_line.sql`, `sql/04_wpl_gl_account_map.sql`, `sql/05_wpl_gl_week.sql`, `sql/09_wpl_movement_week.sql`, `research/z61-movement-type.md`, `research/stock-bom.md`, `questionnaires/red-line-sources-for-gui.html`, `docs/handoffs/2026-11-17-peter-grilling-tickets.md`.

Main query for the values since 2025-12-29:

```sql
WITH g AS (
 SELECT * FROM PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"
 WHERE PLANT IN ('2504','2506') AND POSTINGDATE >= '20251229'
   AND GOODSMOVEMENTTYPE IN ('551','552','701','702','Z71','Z72')
   AND GLACCOUNT IN ('0005001005','0005001010','0005000505','0005000510')
 QUALIFY ROW_NUMBER() OVER (PARTITION BY MATERIALDOCUMENTYEAR, MATERIALDOCUMENT, MATERIALDOCUMENTITEM, MATERIALDOCUMENTRECORDTYPE ORDER BY MATERIALDOCUMENT)=1),
nw AS (SELECT LTRIM(MATERIAL_NUMBER,'0') M, MAX(NET_WEIGHT) NET_KG
 FROM PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER WHERE WEIGHT_UNIT='KG' GROUP BY 1),
cost AS (SELECT PLANT, MATERIAL, COST_ESTIMATE_VALIDITY_START_DATE VF, COST_ESTIMATE_VALIDITY_END_DATE VT, COALESCE(TOTAL_COST,0) TPK
 FROM PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED
 WHERE PLANT IN ('2504','2506') AND COSTING_VARIANT='Z125' AND COSTING_VERSION='01' AND COSTING_STATUS='FR'
   AND BASE_UNIT='KG' AND COALESCE(MATERIAL_PRICE_UNIT_QUANTITY,1)=1
 QUALIFY ROW_NUMBER() OVER (PARTITION BY PLANT, MATERIAL, COST_ESTIMATE_VALIDITY_START_DATE ORDER BY COST_ESTIMATE_RELEASE_DATE DESC)=1),
x AS (SELECT g.PLANT,
   IFF(GOODSMOVEMENTTYPE IN ('551','552'),'551/552', IFF(GOODSMOVEMENTTYPE IN ('701','702'),'701/702','Z71/Z72')) MT,
   g.GLACCOUNT, g.MATERIALBASEUNIT BU, g.MATERIAL,
   IFF(DEBITCREDITCODE='S',1,-1)*ABS(QUANTITYINBASEUNIT) Q,
   GOODSMOVEMENTSTKAMTINCCCRCY AMT, TO_DATE(POSTINGDATE,'YYYYMMDD') PD
 FROM g)
SELECT x.PLANT, x.MT, x.GLACCOUNT, COUNT(*) N,
 ROUND(SUM(IFF(BU='KG',Q,0))/1000,1) KG_T,
 ROUND(SUM(IFF(BU='CS',Q,0)),0) CASES,
 ROUND(SUM(IFF(BU='CS',Q*nw.NET_KG,0))/1000,1) CS_T,
 ROUND(SUM(AMT),0) POSTED,
 ROUND(SUM(IFF(BU='KG',AMT,0)),0) POSTED_KG_ROWS,
 ROUND(SUM(IFF(BU='KG',Q*c.TPK,NULL)),0) STD_KG_ROWS
FROM x
LEFT JOIN nw ON nw.M=LTRIM(x.MATERIAL,'0')
LEFT JOIN cost c ON c.PLANT=x.PLANT AND c.MATERIAL=x.MATERIAL AND x.PD BETWEEN c.VF AND c.VT
GROUP BY ALL ORDER BY 3,1,2;
```
