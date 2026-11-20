# Where is the goods despatched, not invoiced report?

Ticket: #81. Gui wants a "goods despatched, not invoiced" report next to the weekly P&L, so that site finance can explain sales. Gui thinks that the report is already in Qlik (meeting of 2026-11-18, `docs/meeting-transcripts/181126_Meeting.txt`, line 1341). This note finds the report and its data for the pilot sites, Redruth (plant 2504) and Bromborough (plant 2506), company code 125. Research date: 2026-11-20.

In this note, "despatched, not invoiced" means: goods with a posted goods issue on a SAP delivery, where the delivery has no billing document yet.

## Short answer

1. No Qlik app or sheet for despatched, not invoiced was found, in Qlik Cloud or in on-premises Qlik Sense. The closest apps are GRNI (the purchase side) and Service Level (deliveries, but no billing status).
2. On-premises Qlik has the data, but no report uses it. The QVD files `DELIVERYDOCUMENTITEMS_FYP_<year period>.qvd` and `DELIVERYDOCUMENTITEMS_OPEN.qvd` have the delivery billing status. The ETL app "Transform S4 Service Level Mapping" copies them each day. No other app script that reloaded in 2026 names the billing status field.
3. The data is in Snowflake, but only in DEV. `DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_DELIVERYDOCUMENTITEMS_MAIN"` has one row for each delivery item, with goods issue date, goods movement status, billing status and net weight. It loads 3 to 4 times each day. No SAP delivery or billing item table is in `PROD_RAW`.
4. The status in that table is the status now. It is not the status at the end of a week. Some old rows keep billing status `A` (not billed), but SAP has billed them. So a weekly report needs the billing date from a different table.
5. For fiscal week 202646 (2026-11-09 to 2026-11-15), every billable delivery item at both pilot plants is billed. On 2026-11-20, the open items are in week 202647 only, plus 7 old rows that are stale.
6. For question 3: there is no Qlik report to link to today. The app can show the report only after the delivery data moves to a PROD schema, or after the team accepts a DEV source. This is a decision for Gui and Chris.

Confidence: high that no Qlik Cloud app has this report, and for what is in Snowflake. High for the names of on-premises apps and sheets, and for the scripts of apps that reloaded in 2026. Medium for the meaning of the SAP status codes, because I used general SAP knowledge and no SAP documentation in the repo. I did not open on-premises QVD files or Qlik Sense apps that reloaded before 2026.

## Question 1: which Qlik app or sheet has the report?

None was found in Qlik Cloud or in on-premises Qlik Sense.

### What was searched in Qlik Cloud

Qlik Cloud tenant `pilgrimseurope.eu.qlikcloud.com`, read-only tools, 2026-11-20.

| Search | Result |
| --- | --- |
| `qlik_search` for "despatched not invoiced", "dispatched", "despatch", "not invoiced", "unbilled", "DNI", "shipped", "accrued income" | No app or sheet with these words. "not invoiced" found only the AR Progress Dashboard (DEV) and some spaces. |
| `qlik_search` for "delivery", "billing", "invoice", "goods issue" | Apps: PE Service Level_Delivery Detail Template, Giveaway, Inventory Balance Sheet, Central Inventory - Goods Movement, AR - Issue #61. Data integration projects: `SAP_BW_SD_C_DELIVERYDOCUMENTITEMS`, `SAP_BW_C_BILLINGDOCUMENTPRICINGCONDITION`. |
| All apps (`qlik_search` "*", type app, 2 pages, 134 apps) | No app name has despatch, dispatch, DNI, unbilled or "not invoiced". |
| Sheets of Working Capital (`52bb053b-295e-4a1e-8c3e-7128990206d7`, Finance - Prod) | AP Balance Sheet Analysis, GRNI - Detail, AR: Year on Year Variances, AR Balance Sheet Analysis, Application Summary. No despatched, not invoiced sheet. |
| Load script of Working Capital | Loads AR, AP and GL QVDs, and a GRNI QVD (`GRNI_AsOf_Combined.qvd`). No delivery or billing status data. |
| Sheets and load script of Balance Sheet (`405b866f-8b5b-4d1f-9b9d-85b7a75ab152`, Finance - Prod) | One sheet, Balance Sheet Analysis. Loads GL balances from `PILGRIMS_EU_DB.STAGING.V_CASHFLOW_INDIRECT`. No delivery data. |
| Sheets of Pilgrims Europe Sales_UAT (`b0c53219-84ea-4341-b9a3-cb505b3a0249`) | 12 sheets about billed sales (COPA). None for unbilled deliveries. |
| Sheets and load script of PE Service Level_UAT (`0df9726a-d991-459d-acb9-411a17df2a6f`, Supply Chain - UAT) | Service level sheets. Loads `SUPPLYCHAIN_MT.FACTS_CSL_ORDERLINE` and `FACTS_CSL_DELIVERY_DETAIL`. These have goods movement status and despatch date, but no billing status. |
| App in the On_Prem space: "Volume data with PUK shipping points" (`5dd887db-d293-45f3-92e2-9022d46ec4be`) | No sheets. |

Related report: GRNI (goods received, not invoiced) is the purchase-side report. It is in the apps GRNI (`981bcfdf-28ff-4adc-9529-fcdab19e42b2`, Finance - Prod) and Working Capital, sheet "GRNI - Detail". It is not the report that Gui asked for.

Unknown: if the report is a SAP transaction (for example the billing due list, VF04), an Excel file or a QlikView document.

### What was searched in on-premises Qlik Sense

Central node `cen-qliksense.moypark.local`, read-only calls to the Repository API (QRS) and the Engine API (`GetScript`, no data opened), 2026-11-20.

| Search | Result |
| --- | --- |
| Names and descriptions of all 886 apps, for despatch, dispatch, invoice, unbilled, not billed, DNI, billing, delivery, shipped, accrual, goods issue | 13 apps. Most are Intrastat despatch apps in the Archive stream. Live: "Planned Despatch" (stream 3PL_Logistics) and "Hellenic Weekly Delivery Report" (stream Agri). No app for despatched, not invoiced. |
| Names of all 7,206 sheets, same words plus open delivery, uninvoiced, to be invoiced, pending billing, accrual, in transit | Billing document sheets in sales apps (COM Reporting, Pilgrims Europe Sales Reporting - S4, Cost of Sales Reporting S4), "In Transit" sheets in procurement apps, "Picking Accrual" in COM Reporting (Archive), "Deliveries billing test" in an Intrastat app (Archive). No sheet for despatched, not invoiced. |
| Load scripts of 9 candidate apps, for billing status, LIKP, LIPS, VBUK, VBUP, VBFA, goods issue, accrual | No candidate app loads a delivery billing status. Picking Accrual (COM Reporting) has no delivery or billing status field in its script. |
| Load scripts of all 506 apps that reloaded in 2026, for `DELIVERYRELATEDBILLINGSTATUS`, `BILLINGSTATUS`, `DELIVERYDOCUMENTITEMS`, `FKSTA`, `GBSTK`, VBUK, VBUP, VBFA, LIKP, LIPS, not invoiced, unbilled, not billed | 62 apps. "not Invoiced" is in the S4 Procurement apps only (purchase side). `BILLINGSTATUS` in the COM and COPA transform apps is part of other field names, not `DELIVERYRELATEDBILLINGSTATUS`. `DELIVERYRELATEDBILLINGSTATUS` is only in "Transform S4 Service Level Mapping" and two copies of it. |

The on-premises source:

| Item | Value |
| --- | --- |
| ETL app | "Transform S4 Service Level Mapping" (`127ef63b-61f2-4c28-9564-2195faf1b9e2`), stream Qlik Admin ETL. Last reload 2026-11-20. |
| Input QVDs | `003.QVD\Transactional\SD - Sales and Delivery\DELIVERY DOCUMENT ITEMS\DELIVERYDOCUMENTITEMS_FYP_<year period>.qvd` and `DELIVERYDOCUMENTITEMS_OPEN.qvd` |
| Output QVDs | `SAP S4\Service Level\Delivery S4\ServiceLevelDeliveryS4_Raw_<year period>.qvd` and `...\OPEN\ServiceLevelDeliveryS4_Raw_OPEN.qvd` |
| Fields kept | `DELIVERYRELATEDBILLINGSTATUS`, `ITEMISBILLINGRELEVANT`, `INTERCOMPANYBILLINGSTATUS`, `OVERALLINTCOBILLINGSTATUS`, goods movement status |
| Users of the field | None found. No script of an app that reloaded in 2026 names `DELIVERYRELATEDBILLINGSTATUS`, except the ETL app and its copies. Unknown: which apps load the output QVDs. |

Unknown: which app or job makes `DELIVERYDOCUMENTITEMS_OPEN.qvd`, and which rows it holds. No app script that reloaded in 2026 stores this file. It can be a QlikView job or a Talend job. I did not open the QVD.

## Question 2: which data does it use? Is it in Snowflake?

The delivery data is in Snowflake, in DEV only.

### What was searched

| Search | Result |
| --- | --- |
| Table names like `%DELIVERY%`, `%BILLING%`, `%LIKP%`, `%LIPS%`, `%VBRK%`, `%VBRP%`, `%VBFA%`, `%VBUK%`, `%VBUP%`, `%DOCFLOW%`, `%UNBILLED%`, `%NOT_INVOICED%`, `%DNI%`, `%DESPATCH%`, `%DISPATCH%`, `%CSL_%`, `%SHIPMENT%`, `%GOODSISSUE%`, `%OUTBOUND%` (`SNOWFLAKE.ACCOUNT_USAGE.TABLES`) | SAP delivery and billing tables in `DEV_RAW.SAP` only. CSL tables in `DEV_STAGING.SUPPLYCHAIN` and `PROD_ANALYTICS.SUPPLYCHAIN_MT`. No VBFA (document flow), VBRK or VBRP (billing items). |
| `cortex search object` for "despatched not invoiced", "delivered not billed", "billing due list", "delivery document items goods issue", "billing document items", "unbilled deliveries", "SD document flow" | COPA and invoice tables. No other delivery or billing status source. |
| `PROD_RAW.CENQVDDATA` and `DEV_RAW.JBSQLIKS4` table lists | Master data, budget, COPA, GL, goods movements. No delivery or billing status data. |
| Repo search for "despatch", "dispatch", "not invoiced", "unbilled", "not billed" | Only the meeting transcript and the status report row for #81. |

### What is in Snowflake

| Object | Rows | Layer | What it has |
| --- | --- | --- | --- |
| `DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_DELIVERYDOCUMENTITEMS_MAIN"` | 16,625,287 | DEV raw | One row for each delivery item. Goods issue date, goods movement status, billing status, net weight. |
| `DEV_RAW.SAP.C_DELIVERYDOCUMENTITEMS` | 767,125 | DEV landing | The last delta from SAP BW. |
| `DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_BILLINGDOCUMENTPRICINGCONDITION_MAIN"` | 59,351,907 | DEV raw | Billing pricing conditions, with the reference delivery. For 2504 and 2506, billing dates 2025-12-29 to 2026-10-16 only. Last load 2026-10-15. |
| `DEV_STAGING.SUPPLYCHAIN.FACTS_CSL_DELIVERY_DETAIL` | 12,830,725 | DEV staging | CSL delivery fact. Goods movement status and goods issue date. No billing status. |
| `PROD_ANALYTICS.SUPPLYCHAIN_MT.FACTS_CSL_DELIVERY_DETAIL` | View | PROD view | The table comment says that it reads `DEV_STAGING.SUPPLYCHAIN.FACTS_CSL_DELIVERY_DETAIL`. No billing status. |
| `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG` | 24.9 M | PROD silver | COPA billing lines. `REFERENCE_DOCUMENT_NUMBER` is the billing document. `DELIVERY_DOCUMENT` is empty in 2026 (see `research/sales-margin.md`). |

Fields in the delivery table for this report:

| Need | Field | Values at 2504 and 2506 |
| --- | --- | --- |
| Delivery | `DELIVERYDOCUMENT`, `DELIVERYDOCUMENTITEM` | Key. 14 duplicate keys in 1,729,333 rows. |
| Site | `PLANT`, `COMPANYCODE`, `PROFITCENTER` | 2504, 2506, company 125. |
| Despatch date | `ACTUALGOODSMOVEMENTDATE` (text, `YYYYMMDD`) | `00000000` when there is no goods issue. |
| Goods issue status | `GOODSMOVEMENTSTATUS` | `A` and `C` |
| Billing status | `DELIVERYRELATEDBILLINGSTATUS` | `A`, `C` and blank |
| Billing relevance | `ITEMISBILLINGRELEVANT` | `H`, `D`, `J`, `A` and blank |
| Delivery type | `DELIVERYDOCUMENTTYPE` | `ZLF4` (sales), `NL` (to Pilgrim's plants), `LR` |
| Customer | `SOLDTOPARTY`, `SHIPTOPARTY` | |
| Weight | `ITEMNETWEIGHT`, `ITEMWEIGHTUNIT` | KG |
| Value | `TOTALNETAMOUNT` | 0 on all rows in week 202646. The delivery has no value. |

SAP meaning of the status codes (general SAP knowledge, not confirmed in the repo): `A` = not yet processed, `B` = partly processed, `C` = completely processed, blank = not relevant.

The `NL` deliveries go to ship-to parties `P2503` to `P2528`. These are Pilgrim's plants. So they are probably STO. They have no billing status. Unknown: if the report must include STO.

### Load

- Talend (user `TALEND_SECURE`) runs `TRUNCATE TABLE` and `COPY INTO` on `DEV_RAW.SAP.C_DELIVERYDOCUMENTITEMS`.
- Then a task (user `SYSTEM`, role `ENGINEER_ROLE`) clones MAIN, deletes the matching keys from MAIN and inserts the delta.
- This ran 23 times from 2026-11-14 to 2026-11-20. Source: `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`.
- Columns `SOURCE_SYSTEM` = `SAP_HBP_BW` and `PIPELINE` = `SD_DELIVERY_DOCUMENT_ITEMS` on all pilot rows.
- A Qlik data integration project `SAP_BW_SD_C_DELIVERYDOCUMENTITEMS` (`6a7d87454660619fdb1b907a`) also exists. Its source is `DEV_SRC_SAP_HBP_BW` and its target is `DEV_RAW`, schema `SAP`. Unknown: if this project or Talend is the live load.

### Proof for the pilot sites

Fiscal week 202646, 2026-11-09 to 2026-11-15 (`PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER`). Delivery items with goods issue in that week, latest row for each key, read on 2026-11-20:

| Plant | Delivery type | Billing relevance | Billing status | Deliveries | Items | Net kg |
| --- | --- | --- | --- | --- | --- | --- |
| 2504 Redruth | ZLF4 | H | C | 149 | 5,626 | 236,163 |
| 2504 Redruth | NL | D | blank | 100 | 1,453 | 408,202 |
| 2504 Redruth | NL | J | blank | 105 | 386 | 562 |
| 2504 Redruth | ZLF4 | blank | blank | 148 | 363 | 546 |
| 2504 Redruth | LR | blank | blank | 8 | 13 | 5,510 |
| 2506 Bromborough | ZLF4 | H | C | 411 | 9,349 | 525,880 |
| 2506 Bromborough | ZLF4 | blank | blank | 296 | 1,045 | 2 |
| 2506 Bromborough | NL | D | blank | 10 | 272 | 47,852 |
| 2506 Bromborough | NL | J | blank | 13 | 68 | 0 |

No item in week 202646 has billing status `A` or `B`. So on 2026-11-20, nothing from that week is despatched, not invoiced.

For comparison, COPA billing lines with billing date in the same week: 2504 has 226,216 kg on 315 billing documents. 2506 has 511,759 kg on 818 billing documents. Source: `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG`. The difference to the delivered kg includes timing. I did not split it.

All items with goods issue complete (`C`) and billing status `A`, on 2026-11-20:

| Plant | Goods issue week | Deliveries | Items | Net kg | First load | Status in SAP |
| --- | --- | --- | --- | --- | --- | --- |
| 2504 Redruth | 202647 | 13 | 597 | 30,154 | 2026-11-20 | Open (current week) |
| 2504 Redruth | 202641 | 4 | 67 | 2,460 | 2026-10-10 | Billed. See below. |
| 2504 Redruth | 202635 | 1 | 31 | 9,564 | 2026-09-20 | Billed. See below. |
| 2504 Redruth | 202632 | 4 | 160 | 2,008 | 2026-08-28 | Billed. See below. |
| 2504 Redruth | 202513 | 5 | 236 | 4,069 | 2026-09-03 | Unknown |
| 2506 Bromborough | 202647 | 37 | 1,100 | 35,837 | 2026-11-20 | Open (current week) |
| 2506 Bromborough | 202513 | 3 | 130 | 3,040 | 2026-09-03 | Unknown |

The old rows are stale. Two examples:

- Delivery 8002675113 (2504, 9,564 kg, goods issue 2026-08-25) has billing document 9094323909, dated 2026-09-28. Source: `C_BILLINGDOCUMENTPRICINGCONDITION_MAIN`, field `DOCUMENTNUMBEROFTHEREFERENCEDOC`.
- Delivery 8002560848 (2504, goods issue 2026-08-03) has billing document 9093845109, dated 2026-08-03.

The sales orders of the 2026 rows all have COPA billing lines. Each of these rows was loaded once and did not change after. So the delta load does not always send the change of billing status. Unknown: why.

### Gaps

1. The delivery data is in `DEV_RAW` only. No PROD table has delivery items or billing status.
2. The table holds the status now. It does not keep the status at each week end.
3. Some rows have a stale billing status.
4. The billing condition table stops on 2026-10-16. So it cannot give the billing date for later deliveries today.
5. COPA has no delivery number in 2026. A link from COPA to the delivery must use the sales document and item. I did not test this.
6. The delivery item has no value (`TOTALNETAMOUNT` = 0). A value needs a price from the sales order or a standard cost. I did not test this.

## Question 3: can the app link to the Qlik report for v1, or must the app show it?

This is a decision for Gui and Chris. The facts:

| Fact | Status |
| --- | --- |
| A Qlik Cloud report for despatched, not invoiced exists | Not found. There is nothing to link to today. |
| A Qlik report filters by site and fiscal week | Unknown, because no report was found. |
| An on-premises Qlik report exists | Not found. |
| An on-premises QVD with delivery billing status exists | Yes, `DELIVERYDOCUMENTITEMS_FYP_*.qvd` and `DELIVERYDOCUMENTITEMS_OPEN.qvd`. No report uses the billing status. |
| Delivery items with goods issue and billing status are in Snowflake | Yes, in `DEV_RAW.SAP` only. Daily load, 3 to 4 times. |
| The data can filter by plant and fiscal week | Yes. `PLANT` and `ACTUALGOODSMOVEMENTDATE` join to `DIM_CALENDARMASTER`. |
| The data gives kg | Yes, `ITEMNETWEIGHT`. |
| The data gives a value | No. The value must come from a different table. |
| The data gives the status at a past week end | No. Only the status now. Some rows are stale. |
| A PROD view in `PROD_ANALYTICS.SUPPLYCHAIN_MT` already reads DEV data | Yes, the CSL views. Their comment says that they read `DEV_STAGING`. |

## Questions for people

1. For Gui: which report did you mean? Is it in QlikView, in a SAP transaction (for example VF04), or in Excel? Can you send a screenshot or the path?
2. For Gui: must the report include STO deliveries (`NL`), or only sales to customers (`ZLF4`)?
3. For Gui: does site finance need the list at the week end (for example, despatched in the week and not billed by Sunday), or the list today?
4. For Gui: is kg enough, or does the report need a value? If it needs a value, which price: the sales order price or standard cost?
5. For the owner of the SAP delivery load (Unknown): can it move from `DEV_RAW` to `PROD_RAW`? Why do some rows keep billing status `A` after SAP bills them? Which load is live: Talend or the Qlik data integration project?
6. For the owner of the SAP billing condition load (Unknown): why did the load stop on 2026-10-15?
7. For the owner of the on-premises Qlik ETL (Unknown): which job makes `DELIVERYDOCUMENTITEMS_OPEN.qvd`? Does it have the same stale billing status as the Snowflake table?

Answers: Unknown.

## Sources

All Snowflake checks are read-only queries in account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-20. All Qlik checks are read-only calls to the Qlik Cloud tenant and to the on-premises Qlik Sense central node on 2026-11-20.

1. `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `COLUMNS`: name searches, row counts, table comments.
2. `DEV_RAW.INFORMATION_SCHEMA.COLUMNS`: fields of the delivery and billing tables.
3. `DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_DELIVERYDOCUMENTITEMS_MAIN"`: status profile, week 202646, open items, keys.
4. `DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_BILLINGDOCUMENTPRICINGCONDITION_MAIN"` and `DEV_RAW.SAP.BILLINGDOCUMENTPRICINGCONDITION`: date range, delivery to billing link.
5. `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG`: COPA billing lines for the stale sales orders, and week 202646 kg.
6. `PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER`: fiscal weeks 202645 to 202647.
7. `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`, last 7 days: load method.
8. `cortex search object`: searches above.
9. Qlik Cloud: `qlik_search`, `qlik_list_sheets` and `qlik_get_script` for the apps above, and `qlik_get_pipeline_project_details` for project `6a7d87454660619fdb1b907a`.
10. On-premises Qlik Sense: QRS `/qrs/app/full` and `/qrs/app/object/full?filter=objectType eq 'sheet'`, and Engine API `OpenDoc` (`qNoData`) and `GetScript` for the apps above.
11. Repo files: `docs/meeting-transcripts/181126_Meeting.txt`, `research/sales-margin.md`, `research/stock-bom.md`, `GLOSSARY.md`.

Week 202646 by billing status:

```sql
WITH d AS (
  SELECT * FROM DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_DELIVERYDOCUMENTITEMS_MAIN"
  WHERE PLANT IN ('2504','2506') AND COMPANYCODE = '125'
    AND ACTUALGOODSMOVEMENTDATE BETWEEN '20261109' AND '20261115'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY DELIVERYDOCUMENT, DELIVERYDOCUMENTITEM
                             ORDER BY LOADEDDATE_TIMESTAMP DESC) = 1)
SELECT PLANT, DELIVERYDOCUMENTTYPE, ITEMISBILLINGRELEVANT, DELIVERYRELATEDBILLINGSTATUS,
       COUNT(DISTINCT DELIVERYDOCUMENT) DELIVERIES, COUNT(*) ITEMS, ROUND(SUM(ITEMNETWEIGHT)) NET_KG
FROM d GROUP BY ALL ORDER BY 1, ITEMS DESC;
```

Open items (goods issue complete, not billed):

```sql
WITH d AS (
  SELECT * FROM DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_DELIVERYDOCUMENTITEMS_MAIN"
  WHERE PLANT IN ('2504','2506') AND COMPANYCODE = '125'
    AND GOODSMOVEMENTSTATUS = 'C' AND DELIVERYRELATEDBILLINGSTATUS IN ('A','B')
  QUALIFY ROW_NUMBER() OVER (PARTITION BY DELIVERYDOCUMENT, DELIVERYDOCUMENTITEM
                             ORDER BY LOADEDDATE_TIMESTAMP DESC) = 1)
SELECT d.PLANT, c.REPORTING_FISCAL_YEAR_WEEK, COUNT(DISTINCT d.DELIVERYDOCUMENT) DELIVERIES,
       COUNT(*) ITEMS, ROUND(SUM(d.ITEMNETWEIGHT)) NET_KG
FROM d JOIN PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER c
  ON c.CALENDAR_DATE = TO_DATE(d.ACTUALGOODSMOVEMENTDATE, 'YYYYMMDD')
GROUP BY ALL ORDER BY 1, 2 DESC;
```

Delivery to billing document:

```sql
SELECT BILLINGDOCUMENT, BILLINGDOCUMENTTYPE, BILLINGDOCUMENTDATE, PLANT,
       DOCUMENTNUMBEROFTHEREFERENCEDOC, SALESDOCUMENT, COUNT(*) N
FROM DEV_RAW.SAP."jbs_bw4_hana.edw.sd/C_BILLINGDOCUMENTPRICINGCONDITION_MAIN"
WHERE DOCUMENTNUMBEROFTHEREFERENCEDOC IN ('8002675113', '8002560848')
GROUP BY ALL;
```
