# Which kill data is in Snowflake now, for each site and week?

Ticket: #2. The weekly P&L needs kill for each site and week. This note lists the kill data that is in Snowflake now, for pork and poultry. Research date: 2026-11-12.

## Short answer

Poultry kill data is in Snowflake. It comes from Mtech, not Innova. Mtech has loads for each plant from 2018 to 2026-11-08. It includes the three pilot sites: Anwick, Ashbourne and Dungannon. Each load has birds delivered (head count) and dead on arrival. Rejects are in the Mtech condemnation tables, by condemnation code.

Pork kill data is in Snowflake from Hellenic, for Spalding and Westerleigh. Each booking has pigs delivered, dead on arrival, dead in pen, casualty and killed quantity.

Arolink and Innova have no kill data in Snowflake. Their tables are yield and butchery data. The Innova tables are for Spalding and Westerleigh only, which are pork sites.

## Mtech (poultry)

| Item | Value |
| --- | --- |
| Raw tables | `PROD_RAW.MTECH.PMTSPROCRECVTRANS` (one row for each load), `PMTSPROCRECVTRANSHOUSEDETAIL` (load split by house), `PROTEINFACILITYPLANTS` (plants) |
| Reject tables | `PROD_RAW.MTECH.PMTSCONDEMNTRANS` (one row for each lot), `PMTSCONDEMNTRANSDETAILS` (head and weight for each code), `PMTSCONDEMNATIONS` (55 codes) |
| Modelled table | `PROD_ANALYTICS.OPERATIONS_MT.FACTS_BRIM_PROCESSING`: one row for each load and house, with `PLANT_NAME` and `KILL_LINE`. Data from 2023-06-01. |
| Sites (pilot) | Anwick (`S11`), Ashbourne (`S10`), Dungannon (`S01`) |
| Sites (other) | Ballymena (`S40`). Some third-party plants have old loads, for example Cullingworth to 2024-05-24. |
| Date range | Pilot sites: 2018-03-09 to 2026-11-08 (`XDATE`). Each week from 2026-08-31 to 2026-11-02 has data for all three pilot sites. |
| Delivered field | `FARMHDCOUNT` and `PLANTHDCOUNT` (head count). In `FACTS_BRIM_PROCESSING`: `FARM_HEAD_SPLIT`. |
| Dead on arrival field | `PMTSPROCRECVTRANS.DOA`. Also `PMTSCONDEMNTRANS.HDOA` (head) and `WDOA` (weight). In `FACTS_BRIM_PROCESSING`: `DOA_SPLIT`. |
| Reject field | `PMTSCONDEMNTRANSDETAILS.HEAD`, by condemnation code. `CATCHMORTALITY` is always 0. |
| Void loads | `VOIDFLAG`. 22 void loads at Dungannon and 7 at Ashbourne. |
| Last load | Raw tables changed on 2026-11-10. `FACTS_BRIM_PROCESSING` changed on 2026-11-12. |
| How checked | Row counts, `MIN`/`MAX` of `XDATE` and weekly totals for each plant, with a join to `PROTEINFACILITYPLANTS`. |

The condemnation codes have a `CALCULATIONCATEGORY` of 1 or 2. The table does not say what 1 and 2 mean. Some codes are part rejects, not whole-bird rejects. For example, "Croppings" had 284,211 head at Anwick in the week from 2026-10-26. That week, Anwick had about 2.16 million birds delivered. So the sum of all codes is not the number of rejects.

## Hellenic (pork)

| Item | Value |
| --- | --- |
| Tables | `PROD_RAW.HELLENIC."STG_PIG_BOOKING DETAIL__live"` (one row for each booking line), `"STG_PIG_ANIMAL__live"` (one row for each pig), `"STG_PIG_PARTICIPANTS__live"` (sites) |
| Staging table | `PROD_STAGING.OPERATIONS.CONDEMNATION_HELLENIC_SPALDING_STG` and `..._WESTERLEIGH_STG`: daily whole-pig and part condemnations, from 2025-01-02 to 2026-11-11 |
| Sites | Spalding (`Participant Code` 001), Westerleigh (003). Ashton (002) stops on 2023-07-05. Brechin (004) stops on 2022-10-24. |
| Date range | Spalding: 2010-11-02 to 2026-11-13. Westerleigh: 2011-02-22 to 2026-11-13 (`Est Kill Date`). |
| Delivered field | `"Delivered Qty"` (head) |
| Dead on arrival field | `"DOA"`. Also `"DIP"` (dead in pen) and `"Casualty"`. |
| Reject field | `STG_PIG_ANIMAL__live."TotalCond"` (whole pig condemned). Staging: `QUANTITY` where `FACTORY_ACTIVITY_DETAIL` = 'Whole Pig - condemnation TCs'. |
| Kill field | `"Killed Qty"` |
| How checked | Row counts and `MIN`/`MAX` dates for each `Participant Code`. Totals since 2025-01-01. |

Since 2025-01-01, Spalding has 2,333,923 pigs delivered and a `Killed Qty` of 2,333,613. Westerleigh has 1,809,392 pigs delivered and a `Killed Qty` of 1,804,400. The difference is not exactly DOA plus DIP plus casualty.

`PROD_RAW.HELLENIC` also has `PIG_*` and `SHP_*` tables, for example `PIG_ANIMAL`. These are copies from 2026-09-07 and do not update. Use the `STG_PIG_*__live` tables.

### Pork kill by provenance

Gui asked for the pork kill split by provenance on 2026-11-18: "RT, ODB, Free Range, GOS, Organic. etc". This section holds the answer. Research date: 2026-11-18.

The split works on the kill figure itself. `"Killed Qty"` on the booking splits by provenance directly, because the booking carries `"idSuperCategory"`. The TC'd pig deduction splits too, because the lot also carries `"idSuperCategory"`. So the split does not need the transaction-row query below. This answers open question 7.

| Item | Value |
| --- | --- |
| Provenance field | `"idSuperCategory"` on `"STG_PIG_BOOKING DETAIL__live"` and on `"STG_PIG_LOT__live"` |
| Names | `"Description"` on `"STG_PIG_SUPER CATEGORIES__live"` |
| View | `WPL_KILL_PORK_TYPE` in `sql/07_wpl_kill_pork.sql` |
| How checked | Summed the split and compared with `WPL_KILL_PORK` for both sites, weeks 45 and 46. The totals match exactly. |

Three fields are not provenance:

- `"Pig Scheme"` is a contract and price code, for example `5825 BQP`.
- `"Category"` is `G` on every booking.
- `"idPigType"` is a coarser field with 4 values.

Hellenic has no Red Tractor field. `"Farm Assured"`, `"Quality Assured"`, `"MandS Assured"` and `"VAN Assured"` are all unused: null or false on every booking. So Gui's label RT cannot be read from the data. It must be agreed.

The reference table holds 30 pig super categories. Only 7 are used, from 2025-12-29 to 2026-11-18.

| Provenance | Spalding | Westerleigh | Killed Qty |
| --- | --- | --- | --- |
| Standard | Yes | Yes | 715,734 |
| ODB/RA | Yes | Yes | 485,724 |
| ODB/RA C | Yes | Yes | 413,092 |
| Link | Yes | No | 228,768 |
| F/R Hamps | Yes | No | 184,112 |
| Organic | Yes | No | 9,098 |
| R/B GOS | Yes | No | 3,388 |

Every booking has a provenance. No booking is unset. The view groups by provenance and does not use a fixed list, so a new category shows on its own.

Emma confirmed on 2026-11-18 that RT means Red Tractor. This gives a proposed mapping to Gui's labels. It is reached by elimination, not from a field, so Gui must confirm it.

| Gui's label | Provenance in the data |
| --- | --- |
| RT | `Standard` |
| ODB | `ODB/RA` and `ODB/RA C` |
| Free Range | `F/R Hamps` |
| GOS | `R/B GOS` |
| Organic | `Organic` |
| etc | `Link` |

### Pig kill by pig type

This section is for the P&L line "No. Pigs / lambs / birds" (report category Planning, central owner Kim). Today, the site owners (Chris Kitchen, Ian Chapman) get this from the Hellenic "Ledger Balances and PPV" PDF report on Monday morning. They copy the numbers into the Excel workbook by hand. A query on Snowflake gives the same breakdown with no PDF step. Research date: 2026-11-16.

| Item | Value |
| --- | --- |
| Tables (DEV) | `DEV_RAW.HELLENIC.STG_PIG_TRANSACTIONS` (one row for each transaction), `STG_PIG_LOT` (one row for each lot), `"STG_PIG_SUPER CATEGORIES"` (pig type names) |
| Tables (PROD) | `PROD_RAW.HELLENIC."STG_PIG_TRANSACTIONS__live"`, `"STG_PIG_LOT__live"`, `"STG_PIG_SUPER CATEGORIES__live"` |
| Joins | Transactions to lot on `"idLOT"`. Lot to super categories on `"idSuperCategory"`. |
| Sites | `"Participant Code"` on the lot: 001 Spalding, 003 Westerleigh |
| Date field | `"Kill Date"` on the lot |
| Measures | Pigs killed = count of transaction rows. Actual gross = sum of `"Payment Value"`. Pay weight = sum of `"Pay Weight"`. Gross p/kg = 100 × gross ÷ pay weight. |
| Pig types | Grouped from the super category `"Description"`: ODB, R/B, F/R Hamps, Link, Organic, Standard |
| How checked | Ran the query in DEV for the kill week 14–20 Jun 2026. Compared the totals for each site with PROD. |

The source query is T-SQL on the Hellenic SQL Server database. The Snowflake version is below. For PROD, change the table names to the `__live` names.

```sql
SELECT
    CASE l."Participant Code" WHEN '001' THEN 'Spalding' WHEN '003' THEN 'Westerleigh' END AS site,
    CASE
        WHEN sc."Description" LIKE 'ODB%'      THEN 'ODB'
        WHEN sc."Description" LIKE 'R/B%'      THEN 'R/B'
        WHEN sc."Description" LIKE 'F/R%'      THEN 'F/R Hamps'
        WHEN sc."Description" LIKE 'Link%'     THEN 'Link'
        WHEN sc."Description" LIKE 'Organic%'  THEN 'Organic'
        WHEN sc."Description" LIKE 'Standard%' THEN 'Standard'
        ELSE TRIM(sc."Description")
    END                                                         AS pig_type,
    COUNT(*)                                                    AS pigs_killed,
    SUM(t."Payment Value")::NUMBER(18,2)                        AS actual_gross,
    SUM(t."Pay Weight")::NUMBER(18,1)                           AS pay_weight_kg,
    (100.0 * SUM(t."Payment Value") / NULLIF(SUM(t."Pay Weight"), 0))::NUMBER(10,2) AS gross_p_per_kg
FROM DEV_RAW.HELLENIC.STG_PIG_TRANSACTIONS t
JOIN DEV_RAW.HELLENIC.STG_PIG_LOT l                       ON l."idLOT" = t."idLOT"
LEFT JOIN DEV_RAW.HELLENIC."STG_PIG_SUPER CATEGORIES" sc  ON sc."idSuperCategory" = l."idSuperCategory"
WHERE t."Species" = 'PIGS' AND l."Species" = 'PIGS'
  AND l."Participant Code" IN ('001', '003')
  AND l."Kill Date" >= '2026-06-14' AND l."Kill Date" < '2026-06-21'
GROUP BY 1, 2
ORDER BY 1, pigs_killed DESC;
```

Result for the kill week 14–20 Jun 2026:

| Site | Pig type | Pigs killed | Actual gross (£) | Pay weight (kg) | Gross (p/kg) |
| --- | --- | --- | --- | --- | --- |
| Spalding | ODB | 10,038 | 1,879,084.53 | 865,497.8 | 217.11 |
| Spalding | Standard | 5,813 | 959,933.28 | 528,583.3 | 181.60 |
| Spalding | Link | 4,611 | 842,756.95 | 405,147.3 | 208.01 |
| Spalding | F/R Hamps | 3,944 | 700,008.73 | 329,605.4 | 212.38 |
| Spalding | Organic | 180 | 63,035.71 | 14,440.8 | 436.51 |
| Spalding | R/B | 60 | 13,348.67 | 4,955.6 | 269.37 |
| Westerleigh | Standard | 9,626 | 1,546,324.22 | 866,426.0 | 178.47 |
| Westerleigh | ODB | 9,502 | 1,663,193.84 | 846,110.1 | 196.57 |

Totals: Spalding 24,646 pigs, £4,458,167.87, 2,148,230.2 kg. Westerleigh 19,128 pigs, £3,209,518.06, 1,712,536.1 kg. DEV and PROD give the same totals for each site.

Gui decided on 2026-11-16 that pork kill is `"Killed Qty"` on the booking (see Decisions). This query counts transaction rows, so it is not the kill figure. Use it for pig type detail only.

## Arolink (pork)

| Item | Value |
| --- | --- |
| Tables | `PROD_RAW.AROLINK."11_DAY_DAILY_YIELD_CSV_AROLINK_RAW"`, `PROD_STAGING.OPERATIONS."11_DAY_DAILY_YIELD_CSV_AROLINK_STG"` |
| Sites | Bodmin, Bromborough, Corsham, Kings Lynn, Linton, Redruth, Ruskington |
| Date range | 2024-12-30 to 2026-11-11 |
| Delivered, dead on arrival, reject fields | None. The table has yield fields only: input and output kg and counts, waste, giveaway and deviation. |
| How checked | Column list. Search of department and material names for kill, carcase, DOA, condemn and reject. No match. |

## Innova

| Item | Value |
| --- | --- |
| Tables | 25 tables in `PROD_RAW.INNOVA`, for example `PRIMALCUT_INNOVA_SPALDING_RAW`, `TENDERLOIN_INNOVA_WESTERLEIGH_RAW`, `GIVEAWAY_INNOVA_SPALDING_RAW`. Copies in `PROD_STAGING.OPERATIONS` with suffix `_STG`. |
| Sites | Spalding and Westerleigh only |
| Date range | Not checked, because the tables have no kill fields |
| Delivered, dead on arrival, reject fields | None. The tables have butchery yield, giveaway and weight fields. |
| How checked | Column list of all 25 tables. Search for kill, head, DOA, dead, reject, condemn, bird, pig and count. No match. |

No Innova table in Snowflake is for a poultry site.

## Decisions (2026-11-16)

These decisions give the kill rules for the weekly P&L. Reports must let the reader expand each kill figure to the detail below.

| Item | Decision | Source |
| --- | --- | --- |
| Pork kill | `"Killed Qty"` on the booking | Gui confirmed |
| Pork kill and TC'd pigs | A TC'd pig is not in kill. Kill = pigs over scale − TC'd pigs. | Chris McCann |
| Pork condemnations | Two types. Show each one. `TC'd Producer Resp` = condemnation, 3rd party. `TC'd Factory Resp` = condemnation, 1st party. The "Pig Purchase Analysis" report has both, in kg and in head. | Chris McCann |
| Pork measure | Use quantity (head). Do not use weight for now. | Chris McCann |
| Poultry kill | Delivered − DOA. Changed 2026-11-17: condemnations are not taken off. The rule before was delivered − DOA − condemnations (all codes). | Chris McCann |
| Birds delivered field | `PLANTHDCOUNT` | Chris McCann |
| Poultry condemnation detail | Show all codes as detail. They do not change kill. | Chris McCann |
| Void loads | Exclude void loads (`VOIDFLAG`) from all figures | Chris McCann |
| Poultry source | Mtech only. There is no Innova poultry system. | Chris McCann |
| Site rules | Gui tells the sites that all sites use the Dungannon rule | Chris McCann |
| Poultry master process | Dungannon. Its definition is the correct one. | Chris McCann |
| Anwick late loads | Include them. The late Sunday 8 Nov figures (113,004 birds) are a manual entry issue. | Chris McCann and Gui |

Emma's review of week 45 (2–8 Nov), against Mtech view `DEV_ANALYTICS.FINANCE_PL_WEEKLY.MTECH_BIRDKILL`, shows the sites do not use one rule:

| Site | Site figure | What the site reports |
| --- | --- | --- |
| Anwick | 1,771,123 | Delivered. No DOA or rejects taken off. Sunday 8 Nov is left out. |
| Ashbourne | 833,935 | Delivered. No DOA or rejects taken off. |
| Ballymena | 149,023 | Delivered. No DOA or rejects taken off. |
| Dungannon | 2,127,036 | Delivered less DOA. Rejects not taken off. |

Anwick matches exactly when loads are dated by plant weigh-in time, not kill date. Sunday 1 Nov is also not in the Anwick figure. Another week of Anwick figures would show which date basis the site uses. The Mtech condemnation total is every code, including cropping. So the "all codes" rule takes off more birds than a rejects figure would.

## Gaps

- Mtech: the meaning of `CALCULATIONCATEGORY` 1 and 2 is not known. All codes are used, so this does not block the kill figure.
- Mtech: `FARMHDCOUNT` and `PLANTHDCOUNT` are different at Dungannon and Ballymena. Decided 2026-11-16: use `PLANTHDCOUNT`.
- Mtech: the raw tables last changed on 2026-11-10, with data to 2026-11-08. The load schedule is not known.
- Hellenic: `"Est Kill Date"` is the estimated kill date. A field for the actual kill date on the booking line is not known. `STG_PIG_ANIMAL__live` has `"Kill Date"` for each pig.
- Hellenic: the glossary defines kill for poultry only. It does not have the pork kill decision yet.
- Hellenic: `"Killed Qty"` is sometimes more than pigs delivered, for example Westerleigh on 2026-11-12 (3,941 against 3,918).
- Hellenic: `"Killed Qty"` is not final on the kill day. The 2026-11-13 data loaded on 2026-11-16 at 11:52. Only 1 of 19 Westerleigh bookings had a `"Killed Qty"` (lot 000111: 76, against 75 pigs over scale on the report). The other 18 bookings showed 0.
- Hellenic, Westerleigh 2026-11-13: the "Pig Purchase Analysis" report shows 3,344 pigs over scale. Snowflake has 3,345 transaction rows. The extra row is not found.
- Hellenic condemnation fields (found 2026-11-16, not confirmed):
  - Whole pig TC'd: `"STG_PIG_TRANSACTIONS__live"."Remark Code"` = 1 ("TC" in `"STG_PIG_CONDEMNED REMARKS__live"`). On 2026-11-13 at Westerleigh this gives 17 pigs. The report shows 17 TC'd producer resp. and 0 TC'd factory resp.
  - Part condemnations: `"STG_PIG_CONDEMNED PARTS__live"` has `"Producer Responsible"` and `"Factory Responsible"` for each `"idTransaction"`. On 2026-11-13 at Westerleigh, 4 parts had factory responsible.
  - The field that marks a TC'd pig as producer or factory responsible is probably `"STG_PIG_CONDEMNED PARTS__live"."Factory"`, joined on `"idTransaction"`. Rule: a TC'd pig with a parts row where `"Factory"` = TRUE is factory responsible (1st party). All other TC'd pigs are producer responsible (3rd party). Evidence:
    - Remark code 1 (TC) is the only whole-pig code. Its `"Factory Responsible"` in `"STG_PIG_CONDEMNED REMARKS__live"` is FALSE, so the remark code does not split the two types.
    - Westerleigh 2026-11-13: the 17 TC'd pigs match the report lot by lot. 16 have a parts row with `"Factory"` = FALSE. 1 has no parts row. All 17 have `"Payment Value"` 0. The report shows 17 producer resp. and 0 factory resp.
    - In 2026, most TC'd pigs with `"Factory"` = TRUE still have `"Payment Value"` > 0. This agrees with the factory paying for its own fault.
    - In 2026, 259 TC'd pigs have `"Payment Value"` > 0 but no factory parts row. Most are in March and June. The reason is not known.
  - To confirm the rule, compare with a "Pig Purchase Analysis" report for a day with factory TC'd pigs: Westerleigh 2026-09-16 (11 in Snowflake) or Spalding 2026-10-27 (4).
- Hellenic pig type query: the result is not yet compared with the "Ledger Balances and PPV" PDF report. The provenance split of kill does not use this query, so this does not block the split.
- Hellenic pig type query: Westerleigh had only Standard and ODB pigs in the kill week 14–20 Jun 2026. It is not known if this is normal.
- Ballymena is in Mtech. It is not a pilot site.
- `PROD_RAW.AGROSOFT` has slaughter tables. This note did not check them.

## Open questions

1. Which Mtech condemnation codes are rejects for the weekly P&L? Answered 2026-11-16: use all codes, and expand to all codes. Changed 2026-11-17: no codes are taken off kill. All codes are shown as detail.
2. For birds delivered, use `FARMHDCOUNT` or `PLANTHDCOUNT`? Answered 2026-11-16: `PLANTHDCOUNT`.
3. Is there a poultry Innova system that is not in Snowflake? Answered 2026-11-16: no. Mtech only.
4. What is kill for pork? Answered 2026-11-16 (Gui): `"Killed Qty"` on the booking. A TC'd pig is not in kill: kill = pigs over scale − TC'd pigs. Open: is `"Killed Qty"` the same as pigs over scale, or pigs over scale − TC'd? Check when `"Killed Qty"` is final for 2026-11-13.
5. How often does the Mtech feed load into Snowflake? Owner: Unknown.
6. Does the pig type query agree with the "Ledger Balances and PPV" PDF report for one week? Ask Chris Kitchen or Ian Chapman.
7. Is the pig type query the right approach for "No. Pigs / lambs / birds"? Answered 2026-11-18: no, and it is not needed. The booking and the lot both carry `"idSuperCategory"`, so `"Killed Qty"` splits by provenance. See "Pork kill by provenance". Open: Gui must confirm the mapping from his labels (RT, ODB, Free Range, GOS, Organic) to the 7 categories in the data.
8. When is `"Killed Qty"` final after the kill day? Owner: Unknown.
9. Which field marks a TC'd pig as producer responsible or factory responsible? Probable answer: `"STG_PIG_CONDEMNED PARTS__live"."Factory"` (see Gaps). Open: confirm with the report for Westerleigh 2026-09-16 or Spalding 2026-10-27.
10. Anwick: is the date basis kill date or plant weigh-in time? Check with another week of Anwick figures.

## Sources

All checks were read-only SQL (`SELECT`, `SHOW`) on account JBSUSA-PILGRIMS_EUROPE_PROD, on 2026-11-12. The pig type checks were on 2026-11-16.

- `PROD_RAW.INFORMATION_SCHEMA.TABLES` and `.COLUMNS`, schemas `MTECH`, `HELLENIC`, `AROLINK`, `INNOVA`
- `PROD_STAGING.INFORMATION_SCHEMA.TABLES`, `PROD_ANALYTICS.INFORMATION_SCHEMA.TABLES`
- `PROD_RAW.MTECH.PMTSPROCRECVTRANS`, `PMTSPROCRECVTRANSHOUSEDETAIL`, `PROTEINFACILITYPLANTS`, `PMTSCONDEMNTRANS`, `PMTSCONDEMNTRANSDETAILS`, `PMTSCONDEMNATIONS`
- `PROD_ANALYTICS.OPERATIONS_MT.FACTS_BRIM_PROCESSING`, `FACTS_BROILER_FLOCK`
- `PROD_RAW.HELLENIC."STG_PIG_BOOKING DETAIL__live"`, `"STG_PIG_ANIMAL__live"`, `"STG_PIG_PARTICIPANTS__live"`
- `PROD_STAGING.OPERATIONS.CONDEMNATION_HELLENIC_SPALDING_STG`, `CONDEMNATION_HELLENIC_WESTERLEIGH_STG`
- `PROD_STAGING.OPERATIONS."11_DAY_DAILY_YIELD_CSV_AROLINK_STG"`
- `DEV_RAW.HELLENIC.STG_PIG_TRANSACTIONS`, `STG_PIG_LOT`, `"STG_PIG_SUPER CATEGORIES"`, and `DEV_RAW.INFORMATION_SCHEMA.COLUMNS`
- `PROD_RAW.HELLENIC."STG_PIG_TRANSACTIONS__live"`, `"STG_PIG_LOT__live"`
