# Which GL line item data is in Snowflake, compared with the SAP FAGLL03H report?

Ticket: #4. Site finance uses the SAP report FAGLL03H to examine PPV, stock variances and consumables. This note tells which GL line item data from BW is in Snowflake, and what is missing. Research date: 2026-11-12.

## Short answer

One table holds the GL line items: `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`. It comes from the BW query `C_ACTUALPLANGL` (FIGL). It has 557 million rows, 69 columns, and 43 company codes. It covers fiscal year 2025 period 000 to fiscal year 2026 period 011. It loads every day.

The pilot sites Redruth and Bromborough are in company code 125. The table has most FAGLL03H fields: account, cost centre, profit centre, document, posting date, material, plant, supplier and PO. Some fields are not in the table: line item number, posting key, assignment, reference, document currency amount and movement type. Supplier is on goods receipt lines, but not on invoice lines.

## Tables

| Table | What it is | Rows | Last load | Source |
| --- | --- | --- | --- | --- |
| `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"` | GL line items from the BW query `C_ACTUALPLANGL`. Clustered on `POSTINGDATE`. | 557,304,841 | 2026-11-12 10:17 UTC | `SHOW TABLES` |
| `PROD_RAW.SAP."jbs_bw4_hana_edw_fmco_figl_C_ACTUALPLANGL_W0"` to `_W6` | Seven staging tables. Each holds one week of posting dates. W0 = 2026-11-10 to 2026-11-16. W6 = 2026-09-29 to 2026-10-05. | 1.8 to 6.0 million each | 2026-11-12 | `INFORMATION_SCHEMA.TABLES` |
| `PROD_RAW.SAP."system-local.bw.bw2hana.0/GL_ACCOUNT_REPORTING"` | GL account master, with account names (`0GL_ACCOUNT___T`). Chart of accounts `CA`. | 25,075 | 2026-11-12 | `INFORMATION_SCHEMA.TABLES` |
| `PROD_RAW.SAP."system-local.bw.bw2hana.0/COSTCENTER_REPORTING"` | Cost centre master, with profit centre and company code. | 5,000 | 2026-11-12 | `INFORMATION_SCHEMA.TABLES` |
| `PROD_RAW.SAP."system-local.bw.bw2hana.0/PROFIT_CTR_REPORTING"` | Profit centre master, with names. | 16,934 | 2026-11-12 | `INFORMATION_SCHEMA.TABLES` |
| `PROD_RAW.SAP."system-local.bw.bw2hana.0/VEN_COMPC_REPORTING"` | Supplier per company code. It has no supplier name column. | 25,808 | 2026-11-12 | `INFORMATION_SCHEMA.COLUMNS` |
| `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"` | Goods movements (MM). It has supplier, PO, material, batch and movement type. Posting dates 2024-12-30 to 2026-11-27. | 125,021,852 | 2026-11-12 | `INFORMATION_SCHEMA` |

Views that already read the GL line item table:

- `PROD_STAGING.FINANCE_PL.GL_DETAIL_STG`: 17 columns, renamed to pipeline names, no filter.
- `PROD_STAGING.FINANCE_PL.GL_DETAIL_BWLIVE_STG`: the same 17 columns, P&L accounts only, periods 001 to 012.
- `PROD_ANALYTICS.FINANCE_PL_INT.INT_GL_POSTINGS`: summed to period level, with no document fields. It reads `GL_POSTINGS_SAP_STG`.
- `FINANCE_STORE.BSR.IC_SRC_ACDOCA`: ACDOCA-style names, ledger 1L, for intercompany matching.

## How the data loads

1. At about 09:30 UTC, the Snowflake user `TALEND_SECURE` empties each W table. Then it copies the BW query data into it (`COPY INTO`). Source: `ACCOUNT_USAGE.QUERY_HISTORY`, 2026-11-10 to 2026-11-12.
2. At 10:15 UTC, the task `C_ACTUALPLANGL_TASK` calls `C_ACTUALPLANGL_SP`. The procedure stops if a W table is empty. Otherwise it deletes the W date range from the main table and inserts the W rows. Source: `SHOW TASKS`, `GET_DDL`.
3. The task succeeded on each day from 2026-11-09 to 2026-11-12. Source: `TASK_HISTORY`.

## Company codes and date range

All company codes use chart of accounts `CA`. The table has 43 company codes. Only 26 have postings after period 000. The largest are:

| Company code | Name | Rows | Latest posting date |
| --- | --- | --- | --- |
| 84 | Moy Park Ltd. | 258,930,291 | 2026-11-16 |
| 125 | Pilgrim's Pride LTD | 112,942,925 | 2026-11-16 |
| 156 | Pilgrims Food Masters UK | 111,197,018 | 2026-11-13 |
| 168 | Pilgrims Food Masters ROI | 41,483,635 | 2026-11-16 |
| 91 | Moy Park France SAS | 19,330,542 | 2026-11-16 |
| 95 | Moy Park Beef Orleans | 7,043,658 | 2026-11-13 |
| 98 | Kitchen Range Foods Ltd. | 3,234,983 | 2026-11-13 |
| 100 | Albert van Zoonen BV | 2,551,225 | 2026-11-12 |

Date range for all company codes:

- Fiscal year period: 2025000 to 2026011.
- Posting date: 2024-12-30 to 2026-11-16. Period 000 rows have posting date `00000000`.
- Fiscal year 2026 starts on 2025-12-29.
- Posting dates after the research date occur. Unknown: why.

## Pilot sites

Redruth and Bromborough are in company code 125. Source: `COSTCENTER_REPORTING`, `PROFIT_CTR_REPORTING`.

| Site | Profit centre (old) | Profit centre (new) | Cost centre examples |
| --- | --- | --- | --- |
| Redruth | `0000056300` | `PRED01` | `0000056301` to `0000056396`, `C125RED160` |
| Bromborough | `0000056800` | `PBRO01` | `0000056801` to `0000056896`, `C125BRO160` |

In fiscal year 2026, all actual rows for the two sites use the new profit centres `PRED01` and `PBRO01`. Ledger 0L has 2,208,422 rows for Redruth and 2,082,048 rows for Bromborough. Ledgers 1L and EL also have rows.

## Ledgers and categories

| Ledger | Actual or plan | Category | Rows |
| --- | --- | --- | --- |
| 0L | A | (empty) | 261,911,655 |
| 1L | A | (empty) | 255,416,946 |
| EL | A | (empty) | 22,565,973 |
| S2 | A | (empty) | 6,395,018 |
| S1 | A | (empty) | 6,340,827 |
| 0L, 1L | P | PLANORD01, PLANORD02, Z035, Z000 | 4,674,422 |

Ledgers 0L and 1L have almost the same rows at the pilot sites. Use one ledger, or the totals are double. Unknown: which ledger FAGLL03H uses at the sites.

## FAGLL03H field mapping

The SAP names are standard ACDOCA or BSEG names. The Snowflake names are the BW query names. No BW or SAP owner has confirmed this mapping. "Probable" means the name and the sample data agree, but nobody has confirmed it.

| FAGLL03H field | SAP name | Snowflake column | Status |
| --- | --- | --- | --- |
| Company code | RBUKRS | `COMPANYCODE` (no "C" prefix, for example `125`) | Probable |
| Ledger | RLDNR | `LEDGER` | Probable |
| G/L account | RACCT | `GLACCOUNT` (10 digits with leading zeros) | Probable |
| Fiscal year | GJAHR | `FISCALYEAR` | Probable |
| Posting period | POPER | `FISCALPERIOD`, `FISCALYEARPERIOD` | Probable |
| Posting date | BUDAT | `POSTINGDATE` (text, YYYYMMDD) | Probable |
| Document date | BLDAT | `DOCUMENTDATE` | Probable |
| Entry date | CPUDT | `CREATEDONDATE` | Unknown |
| Document number | BELNR | `ACCOUNTINGDOCUMENTNUMBER` | Probable |
| Line item | DOCLN / BUZEI | None | Missing |
| Document type | BLART | `DOCUMENTTYPE` | Probable |
| Posting key | BSCHL | None | Missing |
| Debit/credit | DRCRK / SHKZG | `DEBITCREDITCODE` (S or H) | Probable |
| Amount in local currency | HSL | `AMOUNTINCOMPANYCODECURRENCY` | Probable |
| Local currency | RHCUR | `COMPANYCODECURRENCY` | Probable |
| Amount in document currency | WSL | None | Missing |
| Other currency amount | Unknown | `AMOUNTINFREEDEFINEDCURRENCY2` | Unknown |
| Cost centre | RCNTR | `COSTCENTER` | Probable |
| Profit centre | PRCTR | `PROFITCENTER` | Probable |
| Functional area | RFAREA | `FUNCTIONALAREA` | Probable |
| Segment | SEGMENT | `SEGMENT` | Probable |
| Plant | WERKS | `PLANT` | Probable |
| Material | MATNR | `MATERIAL` | Probable |
| Quantity | MSL | `VALUATIONQUANTITY` | Unknown |
| Unit | RUNIT | `REFERENCEQUANTITYUNIT` | Unknown |
| Valuation area or type | BWKEY / BWTAR | `VALUATIONTYPE` (samples show the plant number) | Unknown |
| Supplier | LIFNR | `VENDORACCOUNTNUMBER` | Probable |
| Customer | KUNNR | `CUSTOMER` | Probable |
| Purchasing document | EBELN | `PURCHASINGDOCUMENTNUM` | Probable |
| PO item | EBELP | `PURCHASINGDOCUMENTITEM` | Probable |
| Order | AUFNR | `COORDERNUMER` | Unknown |
| Trading partner | RASSC | `TRADINGPARTNERCOMPANYCODE` | Probable |
| Item text | SGTXT | `DOCUMENTITEMTEXT` | Probable |
| Reference document | AWREF | `REFERENCEDOCUMENTNUM` | Unknown |
| Reference | XBLNR | None | Missing |
| Assignment | ZUONR | None | Missing |
| Clearing document and date | AUGBL, AUGDT | None | Missing |
| Movement type | BWART | None in this table. `GOODSMOVEMENTTYPE` in `C_GOODSMOVEMENTDOCUMENTS`. | Missing |
| User name | USNAM | `USERNAME` | Probable |
| Fiscal week | None | `FISCALYEARWEEK` (for example `202701` for 2025-12-29) | Unknown |

## Field fill at the pilot sites

Company code 125, profit centres `PRED01` and `PBRO01`, fiscal year 2026, ledger 0L, actuals. Percent = rows with a value.

By account (examples for PPV, stock variances and consumables):

| GL account | Name | Rows | Supplier % | PO % | Material % | Cost centre % |
| --- | --- | --- | --- | --- | --- | --- |
| 0005000800 | COGS-POV-Raw Mat | 5,317 | 91.0 | 100.0 | 100.0 | 100.0 |
| 0005000820 | COGS-POV-Ingredients | 1,334 | 90.0 | 100.0 | 100.0 | 100.0 |
| 0005000810 | COGS-POV-FinishedGds | 789 | 5.2 | 5.8 | 100.0 | 100.0 |
| 0005030025 | Pkg-Inv PO Var Man | 10,346 | 84.7 | 99.3 | 99.8 | 100.0 |
| 0005000500 | COGS-Phy Inv G/L-Raw | 52,241 | 0.0 | 0.0 | 100.0 | 100.0 |
| 0005000600 | COGS-G/L InvReval-RM | 774 | 0.4 | 0.4 | 100.0 | 100.0 |
| 0005295200 | Sup-Janitorial/Clean | 819 | 10.9 | 18.2 | 97.2 | 100.0 |
| 0005290000 | Sup-Office | 590 | 22.4 | 37.1 | 89.0 | 100.0 |
| 0005297200 | Sup-Blades | 598 | 12.7 | 24.2 | 97.7 | 100.0 |

By document type (accounts `00052*` and the POV and PO variance accounts above):

| Document type | Rows | Supplier % | PO % | Material % |
| --- | --- | --- | --- | --- |
| WE | 15,778 | 100.0 | 100.0 | 100.0 |
| WA | 5,352 | 0.0 | 0.0 | 100.0 |
| RE | 3,414 | 0.0 | 100.0 | 100.0 |
| KP | 1,019 | 100.0 | 100.0 | 100.0 |
| SA | 381 | 0.0 | 0.0 | 0.0 |

## Gaps

- No line item number. One document and account can have many rows (up to 1,734 in one week). The rows are all different, but you cannot point to one SAP line.
- No supplier on invoice lines (document type RE). These lines have the PO. You can get the supplier from the PO, but this needs a PO table. Unknown: if a PO table is in Snowflake.
- No supplier on goods issue and stock count lines (WA, WI). These lines have material and plant only.
- No supplier name. The supplier master has no name column.
- No posting key, assignment, reference (XBLNR), clearing data or document currency amount.
- No movement type in the GL table. The goods movement table has it, but this note did not test a join between the two tables.
- Only the last seven weeks reload. Rows with older posting dates do not change after they leave W6. Unknown: if late changes to older weeks reach Snowflake.
- Fiscal year 2025 and 2026 only. Earlier years are not in this table.

## Open questions

For Aswani (BW):

1. Is the BW query `C_ACTUALPLANGL` at ACDOCA line grain, or does BW sum some lines?
2. Can BW add the line item number (DOCLN), posting key, assignment and reference to the query?
3. What are `VALUATIONTYPE`, `VALUATIONQUANTITY`, `REFERENCEDOCUMENTNUM` and `AMOUNTINFREEDEFINEDCURRENCY2`?
4. Why is the year in `FISCALYEARWEEK` one more than `FISCALYEAR`?
5. What is in `PROD_RAW.SAP.C_ACTUALPLANGL_Additional` (23.8 million rows, same columns)?
6. Do back-postings to weeks older than W6 reach Snowflake?

For Tracy Conall (SAP):

1. Which ledger (0L or 1L) does site finance use in FAGLL03H?
2. Which GL accounts are PPV, stock variances and consumables for Redruth and Bromborough?
3. Which FAGLL03H fields does site finance use for these accounts? Is supplier on invoice lines needed?

## Sources

All Snowflake checks ran read-only on account `PILGRIMS_EUROPE_PROD`, role `ENGINEER_ROLE`, on 2026-11-12.

1. `SHOW TABLES` and `PROD_RAW.INFORMATION_SCHEMA.TABLES` and `COLUMNS`, schema `PROD_RAW.SAP`.
2. `GET_DDL` of `PROD_STAGING.FINANCE_PL.GL_DETAIL_STG`, `GL_DETAIL_BWLIVE_STG`, `PROD_ANALYTICS.FINANCE_PL_INT.INT_GL_POSTINGS` and `FINANCE_STORE.BSR.IC_SRC_ACDOCA`.
3. `GET_DDL` of procedure `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL_SP"`, and `SHOW TASKS IN DATABASE PROD_RAW`.
4. `PROD_RAW.INFORMATION_SCHEMA.TASK_HISTORY`, task `C_ACTUALPLANGL_TASK`, 2026-11-06 to 2026-11-12.
5. `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` and `SESSIONS`, writes to `C_ACTUALPLANGL_W0`, 2026-11-09 to 2026-11-12.
6. `SELECT` aggregates on `C_ACTUALPLANGL`: rows, company codes, posting dates, ledgers, field fill.
7. Master data: `COMP_CODE_REPORTING`, `COSTCENTER_REPORTING`, `PROFIT_CTR_REPORTING`, `GL_ACCOUNT_REPORTING`, `VEN_COMPC_REPORTING` in `PROD_RAW.SAP`.
