# Is HCS lamb kill data in Snowflake?

Ticket: #33. The weekly P&L line "Kill Lamb" has the source HCS, and nobody has checked it. This note says which lamb kill data is in Snowflake now. Research date: 2026-11-17.

## Short answer

Yes. HCS lamb kill data for Wales (Llanidloes) is in `PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS`. It has one row for each carcass, from 2024-01-02 to 2026-11-16. A task loads it every day. Kill in head is the count of rows. The feed has no condemned field and no dead on arrival field. The HCS export file has a condemned kg field, but the load does not keep it. Andover is also in HCS, but its files are cutting and packing output, not kill.

A second source is the Hellenic sheep database (`PROD_RAW.HELLENIC.SHP_*`). It is a static copy from 2026-09-07. Its last kill date is 2026-05-29. It has only about 15% of the HCS carcasses. Do not use it for kill.

## HCS Wales kill feed

| Item | Value |
| --- | --- |
| Table | `PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS`, 9,687,278 rows. Comment: "material level production data from HCS system - Andover and Wales". |
| Kill rows | `FILENAME` = 'LambKillByDate_HCS_Wales', `SITE` = 'Wales', `MATERIALNAME` = 'Carcass' on all rows |
| Site | Wales. The Hellenic sheep site list has `RPF` = "Pilgrims UK Lamb", Oakley Park, Llanidloes. That "Wales" is Llanidloes is probable, not confirmed. |
| Grain | One row for each carcass |
| Kill date field | `PRODDATE` (from "kill date" in the HCS file) |
| Kill field (head) | `COUNT(*)` of rows, after the duplicate rule below |
| Weight field | `ACTUALWEIGHT` (from "scale kg" in the HCS file). Scale kg = cold kg − condemned kg. |
| Material code | `MATERIALCODE` (from "PLU"). 85 codes. The meaning of each PLU is Unknown. |
| Date range | 2024-01-02 to 2026-11-16 |
| Load | Task `PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS_TASK` calls `PRODUCTION_HCS_SP()`. It ran 14 times in 7 days, at about 05:00 and 06:00 UTC. |
| Source file | `@PILGRIMS_EU_DB.PRODUCTION.AZ_HCS/production/LambKill`, which is `azure://innovaesg.blob.core.windows.net/hcsdata/production/LambKillByDate_HCS_Wales.csv` |
| Created by | Table and procedure: `RITA.FERREIRA@PILGRIMSEUROPE.COM` (`LAST_DDL_BY`). Table owner role: `ACCOUNTADMIN`. Business owner: Unknown. |

### Kill by year (after the duplicate rule)

| Year | Carcasses | Kill days | Carcasses per day | Kg |
| --- | --- | --- | --- | --- |
| 2024 | 714,750 | 221 | 3,234 | 13,814,501 |
| 2025 | 802,009 | 252 | 3,183 | 15,940,173 |
| 2026 (to 16 Nov) | 527,634 | 196 | 2,692 | 10,799,110 |

Recent weeks (Monday start): 2 Nov 2026 has 11,636 carcasses on 5 days. 9 Nov 2026 has 11,427 carcasses on 5 days.

### Duplicate rule

97 kill dates were loaded two times, with the same rows. For example, 2026-11-12 has 2,621 rows at 05:50 and 2,621 rows at 06:50. To count kill, keep only the last `LOADEDDATE_TIMESTAMP` for each `PRODDATE`. Without this rule, 2026 shows 769,040 rows, not 527,634.

```sql
WITH d AS (
  SELECT *
  FROM PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS
  WHERE FILENAME = 'LambKillByDate_HCS_Wales'
  QUALIFY LOADEDDATE_TIMESTAMP = MAX(LOADEDDATE_TIMESTAMP) OVER (PARTITION BY PRODDATE)
)
SELECT DATE_TRUNC('week', PRODDATE)::DATE AS week_start,
       COUNT(*)                           AS carcasses,
       ROUND(SUM(ACTUALWEIGHT))           AS scale_kg,
       COUNT(DISTINCT PRODDATE)           AS kill_days
FROM d
GROUP BY 1
ORDER BY 1;
```

### Condemned and rejected fields

`PRODUCTION_HCS` has no condemned, dead on arrival or reject column. The HCS export file has more columns than the load keeps. The header of the file on 2026-11-17 is:

`kill date, batch, kill no., cold kg, cond kg, scale kg, euro grade, own selc, type, ORDER_NO, TRANSFER_ORDNUM, PLU, Description, Site, LoadedDate_TimeStamp, FileName`

The procedure loads columns 1, 6, 12, 13, 14, 15 and 16 only. It does not keep `batch`, `kill no.`, `cold kg`, `cond kg`, `euro grade`, `own selc` or `type`.

The file for kill date 2026-11-16 has 2,520 carcasses, 50 batches and `kill no.` 1 to 2,520. This is the same count as `PRODUCTION_HCS` for that date. In that file:

- 30 carcasses have `cond kg` > 0, with a total of 79.65 kg. Most are part condemnations of 0.5 kg to 2 kg.
- 3 carcasses have `cold kg` = `cond kg` or `cold kg` = 0. Their `scale kg` is 0 or negative (for example −21.20). These are probably whole carcasses condemned.
- All rows have `type` = 'L'.

So `ACTUALWEIGHT` <= 0 in `PRODUCTION_HCS` probably marks a whole condemned carcass. This is not confirmed. Counts after the duplicate rule:

| Year | Carcasses | `ACTUALWEIGHT` = 0 | `ACTUALWEIGHT` < 0 | Percent <= 0 |
| --- | --- | --- | --- | --- |
| 2024 | 714,750 | 1,569 | 66 | 0.229% |
| 2025 | 802,009 | 1,599 | 142 | 0.217% |
| 2026 | 527,634 | 656 | 114 | 0.146% |

By analogy with pork TC'd pigs, a lamb kill rule could take these off. That is a decision for a human (see Open questions).

The HCS file has no dead on arrival field.

### Gaps in the feed

The file holds one kill date only. Each export replaces the last one. If an export does not load, Snowflake has no other copy of that day.

Weekdays in 2026 with no rows:

| Month | Missing weekdays |
| --- | --- |
| January | 1 |
| February | 4 |
| April | 3, 6, 28, 29, 30 |
| May | 4, 25 |
| June | 1 to 19, 22 to 25 (19 weekdays) |
| August | 3, 31 |
| September | 22 |
| October | 22 |

Some of these are bank holidays (1 Jan, 3 Apr, 6 Apr, 4 May, 25 May, 31 Aug). The reason for the others is Unknown.

Some single days have about three days of carcasses:

- Monday 2026-04-27: 10,472 carcasses. Tuesday to Thursday have no rows.
- Monday 2026-09-21: 9,720 carcasses. Tuesday 22 has no rows.

The reason is Unknown. Weekly totals for these weeks may be correct, but daily totals are not.

## Hellenic sheep database (do not use for kill)

| Item | Value |
| --- | --- |
| Tables | `PROD_RAW.HELLENIC."SHP_LOT"` (38,799 rows), `"SHP_TRANSACTIONS"` (1,793,124 rows, one row for each carcass), `"SHP_REMITTANCE"`, `"SHP_CONDEMNED PARTS"`, `"SHP_PARTICIPANTS"` |
| Copy | Created 2026-08-12 by `TALEND_SECURE`. Last changed 2026-09-07. There are no `STG_SHP_*__live` views, so it does not update. |
| Sites | `RPF` "Pilgrims UK Lamb" (Llanidloes), `Jasper` "Dunbia UK (Jaspers)" to 2024-05-31, `Trial` to 2020-05-11 |
| RPF date range | 2016-11-01 to 2026-05-29 (`"Kill Date"`) |
| RPF head | 122,999 in 2025. 23,004 in 2026. |
| Condemned | `"SHP_REMITTANCE"."Total Condemned"`: 103 in 2025 at RPF. `"Remark Code"` is 0 on all transactions. DOA, DIP and casualty are 0 on all lots. |

For the same weeks, HCS has about 12,000 carcasses and Hellenic RPF has 550 to 2,600. For example, the week of 2026-05-18 has 13,788 in HCS and 2,208 in Hellenic. So Hellenic RPF holds a part of the Llanidloes kill only. Which part (for example, one supply scheme) is Unknown.

The live Hellenic pig feed (`"STG_PIG_LOT__live"`) has 3 sheep lots only, the last on 2018-04-10.

## Other HCS and lamb data in Snowflake

| Object | What it holds | Kill? |
| --- | --- | --- |
| `PRODUCTION_HCS`, `FILENAME` 'OCMTotalsByStation_HCS_Wales' | Wales offal and co-product weight by product, 22,926 rows, to 2026-11-16 | No |
| `PRODUCTION_HCS`, `FILENAME` 'Offals_HCS_Wales' | Wales boning and offal weight by product, 52,186 rows, to 2026-11-13 | No |
| `PRODUCTION_HCS`, `SITE` 'Andover' | 'Output_HCS_Andover' and 'PrimalCut_HCS_Andover': pack and primal output, to 2026-11-16 | No |
| `PROD_RAW.HCS.PRIMALCOSTINGBYDATE_HCS_ANDOVER_RAW` (also `PROD_STAGING.OPERATIONS..._STG`) | Andover primal costing by department (Intake, Production), qty, weight, value. Daily task `PROD_RAW.HCS.REFRESH_HCS_ANDOVER_TASK`. | No. "Intake" at Andover may be carcasses in. Not checked. |
| `PROJECT_CLARITY_PUK_REPORTING_DB.PUBLIC.LAMB_YIELD_*` | HCS Andover yield, primal and retail costings, drip loss | No |
| `PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_YIELD_DY` | Merge of Innova, Arolink and HCS. Last changed 2026-07-09. | Not checked |
| `PROD_RAW.AGROSOFT.LND_AGROSOFT_LAMB` / `STG_AGROSOFT_LAMB` | Lamb kill columns (kill date, kill no., condemned weight, condemned code), but 1 empty row only | No data |
| `DEV_RAW.LAMB_SAGE*`, `DEV_ANALYTICS.FINANCE_MT.FACT_LAMBSAGE` | Lamb sales from Sage, company code 129 | No |

### SAP fallback

There is no SAP fallback. `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"` has no rows for company code 129. The `FACT_LAMBSAGE` comment says lamb sales are in Sage, company code 129, with no cost of sales. COPA was not checked for lamb, because lamb sales are not in SAP.

## Open questions

1. Is "Wales" in HCS the Llanidloes site? Ask the Llanidloes site finance. Owner: Unknown.
2. What is lamb kill for the weekly P&L? All carcasses, or carcasses less whole condemned? Ask Gui or Chris McCann.
3. Does `scale kg` <= 0 mean a whole condemned carcass? Ask an HCS user at Llanidloes. Owner: Unknown.
4. Who owns the HCS export to Azure `hcsdata`, and the task in `PILGRIMS_EU_DB.PRODUCTION`? `RITA.FERREIRA@PILGRIMSEUROPE.COM` created the table and procedure. The business owner is Unknown.
5. Can the load keep `batch`, `kill no.`, `cold kg`, `cond kg` and `euro grade`? This needs a change to `PRODUCTION_HCS_SP`.
6. Why is there no data from 2026-06-01 to 2026-06-25? Can the missing days be loaded again from HCS?
7. Why do 2026-04-27 and 2026-09-21 hold about three days of kill?
8. Which part of the Llanidloes kill is in Hellenic `RPF`, and why does it stop on 2026-05-29?
9. The glossary has no term for HCS or for lamb kill. It says Hellenic is "the pig processing system", but Hellenic also held a sheep database.

## Sources

All checks were read-only SQL on account JBSUSA-PILGRIMS_EUROPE_PROD, on 2026-11-17, with role `ENGINEER_ROLE`.

- `SNOWFLAKE.ACCOUNT_USAGE.TABLES` and `.COLUMNS`: search of table and schema names for SHEEP, LAMB, SHP, HCS, OVINE, ABATTOIR and SLAUGHTER
- `snowflake_object_search` for "lamb sheep kill Llanidloes"
- `PROD_RAW.INFORMATION_SCHEMA.TABLES` and `.COLUMNS`, schema `HELLENIC`
- `PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS`: counts by `SITE`, `FILENAME`, `MATERIALCODE`, `PRODDATE` and `LOADEDDATE_TIMESTAMP`
- `GET_DDL('PROCEDURE','PILGRIMS_EU_DB.PRODUCTION.PRODUCTION_HCS_SP()')`
- `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` (inserts into `PRODUCTION_HCS`) and `.TASK_HISTORY` (last 7 days)
- `LIST @PILGRIMS_EU_DB.PRODUCTION.AZ_HCS/production/LambKill`, and `SELECT` from the staged file with file formats `PILGRIMS_EU_DB.PUBLIC.FF_WHOLELINE` and `PILGRIMS_EU_DB.PRODUCTION.CSV_FORMAT_COMMA`
- `PROD_RAW.HELLENIC."SHP_PARTICIPANTS"`, `"SHP_LOT"`, `"SHP_TRANSACTIONS"`, `"SHP_REMITTANCE"`, `"SHP_CONDEMNED REMARKS"`, `"STG_PIG_LOT__live"`
- `PROD_RAW.HCS.PRIMALCOSTINGBYDATE_HCS_ANDOVER_RAW`, `PROD_RAW.AGROSOFT.LND_AGROSOFT_LAMB`
- `PROD_RAW.SAP."jbs_bw4_hana.edw.scm.mmic/C_GOODSMOVEMENTDOCUMENTS"`, filter company code 129
- Meeting notes `docs/meetings/Initial Meeting - 121126.txt`: "the lamb come from HCS"
