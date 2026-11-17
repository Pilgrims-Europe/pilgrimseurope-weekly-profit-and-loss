# What does movement type Z61 record?

Ticket: #30. The weekly P&L line Production Tonnage uses SAP movement type Z61 less Z62 at Redruth and Bromborough. This note finds what Z61 records, and if it is the correct source. Research date: 2026-11-17.

## Short answer

Z61 is a goods receipt of produced material into stock, against a production cost centre. Z62 is its reversal. No production order is used. An interface (SAP user `BACKGROUND`) posts almost all Z61 rows. Weekly Z61 tonnes agree with Arolink output within about 2%.

Z61 is the only production receipt at the pilot sites. But Z61 has a receipt for each production stage, not only for the last stage. So the current rule counts the same meat more than one time. The current rule also drops finished goods with base unit CS (cases).

- Redruth: 84% of Z61 tonnes (base unit KG) are semi-finished goods. Movement type 201 issues them again to the next stage. Finished goods are about 15% to 20% of Z61 tonnes.
- Bromborough: 22% of Z61 tonnes (base unit KG) are semi-finished goods. The KG filter drops about 60 to 90 t of finished goods each week.

The SAP movement type configuration (tables T156 and T156T) is not in Snowflake. No table has a text for Z61. The SAP text, and the site finance definition of production tonnage, are Unknown. A person must confirm them. See "Who can confirm".

Confidence: high for what Z61 does in the data. Medium for the meaning of "POO" and for the correct tonnage rule. Those need SAP configuration or site finance.

## Is the configuration in Snowflake?

No. These searches found no movement type text table:

| Search | Result |
| --- | --- |
| Table name like `%T156%`, `%MOVEMENTTYPE%`, `%MOVEMENT_TYPE%`, `%BWART%`, `%MOVETYPE%`, `%GOODSMVT%` | Only the goods movement tables. No text table. |
| Column name like `%MOVEMENTTYPE%`, `%BWART%`, `%MOVETYPE%`, `%MOVEMENTTYPETEXT%`, `%MOVEMENTTYPENAME%` | Movement type codes only, in goods movement, delivery, ledger, Mtech and Hellenic tables. No text column. |
| View text that contains `'Z61'` | Only `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_MOVEMENT_WEEK` (this project). |

`PROJECT_CLARITY_PUK_REPORTING_DB.PUBLIC.VOLUME_SAP` has a `MOVETYPE` field with Z61 rows. It has no text. It is a one-off load "From SAP" with 432,706 rows, for calendar days 2023-12-24 to 2024-03-07. It shows only that Z61 was in use before 2024.

## What Z61 rows contain

Source: `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`. Posting date 2025-12-29 to 2026-11-17. One row for each document item (duplicates removed, as in `sql/09_wpl_movement_week.sql`).

| Field | Z61 | Z62 |
| --- | --- | --- |
| Rows, Redruth (2504) | 267,840 | 9,481 |
| Rows, Bromborough (2506) | 137,285 | 5,805 |
| Debit/credit | `S` (debit, into stock) | `H` |
| Stock change category | `GR` (goods receipt) | `GR` |
| Inventory transaction type | `WA` (same as 201, 309, 311) | `WA` |
| Reversal flag | blank | `X` |
| Quantity sign | positive | negative |
| Material type | `FERT` (and 1 `ROH` row at 2504) | `FERT` only |
| Cost centre | `C125RED160` (Redruth), `C125BRO160` (Bromborough) | same |
| Manufacturing order | blank on all rows | blank on all rows |
| Purchase order | blank on all rows | blank on all rows |
| Created by | `BACKGROUND` on all Redruth rows. 99% of Bromborough rows. | `BACKGROUND`, plus 4 named users at Bromborough |
| Header text | A 12-digit number on almost all rows, for example `044200181506` | same |
| Document | One item for each material document | same |
| Storage locations | 0001, 0015, 1001 (Redruth); 0015, 1001, 1020, 2X16 (Bromborough) | same |

Unknown: what the 12-digit header text is. It is different on almost every row. It can be an Arolink label or pack number, but this is not confirmed.

Z62 has a quantity with a minus sign. So `SUM(QUANTITYINBASEUNIT)` over Z61 and Z62 gives Z61 less Z62. The current view does this correctly.

Z61 is not used at Carrickmacross (PF68). It is used at plants 2501, 2503, 2504, 2505, 2506, 2517, 2525, 2527 and 2528.

## GL accounts: output, consumption and stock count

Z61 and Z62 are the only movement types that post to GL accounts 5000035, 5000095 and 5000100 at the pilot plants. Names from `PROD_ANALYTICS.FINANCE_MT.DIM_GLACCOUNTMASTER` (chart of accounts CA):

| GL account | Name | Movement types at 2504 and 2506 |
| --- | --- | --- |
| 5000035 | COGS-POO PROH | Z61, Z62 |
| 5000095 | COGS-POO SF-Other | Z61, Z62 |
| 5000100 | COGS-POO FG-Fresh | Z61, Z62 |
| 5000295 | COGS-Mat Con SF-Othe | 201, 202 |
| 5000395 | COGS-Mat Con RM-Otr | 201, 202 |
| 5000435 | COGS-Mat Con FG-Otr | 201, 202 |
| 5000490 | COGS-Mat Con Ingred | 201, 202 |
| 5000500 | COGS-Phy Inv G/L-Raw | Z71, Z72 |
| 5000510 | COGS-Phy Inv G/L-FG | Z71, Z72 |

"Mat Con" is material consumption. "SF" is semi-finished. "FG" is finished goods. Unknown: what "POO" and "PROH" mean. The names show that Z61 credits production output and 201 debits material consumption. These are the "production output credits" in `sql/04_wpl_gl_account_map.sql`.

Z71 and Z72 post to the "Phy Inv" (physical inventory) accounts. They are small (below 100 t at each plant since 2025-12-29). They are not production.

## Semi-finished goods are counted more than one time

Net tonnes, base unit KG, 2025-12-29 to 2026-11-17:

| Plant | Movement | GL account | Net t |
| --- | --- | --- | --- |
| 2504 | Z61 less Z62 | 5000095 (SF) | 79,054 |
| 2504 | Z61 less Z62 | 5000100 (FG) | 15,554 |
| 2504 | Z61 less Z62 | 5000035 | 37 |
| 2504 | 201 less 202 | 5000295 (SF consumption) | 78,810 |
| 2504 | 201 less 202 | 5000395 (RM consumption) | 14,148 |
| 2506 | Z61 less Z62 | 5000095 (SF) | 5,856 |
| 2506 | Z61 less Z62 | 5000100 (FG) | 21,014 |
| 2506 | Z61 less Z62 | 5000035 | 124 |
| 2506 | 201 less 202 | 5000295 (SF consumption) | 5,508 |
| 2506 | 201 less 202 | 5000395 (RM consumption) | 22,737 |

At Redruth, SF receipts (79,054 t) and SF consumption (78,810 t) are almost equal. A semi-finished material goes into stock with Z61. Then 201 issues it to the next stage.

The top Z61 materials at Redruth show the stages. Each is about 2,100 t, and 201 issues the same quantity again:

| Material | Description | Z61 t | 201 t | 601 t |
| --- | --- | --- | --- | --- |
| 38162088 | IJ BQAP RT MSS RAODB TBS BACKS LS | 2,273 | 2,269 | 0 |
| 38162089 | SM BQAP RT MSS RAODB SMK BACKS LS | 2,181 | 2,181 | 0 |
| 38162092 | PR BQAP RT MSS RAODB SMK BACKS LS | 2,145 | 2,159 | 0 |
| 38162091 | RA BQAP RT MSS RAODB SMK BACKS LS | 2,144 | 2,141 | 0 |
| 38162090 | PK BQAP RT MSS RAODB SMK BACKS LS | 2,118 | 2,126 | 0 |
| 30160136 | CO RTA RA ODB SMK RL BACK BACON 24X300G | 1,527 | 5 | 1,572 |

Materials that start with 38 are semi-finished (GL 5000095). Materials that start with 30 are finished goods (GL 5000100). Finished goods go out with 601 (delivery) or 641 (stock transfer). Description source: `PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER`.

## Finished goods in cases are dropped

Some finished goods have base unit `CS`. The current view keeps base unit `KG` only.

| Plant | Z61 less Z62 rows in CS | Cases | Tonnes (cases x material net weight) |
| --- | --- | --- | --- |
| 2504 | 1,780 | 98,845 | 352 |
| 2506 | 14,853 | 758,303 | 2,727 |

Net weight is `NET_WEIGHT` in `DIM_MATERIALMASTER`, weight unit KG. All CS materials have a net weight. Unknown: if net weight is the correct weight for production tonnage.

## Check against Arolink

Arolink output is `ACT_WEIGHT_KG_AROLINK_OUTPUT` in `PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD`, all stages added. Weeks start on Monday.

| Plant | Week | Z61 less Z62, KG (t) | CS as kg (t) | Z61 total (t) | Z61 FG only (t) | Arolink (t) | Difference |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2504 | 2026-10-05 | 2,201.3 | 12.3 | 2,213.6 | 343.2 | 2,187.3 | 1.2% |
| 2504 | 2026-10-12 | 2,245.9 | 13.0 | 2,258.9 | 321.1 | 2,254.2 | 0.2% |
| 2504 | 2026-10-19 | 2,388.4 | 39.7 | 2,428.1 | 367.7 | 2,412.5 | 0.6% |
| 2504 | 2026-10-26 | 2,358.5 | 61.0 | 2,419.5 | 461.2 | 2,399.2 | 0.8% |
| 2504 | 2026-11-02 | 2,495.3 | 28.1 | 2,523.3 | 459.6 | 2,509.9 | 0.5% |
| 2506 | 2026-10-05 | 655.8 | 63.6 | 719.4 | 568.6 | 633.4 | 13.6% |
| 2506 | 2026-10-12 | 648.8 | 62.6 | 711.4 | 563.0 | 703.6 | 1.1% |
| 2506 | 2026-10-19 | 642.1 | 64.8 | 706.9 | 561.8 | 695.3 | 1.7% |
| 2506 | 2026-10-26 | 718.5 | 81.6 | 800.1 | 618.1 | 782.6 | 2.2% |
| 2506 | 2026-11-02 | 722.5 | 87.8 | 810.3 | 619.7 | 796.7 | 1.7% |

"Difference" is Z61 total against Arolink. "Z61 FG only" is GL 5000100, KG and CS. Arolink also adds all stages. So Arolink output is also not plant output without change. Unknown: why week 2026-10-05 at Bromborough differs by 13.6%.

## Other candidate movement types

Posting date 2025-12-29 to 2026-11-17, duplicates removed.

| Movement type | SAP standard meaning | 2504 and 2506 |
| --- | --- | --- |
| 101 | Goods receipt | 303,846 rows. All have a purchase order and no manufacturing order. Not production. |
| 131 | Goods receipt from a run schedule header | 0 rows |
| 261 and 262 | Goods issue to an order | 0 rows |
| 521 and 522 | Goods receipt without an order | 0 rows |
| 531 and 532 | Goods receipt of a by-product | 0 rows |
| 201 and 202 | Goods issue to a cost centre | Input side of production (consumption) |
| Z61 and Z62 | Unknown (custom) | The only production receipt |

At Carrickmacross (PF68), production receipts are 101 with a manufacturing order (61,325 rows, 42,886 t). Issues are 261 (1,552,605 rows).

The SAP standard meanings above are general SAP knowledge. They are not from a source in Snowflake.

## What this means for Production Tonnage

Z61 is the correct movement type family for production at the pilot sites. No other movement type records production output there. But "Z61 less Z62, base unit KG" is not a clean production tonnage:

1. It adds semi-finished stage outputs. At Redruth this makes the total about 5 to 7 times the finished goods output.
2. It drops finished goods in cases. At Bromborough this is about 10% to 14% of finished goods output each week.

Possible rules, for a person to choose. This note does not choose one.

- A: All Z61 less Z62 (all stages). This agrees with Arolink total output.
- B: Z61 less Z62 on GL 5000100 only (finished goods), with CS converted by net weight.
- C: The rule that site finance uses today. This is Unknown.

## Who can confirm

- Aswani Nune, SAP BW Developer, Information Technology: the SAP text of Z61, Z62, Z71 and Z72 (tables T156 and T156T). If T156 and T156T can be extracted to `PROD_RAW.SAP`. What the 12-digit header text is, and which interface posts as `BACKGROUND`.
- Simon Thompson, Head of Finance Systems, Finance: the meaning of "POO" and "PROH" in the GL account names. Which GL accounts are production output.
- Redruth and Bromborough site finance: which tonnage they report as production tonnage today. Owner name: Unknown.

## Open questions

1. What is the SAP text of Z61 and Z62 in T156T?
2. Does site finance report all stages, finished goods only, or another quantity as production tonnage?
3. Must finished goods in cases be in production tonnage? If yes, is material net weight the correct weight?
4. What is the 12-digit header text on Z61 rows? Is it an Arolink label number?
5. Why does Bromborough differ from Arolink by 13.6% in week 2026-10-05?

## Sources

All checks are read-only queries in Snowflake account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-17.

1. `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `SNOWFLAKE.ACCOUNT_USAGE.COLUMNS`: search for movement type configuration and text, by the name patterns above.
2. `SNOWFLAKE.ACCOUNT_USAGE.VIEWS`: views with `'Z61'`, `VOLUME_SAP` or `MOVETYPE` in the text.
3. `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`: all Z61, Z62 and comparison figures. Filter: `PLANT IN ('2504','2506')`, `POSTINGDATE >= '20251229'`. Duplicates removed with `QUALIFY ROW_NUMBER() OVER (PARTITION BY MATERIALDOCUMENTYEAR, MATERIALDOCUMENT, MATERIALDOCUMENTITEM, MATERIALDOCUMENTRECORDTYPE ORDER BY MATERIALDOCUMENT) = 1`.
4. `PROD_ANALYTICS.FINANCE_MT.DIM_GLACCOUNTMASTER`: GL account names (`GL_ACCOUNT_LONG_DESC`).
5. `PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER`: material descriptions and `NET_WEIGHT`. Join on `LTRIM(MATERIAL_NUMBER, '0') = LTRIM(MATERIAL, '0')`. One material has 2 rows with the same net weight.
6. `PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD`: Arolink output by `SITE_ID` and week.
7. `PROJECT_CLARITY_PUK_REPORTING_DB.PUBLIC.VOLUME_SAP`: old SAP volume extract with `MOVETYPE`.
8. Repo files: `sql/09_wpl_movement_week.sql`, `sql/02_wpl_line.sql`, `sql/04_wpl_gl_account_map.sql`, `research/stock-bom.md`.

Main query for the Arolink check:

```sql
WITH g AS (
 SELECT * FROM PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"
 WHERE PLANT IN ('2504','2506') AND POSTINGDATE BETWEEN '20261005' AND '20261108' AND GOODSMOVEMENTTYPE IN ('Z61','Z62')
 QUALIFY ROW_NUMBER() OVER (PARTITION BY MATERIALDOCUMENTYEAR, MATERIALDOCUMENT, MATERIALDOCUMENTITEM, MATERIALDOCUMENTRECORDTYPE ORDER BY MATERIALDOCUMENT)=1),
w AS (SELECT LTRIM(MATERIAL_NUMBER,'0') M, MAX(IFF(WEIGHT_UNIT='KG',NET_WEIGHT,NULL)) NET_KG FROM PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER GROUP BY 1),
z AS (SELECT g.PLANT, DATE_TRUNC('WEEK', TO_DATE(POSTINGDATE,'YYYYMMDD')) WK,
  SUM(IFF(MATERIALBASEUNIT='KG',QUANTITYINBASEUNIT,0))/1000 KG_T,
  SUM(IFF(MATERIALBASEUNIT='CS',QUANTITYINBASEUNIT*w.NET_KG,0))/1000 CS_T,
  SUM(IFF(MATERIALBASEUNIT='KG' AND GLACCOUNT='0005000100',QUANTITYINBASEUNIT,0))/1000 FG_KG_T
  FROM g LEFT JOIN w ON w.M=LTRIM(g.MATERIAL,'0') GROUP BY 1,2),
a AS (SELECT SITE_ID PLANT, DATE_TRUNC('WEEK',DATE) WK, SUM(ACT_WEIGHT_KG_AROLINK_OUTPUT)/1000 ARO_T
  FROM PROD_ANALYTICS.OPERATIONS_MT.FACTS_YIELD WHERE SITE_ID IN ('2504','2506') AND DATE BETWEEN '2026-10-05' AND '2026-11-08' GROUP BY 1,2)
SELECT z.PLANT, z.WK, KG_T, CS_T, KG_T+CS_T AS Z61_ALL_T, FG_KG_T+CS_T AS FG_ALL_T, ARO_T
FROM z LEFT JOIN a ON a.PLANT=z.PLANT AND a.WK=z.WK ORDER BY 1,2;
```
