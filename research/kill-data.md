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

## Gaps

- Mtech rejects: the condemnation codes that make up rejects are not known. Some codes are part rejects.
- Mtech: the meaning of `CALCULATIONCATEGORY` 1 and 2 is not known.
- Mtech: `FARMHDCOUNT` and `PLANTHDCOUNT` are different at Dungannon and Ballymena. The correct field for birds delivered is not known.
- Mtech: the raw tables last changed on 2026-11-10, with data to 2026-11-08. The load schedule is not known.
- Hellenic: `"Est Kill Date"` is the estimated kill date. A field for the actual kill date on the booking line is not known. `STG_PIG_ANIMAL__live` has `"Kill Date"` for each pig.
- Hellenic: the glossary defines kill for poultry only. A definition of kill for pork is not known.
- Ballymena is in Mtech. It is not a pilot site.
- `PROD_RAW.AGROSOFT` has slaughter tables. This note did not check them.

## Open questions

1. Which Mtech condemnation codes are rejects for the weekly P&L? Ask Emma or the poultry site finance teams.
2. For birds delivered, use `FARMHDCOUNT` or `PLANTHDCOUNT`? Owner: Unknown.
3. Is there a poultry Innova system that is not in Snowflake? Owner: Unknown.
4. What is kill for pork: `"Killed Qty"`, or delivered less DOA, DIP and condemned? Owner: Unknown.
5. How often does the Mtech feed load into Snowflake? Owner: Unknown.

## Sources

All checks were read-only SQL (`SELECT`, `SHOW`) on account JBSUSA-PILGRIMS_EUROPE_PROD, on 2026-11-12.

- `PROD_RAW.INFORMATION_SCHEMA.TABLES` and `.COLUMNS`, schemas `MTECH`, `HELLENIC`, `AROLINK`, `INNOVA`
- `PROD_STAGING.INFORMATION_SCHEMA.TABLES`, `PROD_ANALYTICS.INFORMATION_SCHEMA.TABLES`
- `PROD_RAW.MTECH.PMTSPROCRECVTRANS`, `PMTSPROCRECVTRANSHOUSEDETAIL`, `PROTEINFACILITYPLANTS`, `PMTSCONDEMNTRANS`, `PMTSCONDEMNTRANSDETAILS`, `PMTSCONDEMNATIONS`
- `PROD_ANALYTICS.OPERATIONS_MT.FACTS_BRIM_PROCESSING`, `FACTS_BROILER_FLOCK`
- `PROD_RAW.HELLENIC."STG_PIG_BOOKING DETAIL__live"`, `"STG_PIG_ANIMAL__live"`, `"STG_PIG_PARTICIPANTS__live"`
- `PROD_STAGING.OPERATIONS.CONDEMNATION_HELLENIC_SPALDING_STG`, `CONDEMNATION_HELLENIC_WESTERLEIGH_STG`
- `PROD_STAGING.OPERATIONS."11_DAY_DAILY_YIELD_CSV_AROLINK_STG"`
