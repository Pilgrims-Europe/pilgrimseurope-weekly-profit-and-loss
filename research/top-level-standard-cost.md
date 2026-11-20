# Is top-level standard cost (ZFI28N) in Snowflake?

Ticket: #74. Gui needs top-level standard cost by cost component for the production variances in the weekly P&L. Today site finance runs the SAP report ZFI28N by hand each week. This note finds what product costing data is in Snowflake, and if it can give top-level standard cost. Research date: 2026-11-19.

## Short answer

1. ZFI28N is not in Snowflake. The SAP cost estimate is in Snowflake, but only as one cumulative cost component split for each material. Snowflake has no top-level split and no lower-level split.
2. The SAP BW team can possibly add it. The cost estimate already comes from SAP BW/4HANA through Talend. If the BW source can give the lower-level split, the load is a small change. This is Unknown. See "Question for Aswani Nune".
3. The costing changes once a fiscal period (4 or 5 weeks), not once a week. Each material has at most 1 released cost estimate in each fiscal period in 2026.
4. All 35 plants use cost component structure P1. UK company code 125 uses costing variant Z125 (and ZPKG for packaging). All other company codes use PPC1.

A possible workaround: top level = the material's split less the split of its BOM components. On 2026-11-19 the only BOM was a sandbox copy. Since 2026-11-20 a production BOM is in Snowflake, and the workaround gives good results. See "Update 2026-11-20: production BOM".

Confidence: high for what is in Snowflake. Medium for the meaning of the "lower level" indicator, because no SAP documentation was found. Medium for the workaround. It agrees with the data, but no person has compared it with ZFI28N.

## Update 2026-11-20: production BOM

A production BOM is now in Snowflake.

| Layer | Object | Notes |
| --- | --- | --- |
| Raw | `PROD_RAW.SAP.BILLOFMATERIALS_01` to `_11` | Talend (user `TALEND_SECURE`) created and loaded them on 2026-11-20. Unknown: the load schedule. |
| Silver | `PROD_STAGING.SAP.BILLOFMATERIALS` | Dynamic table, union of the 11 raw tables, target lag 1 day. |
| Raw | `PROD_RAW.SAP.BOM` | Empty. Do not use. |

The table comment says the source is SAP BW/4HANA `C_BOMITEMVALIDMATERIALSEXPLOSION` (96 plants).

Grain: one row for each top material, BOM usage, alternative and exploded component line. `MATERIAL` is the top material. `HIERARCHY_LEVEL` is the level below it. `PARENT_MATERIAL` is the direct parent (blank at level 1). `BILLOFMATERIALITEMQUANTITY` is for `BILLOFMATERIALQUANTITY` of the parent.

Facts:

- 31 plants have rows, not 96. 2550 Wholesale has no rows. 2517 Westerleigh has 110 rows, with no BOM valid from after 2022.
- `BOMVALIDITYENDDATE` is 99991231 on all rows. So each row is a BOM that is valid now. Old versions are not in the table.
- All rows have BOM status 01.
- `BOMCOMPONENTSCRAPINPERCENT` is not in the dynamic table.
- A material can have more than one BOM usage valid on the same date, with different components. Example: PF69 70003235 has usage 1 (component 100171937) and usage 3 (component 100171622). The 2026-11-19 example agrees with usage 1.
- At Redruth and 2527 the stage inputs have material type FERT. At other plants they have type HALB.

Unknown: which BOM usage SAP costing uses at each plant. In SAP, usage 1 is production and usage 3 is universal. This is general SAP knowledge, not checked.

### The workaround test, again

Same test as in Question 1, with the new BOM. Estimates and BOMs valid on 2026-11-05. Level-1 components only, parent and component in KG. Meat = components 001 + 002.

| Plant | BOM usage | Parents | Parent meat = component meat (1%) | Parents with a component that has labour | Component labour kept in parent labour | Derived top-level total below zero |
| --- | --- | --- | --- | --- | --- | --- |
| 2504 Redruth | 1 | 1,690 | 1,681 | 1,433 | 1,432 | 2 |
| 2506 Bromborough | 1 | 528 | 392 | 146 | Not tested | Not tested |
| 2527 | 1 | 1,240 | 1,172 | 776 | 771 | 10 |
| FR90 Dungannon Fresh | 3 | 2,692 | 2,533 | 1,384 | 1,384 | 16 |
| PF50 | 3 | 1,256 | 1,104 | 814 | 794 | 31 |
| PF61 Windmill Lane | 3 | 608 | 195 | 52 | Not tested | Not tested |
| PF69 Shillelagh | 3 | 2,144 | 1,392 | 1,566 | 1,558 | 14 |

The labour and below-zero columns use HALB and FERT components only.

Results:

1. The 2026-11-19 gap at Redruth is closed. The sandbox BOM showed no Redruth component with labour. The new BOM shows 1,433.
2. The component labour stays in the parent labour column. It does not move into meat. This agrees with the 2026-11-19 finding.
3. The derived top level is below zero for less than 3% of parents at each plant tested.
4. At PF61 and PF69 many parents do not agree on meat. Unknown: why. A possible cause is the wrong BOM usage, or components in other units than KG.

Median labour for each kg, derived top level against component: Redruth 0.0328 against 0.1136, PF69 (usage 3) 0.0445 against 0.0844. So at Redruth most labour in the finished good comes from the earlier stages.

## Question 1: is ZFI28N, or the data behind it, in Snowflake?

### What was searched

| Search | Result |
| --- | --- |
| `cortex search object` for "ZFI28" | No objects found. |
| Table names like `%KEPH%`, `%KEKO%`, `%CKIS%`, `%CKHS%`, `%CKML%`, `%ZFI28%`, `%COSTEST%`, `%COSTCOMP%`, `%STDCOST%`, `%STANDARD_COST%`, `%COPC%`, `%ITEMIZATION%`, `%MATERIALLEDGER%` (`SNOWFLAKE.ACCOUNT_USAGE.TABLES`) | No SAP table with these names. One sandbox table `KEKO_V1` (see below). |
| Column names like `%KLVAR%`, `%KALNR%`, `%KKZST%`, `%KSTRUKTUR%`, `%ELEMT%`, `%TVERS%`, `%LOWERLEVEL%`, `%TOPLEVEL%`, `%COSTINGLEVEL%`, `%COSTESTIMATE%`, `%COSTINGVARIANT%`, `%COSTCOMPONENTSTRUCTURE%` (`SNOWFLAKE.ACCOUNT_USAGE.COLUMNS`) | Only the product cost tables below, the COPA tables, and `C_INVENTORY_VALUATION_UK` (DEV only). No SAP raw field names. |
| `cortex search object` for "cost estimate", "cost component split", "standard cost", "KEPH", "KEKO", "CKIS", "costing variant", "material ledger" | Same objects as below. No other source. |

No itemization (CKIS), cost estimate header (KEKO) or material ledger (CKMLKEPH, CKMLPRKEPH) data is in a PROD or DEV schema.

### What is in Snowflake

| Layer | Object | Rows |
| --- | --- | --- |
| Raw | `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"` | 1,852,372 |
| Raw, history | `PROD_RAW.SAP."jbs_bw4_hana_edw_fmco_comisc_C_PRODUCTCOSTRELEASEDCE_HISTORY"` (periods 2025001 to 2026011) | 3,304,908 |
| Silver | `PROD_STAGING.FINANCE.PRODUCT_COST_RELEASED_CE_SAP_STG` | 1,852,372 |
| Gold | `PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED` (split type H only) | 1,007,815 |
| Sandbox | `SNOWFLAKE_LEARNING_DB.CHRISMC_WORKING_WITH_SEMI_STRUCTURED_DATA.KEKO_V1` | 77,423 |

The silver table comment says its source is "SAP CDS C_PRODUCTCOSTRELEASEDCE".

Raw grain: one row for each cost estimate, cost component and fiscal period. Columns `COST001` to `COST016` hold the value for the lot size (`LOTSIZEFORPRODUCTCOSTING`). Only the column of the row's `COSTCOMPONENT` has a value.

Cost component names, from the gold column names:

| Component | Gold column | Possible weekly P&L cost component (not confirmed) |
| --- | --- | --- |
| 001 | `MEAT` | Meat |
| 002 | `BY_PRODUCTS` | Meat. The comment of `V_ANAPLAN_RELASED_COST_ESTIMATES` says its MEAT includes by-products. |
| 003 | `INGREDIENTS` | Ingredients |
| 004 | `PACKAGING` | Packaging |
| 005 | `LABOR_DIRECT` | Labour |
| 006 | `PLANT_OVERHEAD` | Other |
| 007 | `OTHER_PRIMARY_COSTS` | Other |
| 009 | `LABOUR_INDIRECT` | Unknown |
| 013 | `OTHER_SECONDARY_COST` | Other |

Unknown: the SAP text of each component in structure P1. No cost component text table is in Snowflake.

The sandbox `KEKO_V1` has 6 columns only: `MATERIAL`, `PLNT`, `COSTING_DATE`, `ALTBOM`, `BOM`, `TRANSFER_CONTROL`. It has 4 costing dates (2026-03-02 to 2026-06-01). It has no cost values. It is a one-off load.

### Is it top level or bottom level?

The raw table has the SAP level field `INDICATORLOWERLEVEL`. It is blank on every row, in all plants, in the current and history tables. No row has value `X`. Split type (`TYPEOFCOSTCOMPONENTSPLIT`) is `H` (main split) on all rows except 10 rows at PF55 (`N`).

In SAP, field KKZST ("Indicator: Lower Level/Level") separates the lower-level values from the total. This meaning is general SAP knowledge. No SAP help page was found to cite. A person must confirm.

The data shows that the split is cumulative. It includes all BOM levels:

1. COPA standard cost per kg agrees with the cost estimate to 4 decimal places. Redruth, week 2026-11-02, 15 largest materials, all components. Source: `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG` against the raw table. Gui says COPA standard cost is bottom level.
2. The parent split contains the BOM component split. Source: the raw table, joined to the sandbox BOM `BOM_V1` (application PC01), estimates valid on 2026-11-05.

| Plant | Parents tested | Parent meat = sum of component meat | Parents with a component that has labour | Component labour kept in parent labour |
| --- | --- | --- | --- | --- |
| 2504 Redruth | 1,490 | 1,443 | 0 | - |
| 2506 Bromborough | 85 | 82 | 0 | - |
| 2550 Wholesale | 664 | 530 | 339 | 335 |
| PF61 Windmill Lane | 504 | 403 | 0 | - |
| PF69 Shillelagh | 2,052 | 829 | 5 | 4 |

Example, PF69, parent 70003235 "MATTESSONS CORNED BEEF 90GX12". Component 100171937, 1.0787 kg for each unit. Values are GBP for each base unit, valid on 2026-11-05.

| | Meat | Ingredients | Packaging | Labour | Total |
| --- | --- | --- | --- | --- | --- |
| Parent (Snowflake split) | 12.1010 | 0.0538 | 1.6211 | 3.6045 | 17.3803 |
| Component x 1.0787 | 12.1004 | 0.0537 | 0.0000 | 0.2772 | 12.5056 |
| Difference (top level, derived) | 0.0006 | 0.0001 | 1.6211 | 3.3273 | 4.8747 |

In this example, the component labour stays in the parent labour column. It does not move into meat. This is different from the description in #74. Unknown: if ZFI28N bottom level shows the same. A person must compare one ZFI28N output with the table.

At Redruth, 1,282 of 1,372 semi-finished materials (prefix 38) have labour in their own estimate. But no Redruth BOM component in `BOM_V1` has labour. So the sandbox BOM does not show how Redruth semi-finished goods feed finished goods. Unknown: why. The new production BOM shows it (see "Update 2026-11-20").

COPA has no level field. At Redruth since 2026-01-01, `COSTING_VARIANT`, `COST_COMPONENT_STRUCTURE`, `COSTING_VERSION` and `COSTING_STATUS` are blank on all 370,839 rows of `C_PROFITABILITYANAL_COSTING_PEU_SAP_STG`. `CC_COSTIND01` to `CC_COSTIND04` are zero.

## Question 2: can the SAP BW team load it?

Unknown. Aswani Nune must answer.

What the data shows about the load:

- Source pattern: SAP BW/4HANA, `jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE`. Other SAP data uses the same pattern, for example `jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL` and `jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS`.
- Load: Talend (user `TALEND_SECURE`) runs `TRUNCATE TABLE` and then `COPY INTO` once each day. Source: `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`, 2026-11-13 to 2026-11-19.
- The source already has the field `INDICATORLOWERLEVEL`. All values are blank. So the BW source, or its filter, gives the total only.

Two possible changes, for the BW team to choose:

- A: Remove the filter, so that the extract also gives the lower-level rows (`INDICATORLOWERLEVEL = 'X'`). Top level = total less lower level. The weekly P&L can do this in SQL.
- B: Load the cost estimate itemization (CKIS). Top level = the items that are not materials with their own estimate. This is a new extract.

Both are Unknown until the BW team confirms what the source can give.

## Question 3: how often does the costing change?

Once a fiscal period, at most. Source: raw table, costing status FR, validity start from 2025-12-29.

| Plant | Costing variant | Estimates | Validity start on a fiscal period start | Most estimates for a material in one period | Distinct validity start dates |
| --- | --- | --- | --- | --- | --- |
| 2504 Redruth | Z125 | 41,741 | 99.0% | 1 | 59 |
| 2506 Bromborough | Z125 | 33,646 | 99.7% | 1 | 51 |
| 2517 Westerleigh | Z125 | 30,612 | 99.1% | 1 | 85 |
| FR90 Dungannon Fresh | PPC1 | 27,096 | 84.7% | 1 | 84 |
| PF61 Windmill Lane | PPC1 | 26,114 | 99.7% | 1 | 23 |
| PF68 Carrickmacross | PPC1 | 17,189 | 98.4% | 1 | 35 |
| PF69 Shillelagh | PPC1 | 49,026 | 100.0% | 1 | 12 |

Validity end is the last day of the fiscal period. For example, period 2026011 runs from 2026-10-26 to 2026-11-29. Unknown: why 1% to 15% of estimates start inside a period.

The value does not change in every period. Share of materials where the cost changed from the period before, 2026:

| Plant | Period pairs | Total cost changed | Labour changed |
| --- | --- | --- | --- |
| 2504 Redruth | 37,680 | 38.1% | 4.3% |
| 2506 Bromborough | 30,431 | 26.6% | 1.5% |
| 2517 Westerleigh | 27,750 | 67.6% | 9.6% |
| FR90 Dungannon Fresh | 19,513 | 47.3% | 9.6% |
| PF61 Windmill Lane | 23,082 | 17.6% | 2.6% |
| PF68 Carrickmacross | 14,709 | 38.5% | 2.3% |
| PF69 Shillelagh | 43,956 | 33.3% | 7.1% |

The #74 example uses costing date 2026-06-01 for week 23. That date is also the start of fiscal period 2026006. So a weekly ZFI28N run inside one period gives the same released estimate. This is an inference from the data. Site finance must confirm.

Unknown: if SAP releases a second estimate in a period and Snowflake keeps only the last one. The table is a full reload each day, so older versions in a period are not kept.

## Question 4: do all sites use the same costing variant and cost structure?

Cost component structure: P1 at all 35 plants. Costing variant: Z125 (and ZPKG) at company code 125. PPC1 at all other company codes. Source: raw table, all rows, fiscal periods 2026001 to 2026012.

| Company code | Plants | Costing variant | Valuation variant | Cost component structure | Components with values |
| --- | --- | --- | --- | --- | --- |
| 125 Pilgrim's Pride LTD | 2500, 2501, 2503, 2504, 2505, 2506, 2517, 2525, 2526, 2527, 2528, 2545, 2550 | Z125 | Z25 | P1 | 001, 003, 004, 005, 006, 007, 009 (by plant) |
| 125 Pilgrim's Pride LTD | 2500 to 2528, 2545, 2546, 2547, 2550 | ZPKG | Z01 | P1 | 003, 004 (2528 also 001, 005, 007) |
| 125 Pilgrim's Pride LTD | 2500, 2503 | PPC1 | 001 | P1 | 16 rows only |
| 156 Pilgrims Food Masters UK | PF58, PF61, PF63, PF65, PF70 | PPC1 | 001 | P1 | 001, 003, 004, 005, 006, 013 |
| 168 Pilgrims Food Masters ROI | PF68, PF69 | PPC1 | 001 | P1 | 001, 003, 004, 005, 007 |
| 84 Moy Park Ltd. | BP62, FR90, FR91, FR92, FR93, PF50, PF51 | PPC1 | 001 | P1 | 001, 003, 004, 005, 006, 007 |
| 91 Moy Park France SAS | PF52, PF53 | PPC1 | 001 | P1 | 001, 003, 004, 005, 006, 007 |
| 95 Moy Park Beef Orleans | PF55 | PPC1 | 001 | P1 | 003, 004 |
| 98 Kitchen Range Foods Ltd. | PF56, PF57 | PPC1 | 001 | P1 | 001, 003, 004, 005, 006 |
| 100 Albert van Zoonen BV | PF54 | PPC1 | 001 | P1 | 001, 003, 004, 005, 006 |

All rows have costing version 01. Plant names from `FACT_PRODUCT_COST_RELEASED`.

Unknown: if ZFI28N must use Z125 at the UK plants and PPC1 at the PFM plants. The #74 example (Redruth, Z125, P1) agrees with the data.

## Question for Aswani Nune

Aswani Nune, SAP BW Developer, Information Technology.

1. The BW source `jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE` has the field `INDICATORLOWERLEVEL`. All values in Snowflake are blank. Can the extract also give the lower-level rows (value `X`)?
2. If not, can BW extract the cost estimate itemization (CKIS), or the "top level" view that ZFI28N shows?
3. What does ZFI28N read in SAP? Is it a BW query or an ABAP report on KEKO, KEPH and CKIS?
4. Does the extract keep only the last released estimate in each fiscal period?
5. Can the BOM (`BOM_V1`, today a one-off sandbox load) move to `PROD_RAW.SAP` with a daily load? Answered 2026-11-20: yes, see "Update 2026-11-20".
6. The BOM source `C_BOMITEMVALIDMATERIALSEXPLOSION` gives 31 plants, not 96. 2550 Wholesale has no rows. Is this correct?
7. Which BOM usage does product costing use at each plant?

Answers: Unknown.

## Open questions

1. Does ZFI28N bottom level for one Redruth material agree with `C_PRODUCTCOSTRELEASEDCE` for the same period? Site finance can run one and compare.
2. In ZFI28N top level, where does the cost of the semi-finished input show: in meat, or in a separate line?
3. Do production variances need the top-level split for finished goods only, or also for semi-finished goods?
4. What is cost component 009 (`LABOUR_INDIRECT`) at Bodmin (2505)? Is it part of labour?
5. Is the derived top level (material less BOM components) good enough for v1? A production BOM is now loaded. Gui must decide.
6. Why do many PF61 and PF69 parents not agree with their components on meat?

## Sources

All checks are read-only queries in Snowflake account JBSUSA-PILGRIMS_EUROPE_PROD on 2026-11-19.

1. `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"`: grain, level indicator, costing variants, structures, validity dates, change frequency.
2. `PROD_RAW.SAP."jbs_bw4_hana_edw_fmco_comisc_C_PRODUCTCOSTRELEASEDCE_HISTORY"`: level indicator values.
3. `PROD_STAGING.FINANCE.PRODUCT_COST_RELEASED_CE_SAP_STG`: table comment (source CDS name).
4. `PROD_ANALYTICS.FINANCE_MT.FACT_PRODUCT_COST_RELEASED`: cost component column names, plant and company names, level indicator values.
5. `PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG`: COPA standard cost per kg, costing fields.
6. `SNOWFLAKE_LEARNING_DB.CHRISMC_WORKING_WITH_SEMI_STRUCTURED_DATA.BOM_V1` and `KEKO_V1`: sandbox BOM and cost estimate header.
7. `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `SNOWFLAKE.ACCOUNT_USAGE.COLUMNS`: name searches above.
8. `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`, last 7 days: load method.
9. `cortex search object`: searches above.
10. Repo files: `research/stock-bom.md`, `research/fgoods-oci.md`, `GLOSSARY.md`.
11. `PROD_STAGING.SAP.BILLOFMATERIALS` (2026-11-20): grain, plants, usages, validity dates, workaround test.

Workaround test with the production BOM (2026-11-20):

```sql
WITH ce AS (
  SELECT PLANT, LTRIM(PRODUCT, '0') P,
         SUM(COALESCE(COST001, 0) + COALESCE(COST002, 0)) / MAX(LOTSIZEFORPRODUCTCOSTING) MEAT,
         SUM(COALESCE(COST005, 0)) / MAX(LOTSIZEFORPRODUCTCOSTING) LAB,
         SUM(C_TOTALCOST) / MAX(LOTSIZEFORPRODUCTCOSTING) TOT
  FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"
  WHERE COSTINGSTATUS = 'FR' AND COSTINGVARIANT IN ('Z125', 'PPC1')
    AND '20261105' BETWEEN COSTESTIMATEVALIDITYSTARTDATE AND COSTESTIMATEVALIDITYENDDATE
  GROUP BY 1, 2),
b AS (
  SELECT PLANT, BILLOFMATERIALVARIANTUSAGE U, LTRIM(MATERIAL, '0') PAR, LTRIM(BILLOFMATERIALCOMPONENT, '0') COMP,
         SUM(BILLOFMATERIALITEMQUANTITY / NULLIF(BILLOFMATERIALQUANTITY, 0)) Q
  FROM PROD_STAGING.SAP.BILLOFMATERIALS
  WHERE HIERARCHY_LEVEL = 1 AND BOMVALIDITYSTARTDATE <= '20261105' AND BOMVALIDITYENDDATE >= '20261105'
    AND BILLOFMATERIALITEMUNIT = 'KG' AND BILLOFMATERIALUNIT = 'KG'
    AND BILLOFMATERIALCOMPONENTTYPE IN ('HALB', 'FERT')
  GROUP BY ALL),
s AS (
  SELECT b.PLANT, b.U, b.PAR, SUM(b.Q * c.LAB) CLAB, SUM(b.Q * c.TOT) CTOT
  FROM b JOIN ce c ON c.PLANT = b.PLANT AND c.P = b.COMP GROUP BY ALL)
SELECT s.PLANT, s.U, COUNT(*) PARENTS, COUNT_IF(s.CLAB > 0) COMP_LAB,
       COUNT_IF(s.CLAB > 0 AND p.LAB >= s.CLAB - 0.0001) LAB_KEPT,
       COUNT_IF(p.TOT - s.CTOT < -0.0001) TOP_TOT_NEG
FROM s JOIN ce p ON p.PLANT = s.PLANT AND p.P = s.PAR
GROUP BY ALL ORDER BY 1, 2;
```

Level indicator by plant:

```sql
SELECT COMPANYCODE, PLANT, COSTINGVARIANT, COSTCOMPONENTSTRUCTURE,
       INDICATORLOWERLEVEL, TYPEOFCOSTCOMPONENTSPLIT, VALUATIONVARIANT,
       COUNT(*) N, COUNT(DISTINCT PRODUCT) P,
       LISTAGG(DISTINCT COSTCOMPONENT, ',') WITHIN GROUP (ORDER BY COSTCOMPONENT) COMPS
FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"
GROUP BY ALL ORDER BY 1, 2, 3;
```

COPA against the cost estimate (Redruth, week 2026-11-02):

```sql
WITH c AS (
  SELECT MATERIAL, SUM(QUANTITY_IN_KG) KG, SUM(COST_COMPONENT_MEAT) MEAT, SUM(COST_COMPONENT_LABOR) LAB, SUM(TOTAL_COST) TOT
  FROM PROD_STAGING.FINANCE.C_PROFITABILITYANAL_COSTING_PEU_SAP_STG
  WHERE PLANT = '2504' AND COMPANY_CODE = '125' AND BILLING_TYPE IS NOT NULL
    AND POSTING_DATE BETWEEN '2026-11-02' AND '2026-11-08'
  GROUP BY 1 HAVING SUM(QUANTITY_IN_KG) > 1000),
e AS (
  SELECT PRODUCT, SUM(COST001)/MAX(LOTSIZEFORPRODUCTCOSTING) MEAT,
         SUM(COST005)/MAX(LOTSIZEFORPRODUCTCOSTING) LAB,
         SUM(C_TOTALCOST)/MAX(LOTSIZEFORPRODUCTCOSTING) TOT
  FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"
  WHERE PLANT = '2504' AND COSTINGVARIANT = 'Z125' AND COSTINGSTATUS = 'FR'
    AND '20261105' BETWEEN COSTESTIMATEVALIDITYSTARTDATE AND COSTESTIMATEVALIDITYENDDATE
  GROUP BY 1)
SELECT c.MATERIAL, c.MEAT/c.KG COPA_MEAT, e.MEAT CE_MEAT, c.LAB/c.KG COPA_LAB, e.LAB CE_LAB, c.TOT/c.KG COPA_TOT, e.TOT CE_TOT
FROM c JOIN e ON LTRIM(e.PRODUCT, '0') = LTRIM(c.MATERIAL, '0')
ORDER BY c.KG DESC LIMIT 15;
```

Estimates in each fiscal period:

```sql
WITH h AS (
  SELECT DISTINCT PLANT, PRODUCT, FISCALYEARPERIOD FP, COSTESTIMATEVALIDITYSTARTDATE VF
  FROM PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.comisc/C_PRODUCTCOSTRELEASEDCE"
  WHERE COSTINGSTATUS = 'FR' AND COSTESTIMATEVALIDITYSTARTDATE >= '20251229')
SELECT PLANT, MAX(N) MAX_VF_IN_A_PERIOD
FROM (SELECT PLANT, PRODUCT, FP, COUNT(DISTINCT VF) N FROM h GROUP BY ALL)
GROUP BY 1 ORDER BY 1;
```
