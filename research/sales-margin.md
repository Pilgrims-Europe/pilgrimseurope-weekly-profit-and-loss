# Which sales and standard margin data is in Snowflake, compared with the Qlik sales dashboards?

Ticket: #6. Site finance builds the sales and standard margin lines of the weekly P&L from different tools. PUK sites use COPA, PFM and Moy Park use Qlik, and other sites use VF05. This note lists the Snowflake data that can replace them for the pilot sites, Redruth and Bromborough. Research date: 2026-11-12.

## Short answer

Snowflake has SAP COPA billing lines for all SAP companies, including PUK, PFM and Moy Park. The lines include customer, material, kg, net sales, cost of sales and freight. The standard cost split (meat, packaging, labour) is only in the silver table `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG`. The gold table `PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4` does not carry the split. For Redruth and Bromborough, the split per kg is the same as the released standard cost estimate. Snowflake has no delivery date for these lines. All filled date fields are the billing date or the posting date. Intercompany sales are in both tables, with a flag. The `FINANCE_STORE.SALES` layer removes them.

## Objects

| Object | Type | Layer | Grain | What it adds | Source |
| --- | --- | --- | --- | --- | --- |
| `PROD_RAW.SAP."jbs_bw4_hana_edw_fmco_copa/C_PROFITABILITYANAL_COSTING_PEU"` | Table, 43.4 M rows | Raw | COPA line | SAP BW/4HANA COPA extract | `cortex search object`, silver DDL |
| `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG` | Dynamic table, 24.9 M rows | Silver | COPA line | Renamed columns, cost split, freight, `INTERCOMPANY_FLAG` | `GET_DDL` |
| `PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4` | Dynamic table, 19.5 M rows | Gold | COPA line | Actual + budget + forecast. Net revenue, COS, freight, CM1, CM2, GBP values, site name, `INTERCO_FLAG` | `GET_DDL` |
| `PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED` | Dynamic table, 1.0 M rows | Gold | Cost estimate per material and plant | Released standard cost split: `MEAT`, `PACKAGING`, `LABOR_DIRECT`, `INGREDIENTS` and others | `INFORMATION_SCHEMA.COLUMNS` |
| `FINANCE_STORE.SALES.SALES_WEEKLY_BASE` | Table, 2.8 M rows | Mart | Week (Monday to Sunday) x site x customer x material | Weekly sales, `COS_GBP`, `FREIGHT_GBP`, `CM1_GBP`. Non-intercompany only. | Table comment |
| `PROD_ANALYTICS.FINANCE_MT.DIM_PLANTMASTER`, `DIM_CUSTOMERMASTER`, `DIM_MASTERMATERIALGROUPINGS` | Dynamic tables | Gold | Master data | Plant, customer and material names | `cortex search object` |

## Fields

Names are from the silver table unless the table is given.

| Need | Field | Notes |
| --- | --- | --- |
| Customer | `SOLD_TO_PARTY`, `SHIP_TO_PARTY`, `PAYER` | Names from `DIM_CUSTOMERMASTER`. Gold adds `SHIP_TO_NAME`. |
| Material | `MATERIAL` | Gold adds `MATERIAL_SHORT` (no leading zeros). |
| Site | `PLANT`, `PROFIT_CENTER` | Gold adds `SITE_NAME` from a profit centre map. Redruth is plant 2504. Bromborough is plant 2506. Both are company 125. |
| Date | `POSTING_DATE`, `BILLING_DOC_DATE` | See "Delivery date" below. |
| Volume | `QUANTITY_IN_KG` | Gold adds `SALES_KG`, `CASES`, `PACKS`. |
| Net sales | Gold `NET_REVENUE`, `NET_REVENUE_GBP_CALC` | Gross revenue plus promotions, rebates and billbacks. Silver `NET_SALES` is NULL for company 125. |
| Cost of sales | Gold `COS`, `COS_GBP_CALC` | `BILLED_COGS + IC_COST + CC_COSTOFGOODSSOLD`. |
| Standard meat cost | `COST_COMPONENT_MEAT` | From raw `CC_COST001`. Silver only. |
| Standard packaging cost | `COST_COMPONENT_PACKAGING` | From raw `CC_COST004`. Silver only. |
| Standard labour cost | `COST_COMPONENT_LABOR` | From raw `CC_COST005 + CC_COST009`. Silver only. |
| Other standard cost | `COST_COMPONENT_INGREDIENTS` (`CC_COST003`), `CC_COST006`, `COST_COMPONENT_PRIMARY`, `COST_COMPONENT_SECONDARY` | Silver only. `TOTAL_COST` is NULL for company 125. |
| Freight | `CC_FREIGHT_ZUF2`, `SD_FREIGHT` (raw `PAMFREIGHTINLAND`) | Gold `FREIGHT_STAT` uses `-CC_FREIGHT_ZUF2` for company 125 actuals. It uses `SD_FREIGHT` for other companies. |
| Intercompany | Silver `INTERCOMPANY_FLAG` (`X`); gold `INTERCO_FLAG` | See "Intercompany" below. |

### Standard cost split check

For company 125, January to 11 November 2026, the split adds up to about 99% of billed COGS:

| Item | GBP million |
| --- | --- |
| `BILLED_COGS` | 683.8 |
| Meat | 530.8 |
| Ingredients | 33.3 |
| Packaging | 33.3 |
| Labour | 66.3 |
| `CC_COST006` | 10.9 |

This check uses the top materials at Redruth and Bromborough, in the week of 19 October 2026. The COPA split per kg is the same as the released cost estimate in `FACT_PRODUCT_COST_RELEASED`. The estimate uses costing variant Z125, version 01:

| Plant | Material | COPA meat £/kg | Estimate meat £/kg | COPA packaging £/kg | Estimate packaging £/kg | COPA labour £/kg | Estimate direct labour £/kg |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2504 Redruth | 30161119 | 3.733 | 3.733 | 0.235 | 0.235 | 0.344 | 0.344 |
| 2506 Bromborough | 30320245 | 3.015 | 3.015 | 0.168 | 0.168 | 0.145 | 0.145 |

So the COPA split is the standard cost per kg multiplied by the kg sold.

The released cost estimates for plants 2504 and 2506 have no distribution expense. So the standard cost does not include freight.

### Delivery date

The silver table has delivery fields: `PFA_DELIVERY_DATE`, `SHIPPED_DATE` and `DELIVERY_DOCUMENT`. They are empty for all companies in 2026. `REQ_DATE_SCHEDULE_LINE` has values. For Redruth and Bromborough, it is the same as `BILLING_DOC_DATE` on almost all rows (99.9%). `BILLING_DOC_DATE` is the same as `POSTING_DATE` on 46% of Bromborough rows and 16% of Redruth rows.

## Sites and date range (gold, actuals)

| Company code | Company | Group | Example sites (`SITE_NAME`) | Actuals from | Actuals to |
| --- | --- | --- | --- | --- | --- |
| 125 | Pilgrim's Pride LTD | PUK | Redruth, Bromborough, Bodmin, Corsham, King's Lynn, Linton, Ruskington, Andover, Fresh Commercial, Agri (Pork) | 2025-03-31 | 2026-11-11 |
| 156 | Pilgrims Food Masters UK | PFM | Windmill Lane, Hyde, Enniskillen, Shillelagh, Attleborough, Carrickmacross | 2025-04-03 | 2026-11-11 |
| 168 | Pilgrims Food Masters ROI | PFM | Shillelagh, Carrickmacross, Enniskillen | 2025-03-31 | 2026-11-11 |
| 84 | Moy Park Ltd. | Moy Park | Anwick, Ballymena, Craigavon, Dungannon, Grantham, Ashbourne | 2025-03-31 | 2026-11-11 |
| 91 | Moy Park France SAS | Moy Park | Henin, Marquise | 2025-04-22 | 2026-11-10 |
| 95 | Moy Park Beef Orleans | Moy Park | Orleans | 2025-04-22 | 2026-11-10 |
| 98 | Kitchen Range Foods Ltd. | Other | Kitchen Range | 2025-04-14 | 2026-11-10 |
| 100 | Albert van Zoonen BV | Other | Schagen | 2025-04-03 | 2026-11-10 |

Group names are from the company mapping in the Qlik app "Weekly P&L Project - v01_UAT_Cloud_03112026". Gold also has budget (2025-12-29 to 2026-12-21) and forecast versions. Pilot actuals in `SALES_WEEKLY_BASE` start in the week of 2025-04-28.

The standard cost split is not filled for every company. In 2026, meat cost is 0 for companies 95, 98 and 100. Company 98 has packaging and ingredients only.

## Intercompany

Intercompany sales are in the silver and gold tables. Two flags use different rules:

- Silver `INTERCOMPANY_FLAG = 'X'` comes from SAP (`C_INTERCOMPANYFLAG`).
- Gold `INTERCO_FLAG = 'Interco'` when the payer account group is `Z100` or `Z109`.

The two flags do not give the same rows. For the pilot plants in 2026 (silver rows, payer joined to `DIM_CUSTOMERMASTER`):

| Plant | Silver `X` rows | Of these, gold rule says Interco | Gold rule Interco rows without silver `X` |
| --- | --- | --- | --- |
| 2504 Redruth | 15 | 0 | 544 |
| 2506 Bromborough | 3,419 | 0 | 0 |

For company 125, October to November 2026, most silver `X` rows are at plants 2545, 2546 and 2547. These rows have no cost split.

For the pilot sites in 2026 (gold, actuals):

| Site | `INTERCO_FLAG` | Payer account group | Net revenue GBP million |
| --- | --- | --- | --- |
| Redruth | Interco | Z109 | 1.72 |
| Redruth | Non-Interco | 0003, 0001 | 72.68 |
| Bromborough | Non-Interco | 0003, 0001 | 117.83 |

`FINANCE_STORE.SALES` views (`FACT_COPA_PROD`, `FACT_SALES_LIVE`, `SALES_WEEKLY_BASE`) are non-intercompany and exclude vans. This is stated in their table comments.

## Qlik comparison

Qlik Cloud tools were available. I used read-only search and script reads.

| Qlik app | Space | Data source | Sales lines | Cost split | Delivery date |
| --- | --- | --- | --- | --- | --- |
| Pilgrims Europe Sales_UAT (also _DEV) | Finance – UAT | Snowflake `FACT_COPAPEUS4`, `DIM_CALENDARMASTER`, `DIM_MASTERMATERIALGROUPINGS`, `DIM_CUSTOMERMASTER` | Yes: customer, material, site, net revenue, COS, freight, CM1, CM2, `INTERCO_FLAG` | Not loaded | Not loaded. Uses posting date. PFM Monday postings move to Sunday (`ReportingDate`). |
| Weekly P&L Project - v01_UAT_Cloud_03112026 | Finance - Dev | GL line item QVDs (`UNIVERSALLEDGERLINEITEMS_FYP_*.qvd`) and Excel maps | No. GL amounts by account, plant and material. | No | No |

The new Qlik Cloud sales app reads the same Snowflake gold table as this note. Its fields are a subset of the gold table. Search found no Qlik Cloud app named for PFM, Moy Park, COPA or margin.

Unknown: which Qlik dashboard PFM and Moy Park site finance use today. It can be on-premises Qlik. I did not look there.

## Gaps

- No delivery date. Snowflake COPA has billing date and posting date only.
- The standard cost split is in silver only. Gold and the `FINANCE_STORE.SALES` layer do not carry it.
- No VF05 data. `SHOW OBJECTS LIKE '%VF05%' IN ACCOUNT` returns no rows. VF05 is a list of SAP billing documents. COPA has billing lines for the same SAP companies.
- Freight: Unknown which field is "standard freight". `CC_FREIGHT_ZUF2` and `SD_FREIGHT` are both filled for the pilot plants. They give different values per kg (Redruth: 0.198 and 0.138 £/kg).
- The two intercompany flags do not agree.
- Silver `NET_SALES` and `TOTAL_COST` are NULL for company 125.

## Open questions

1. For Gui: which date is "delivery date" in the Qlik dashboard? Is billing date good enough?
2. For Gui: is standard freight the SAP condition ZUF2 or the inland freight value field?
3. For Gui: which Qlik dashboard and which fields do PFM and Moy Park use today? Where is it hosted?
4. Which sites use VF05? Are they on SAP COPA?
5. Which intercompany rule does the weekly P&L need: the SAP flag or the payer account group?
6. Is labour `CC_COST005 + CC_COST009` the same labour line that site finance uses?

## Sources

All Snowflake checks are read-only queries on account JBSUSA-PILGRIMS_EUROPE_PROD, 2026-11-12.

1. `GET_DDL('TABLE','PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4')`: union of actuals, budget, forecast; `INTERCO_FLAG`, `COS`, `NET_REVENUE`, `FREIGHT_STAT` logic.
2. `GET_DDL('TABLE','PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG')`: raw source and cost component mapping.
3. `PROD_ANALYTICS.INFORMATION_SCHEMA.COLUMNS` and `PROD_STAGING.INFORMATION_SCHEMA.COLUMNS`: column lists.
4. `FINANCE_STORE.INFORMATION_SCHEMA.TABLES`: comments on `FINANCE_STORE.SALES` objects.
5. Profile queries on `FACT_COPAPEUS4` and the silver table: row counts, sites, dates, fill rates, totals.
6. `PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED`: released cost estimates for plants 2504 and 2506.
7. `PROD_ANALYTICS.FINANCE_MT.DIM_PLANTMASTER`: plant and company names.
8. `SHOW OBJECTS LIKE '%VF05%' IN ACCOUNT`: no rows.
9. Qlik Cloud, app "Pilgrims Europe Sales_UAT" (b0c53219-84ea-4341-b9a3-cb505b3a0249), load script read on 2026-11-12.
10. Qlik Cloud, app "Weekly P&L Project - v01_UAT_Cloud_03112026" (a97cd5ba-b495-4874-acb2-3091b735d49e), load script read on 2026-11-12.
