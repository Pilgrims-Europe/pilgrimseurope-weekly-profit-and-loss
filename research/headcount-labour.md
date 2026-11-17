# Which headcount and labour data is in Snowflake?

Ticket: #32. The weekly P&L has four headcount lines and a Labour Efficiency line. This note tells which headcount and labour data for Redruth and Bromborough is in Snowflake. Research date: 2026-11-17.

Lines that wait on this: Direct Employed FTE, Indirect Employed FTE, Direct Agency FTE, Indirect Agency FTE, Labour Efficiency.

This note reports table names, columns, row counts and totals only. It does not show employee names or personal values.

## Short answer

Kronos data is in Snowflake, but only in development, and it has almost no pilot site data. The Kronos (UKG) feed in `DEV_RAW.UKG` loads every day. Its timecard table has 1 Redruth employee and 1 Bromborough employee. No production Kronos table has data.

Employed FTE with a Direct and Indirect split is in `PEOPLE_STORE.HEADCOUNT_MT.FCT_HEADCOUNT_ACTUAL`. It comes from Vanessa's monthly Excel workbook, not from Kronos or payroll. It gives one value for each fiscal period (4 or 5 weeks), not each week. The last period is 2026010 (ends 2026-10-25).

Agency hours by week are in `PEOPLE_STORE.HEADCOUNT_MT.STG_AGENCY_HOURS_RAW`. They have a Direct and Indirect category and a site. One file loaded on 2026-09-25, and no file loaded after it. Unknown: if this file is Gustavo's weekly agency sheet.

Gustavo's weekly agency sheet is not in Snowflake under that name. Its format and location are Unknown.

SuccessFactors data is in Snowflake, in development only. It has 293 current Redruth records and 1 Bromborough record.

## Tables

| Table | What it is | Rows | Last load | Pilot site data |
| --- | --- | --- | --- | --- |
| `DEV_RAW.UKG.DAILY_ACTUAL_TOTALS` | Kronos (UKG) daily timecard totals by employee, pay code and job. Loaded by API. | 3,729 | 2026-11-17 04:04 UTC | 1 Redruth employee, 1 Bromborough employee |
| `DEV_RAW.UKG.EMPLOYEES` | Kronos employee list with employment status and employment term. | 15,366 | 2026-11-17 03:04 UTC | No Redruth or Bromborough employment term |
| `DEV_RAW.UKG.DAILY_ACTUAL_TOTALS_SYNC_SCOPE` | Employees and date ranges that the daily feed pulls. | 15,364 | 2026-11-17 | Not checked by site |
| `UKG_KRONOS_STORE.UAT.DAILY_ACTUAL_TOTALS` | Older test copy of the Kronos timecard totals. | 231 | 2026-06-30 | Not checked |
| `UKG_KRONOS_STORE.UAT.EMPLOYEES` | Older test copy of the Kronos employee list. | 10,000 | 2026-08-19 | Not checked |
| `UKG_KRONOS_STORE.PRD`, `PROD_RAW.UKG`, `PROD_RAW.SFACTORS` | Production schemas for Kronos and SuccessFactors. | 0 tables | Not applicable | None |
| `PEOPLE_STORE.HEADCOUNT_MT.FCT_HEADCOUNT_ACTUAL` | Employed headcount and FTE by employee and fiscal period. Has `SITE` and `DIRECT_INDIRECT`. Dynamic table, lag 1 day. | 178,106 | 2026-11-17 02:47 UTC | Periods 2026001 to 2026010 |
| `PEOPLE_STORE.HEADCOUNT_MT.STG_EXCEL_RAW` | Employee rows from Vanessa's workbook "Headcount Structure Standard Pilgrims Europe". Ten files, wk01 to wk43 of 2026. | 177,338 | 2026-11-11 | Yes |
| `PEOPLE_STORE.HEADCOUNT_MT.STG_HEADCOUNT_SNAPSHOT` | Daily SuccessFactors snapshot and Excel backfill. | 198,985 | 2026-11-16 17:00 UTC | Excel rows only. SF rows have no site. |
| `PEOPLE_STORE.HEADCOUNT_MT.STG_AGENCY_HOURS_RAW` | Agency shift hours by week, from file "PUK Agency wk35 Aug2026.xlsx". Has site, agency, department, category, hours and charge. | 17,604 | 2026-09-25 12:27 | Redruth weeks 1 to 15, Bromborough weeks 1 to 35 |
| `PEOPLE_STORE.HEADCOUNT_MT.FCT_HEADCOUNT_AGENCY` | Agency hours summed to fiscal period, with FTE. Reads `STG_AGENCY_HOURS_RAW`. | 312 | 2026-11-17 02:47 UTC | Redruth 2026001 to 2026004, Bromborough 2026001 to 2026008 |
| `PEOPLE_STORE.HEADCOUNT_MT.STG_AGENCY_FTE_RAW` | Agency hours and FTE by site and fiscal period, from the KPI tab of Vanessa's workbook. | 580 | 2026-11-11 12:02 | Periods 2026001 to 2026010 |
| `PEOPLE_STORE.HEADCOUNT_MT.DIM_PERIOD` | Fiscal periods 2022001 to 2027012. 28 or 35 days each. | 72 | 2026-11-17 | Not applicable |
| `PROJECT_CLARITY_PUK_REPORTING_DB.PUBLIC.DIRECT_HOURS_FTES_OPEN_OPTIONS` | Daily paid hours from Open Options (MyOptions), by org tree node. | 3,863,007 | 2026-01-16 | Yes, to 2025-10-28 only |
| `DEV_STAGING.SFACTORS.DT_EMPLOYEE_CURRENT_JOB` | Current SuccessFactors job for each employee, with location, cost centre and FTE. | 14,285 | 2026-11-14 | 293 Redruth, 1 Bromborough |

Source for rows and last load: `INFORMATION_SCHEMA.TABLES` and `SNOWFLAKE.ACCOUNT_USAGE.TABLES`.

## Kronos (UKG)

Two tasks load Kronos data by API into `DEV_RAW.UKG`. Source: `ACCOUNT_USAGE.TASK_VERSIONS`.

- `TASK_SYNC_EMPLOYEES` runs at 04:00 Europe/Warsaw. It calls `RETRIEVE_ALL_EMPLOYEE()`.
- `TASK_SYNC_DAILY_ACTUAL_TOTALS` runs at 05:00 Europe/Warsaw. It pulls yesterday's timecard totals.
- Both tasks succeeded on all 20 runs from 2026-10-29 to 2026-11-17. Source: `ACCOUNT_USAGE.TASK_HISTORY`.

The timecard table holds apply dates 2026-10-20 to 2026-11-16. It has 609 employees and 15,785 hours in total. The sync scope has 15,364 employees. Unknown: why only 609 employees have timecard rows.

The `JOB_NAME` column holds an org path, for example `Pilgrims Europe/Pork & Lamb/UK/Redruth/Site Supply Chain/Employee`. Most rows are Kings Lynn, Orleans and Ruskington. Redruth and Bromborough have 1 employee each.

The table has no Direct or Indirect field. Some job paths at Ruskington contain "InD". No job path at the pilot sites shows Direct or Indirect.

The pay codes mix hours, days and money. Examples: "Salaried Hours", "Basic", "Holiday", "Long Term Sickness", "OT 1.5". FTE needs a rule for which pay codes count. No such rule is in Snowflake.

Result: Kronos data in Snowflake cannot give Direct or Indirect Employed FTE by week for the pilot sites now.

## Employed FTE: headcount mart

`FCT_HEADCOUNT_ACTUAL` is a dynamic table owned by `HR_ENGINEER_ROLE`. It has four branches. Source: `GET_DDL`.

1. Excel: employee rows from `STG_EXCEL_RAW`. FTE = contract hours / 37.5. `DIRECT_INDIRECT` is Direct if `LABOUR_CLASSIFICATION` is Direct, else Indirect.
2. Excel vacancies: from `STG_EXCEL_VACANCIES_RAW`.
3. Contractors: from `FCT_HEADCOUNT_CONTRACTORS`.
4. SF: from the SuccessFactors snapshot. The DDL comment says this branch is "PARKED".

The pilot sites have rows from the Excel and Excel vacancy branches only. Employed FTE, Excel branch, not vacancies:

| Site | Period | Period end | Direct FTE | Indirect FTE |
| --- | --- | --- | --- | --- |
| Bromborough | 2026008 | 2026-08-30 | 257.8 | 167.1 |
| Bromborough | 2026009 | 2026-09-27 | 257.8 | 168.2 |
| Bromborough | 2026010 | 2026-10-25 | 256.6 | 168.1 |
| Redruth | 2026008 | 2026-08-30 | 182.5 | 125.0 |
| Redruth | 2026009 | 2026-09-27 | 180.3 | 126.1 |
| Redruth | 2026010 | 2026-10-25 | 187.1 | 128.2 |

The grain is one fiscal period, as a period-end snapshot. It is not weekly. A weekly value needs a rule, for example "use the last period value for each week". Nobody has agreed this rule.

`DIM_PERIOD` flags 2026010 as the current period. The research date is in 2026011. Unknown: if `DIM_PERIOD` updates by hand.

The SuccessFactors snapshot (source `SF`) has 14,239 rows for 2026-11-16. All SF rows have no site and no Direct or Indirect value. Only 8 rows join to `DIM_COST_CENTRE`.

## Agency labour

`STG_AGENCY_HOURS_RAW` holds agency shifts from one file, "PUK Agency wk35 Aug2026.xlsx". The table comment says it is the "PUK Agency tab" from Vanessa's consolidation workbook. Columns include `WEEK_NUM`, `YEAR_NUM`, `SITE`, `AGENCY`, `DEPARTMENT`, `CATEGORY`, `HOURS_RECEIVED` and `SHIFT_CHARGE_GBP`.

Pilot site coverage, 2026:

| Site | Category | Weeks | First week | Last week | Shift rows | Hours |
| --- | --- | --- | --- | --- | --- | --- |
| Bromborough | Direct | 32 | 01 | 35 | 1,011 | 19,054 |
| Bromborough | Indirect | 28 | 01 | 35 | 106 | 1,178 |
| Redruth | Direct | 15 | 01 | 15 | 489 | 13,788 |
| Redruth | Indirect | 15 | 01 | 15 | 153 | 4,277 |

All pilot site rows have a charge value. Total charge: Redruth £329,801, Bromborough £363,085.

Last three weeks in the file, hours / 37.5:

| Site | Week | Direct hours | Direct FTE | Indirect hours | Indirect FTE |
| --- | --- | --- | --- | --- | --- |
| Bromborough | 33 | 483 | 12.9 | 17 | 0.5 |
| Bromborough | 34 | 60 | 1.6 | 17 | 0.5 |
| Bromborough | 35 | 924 | 24.6 | 43 | 1.1 |
| Redruth | 13 | 1,231 | 32.8 | 213 | 5.7 |
| Redruth | 14 | 1,195 | 31.9 | 186 | 5.0 |
| Redruth | 15 | 1,066 | 28.4 | 320 | 8.5 |

Points to note:

- The data stops at week 15 for Redruth and week 35 for Bromborough. Unknown: why Redruth stops earlier.
- Bromborough week 34 is much lower than weeks 33 and 35. Unknown: if week 34 is incomplete.
- `FCT_HEADCOUNT_AGENCY` reads `WEEK_NUM` as an ISO week. Unknown: if the file uses ISO weeks or fiscal weeks.
- `FCT_HEADCOUNT_AGENCY` divides by 37.5 hours a week to get FTE. Unknown: if site finance uses the same rule.

`STG_AGENCY_FTE_RAW` has agency hours and FTE by site and fiscal period, from Vanessa's KPI tab. It has 10 rows for each pilot site and category, periods 2026001 to 2026010. It is not weekly.

## Gustavo's weekly agency sheet

No table or file name in Snowflake contains "Gustavo". The kick-off meeting says Gustavo consolidates agency data every week. Some agency data comes by email. Source: `docs/meetings/Initial Meeting - 121126.txt`, lines 328 and 556 to 558.

The meeting also says Ben uses Gustavo's sheet in the project with Vanessa. The agency file in `STG_AGENCY_HOURS_RAW` comes from Vanessa's workbook. It is possible that this file holds Gustavo's data. Nobody has confirmed this.

Format of Gustavo's sheet: Unknown. Location: Unknown.

## Open Options (MyOptions) hours

`DIRECT_HOURS_FTES_OPEN_OPTIONS` has paid hours by day from Open Options. Its org tree splits the pilot sites:

| Site | Tree node 3 | Rows | Employees | First date | Last date |
| --- | --- | --- | --- | --- | --- |
| Redruth | Directs | 180,204 | 357 | 2024-01-01 | 2025-10-28 |
| Redruth | InDirects | 67,604 | 115 | 2024-01-01 | 2025-10-28 |
| Redruth | Monthly RED | 31,362 | 53 | 2024-01-01 | 2025-10-28 |
| Bromborough | Direct | 89,709 | 426 | 2024-01-02 | 2025-10-28 |
| Bromborough | Indirect | 4,640 | 28 | 2024-01-01 | 2025-10-28 |
| Bromborough | Monthly | 9,806 | 78 | 2024-01-01 | 2025-10-28 |

The data stops on 2025-10-28. A daily MERGE ran from 2025-11-01 to 2026-01-16 and then stopped. Source: `ACCOUNT_USAGE.QUERY_HISTORY`. Unknown: if the pilot sites moved from Open Options to Kronos.

This table cannot give current weekly FTE. It shows that a time system once had a Direct and Indirect split for both sites.

## SuccessFactors

SuccessFactors data is in `DEV_RAW.SFACTORS` and `DEV_STAGING.SFACTORS`. The production schema `PROD_RAW.SFACTORS` has no tables.

In `DEV_STAGING.SFACTORS.DT_EMPLOYEE_CURRENT_JOB`, location Redruth has 293 records and Bromborough has 1. The Redruth records use one placeholder cost centre. Kings Lynn and Westerleigh have 4 records each. The Excel workbook has about 300 Redruth and 390 Bromborough employees in period 2026010.

Result: SuccessFactors in Snowflake does not cover Bromborough now. This integration is out of scope for this project.

## Labour Efficiency

The kick-off meeting defines labour variance as standard labour less payroll cost less agency cost. Source: meeting notes, lines 308 to 345 and 995.

Snowflake has agency charge by week in `STG_AGENCY_HOURS_RAW`, to week 35 only. This note did not find weekly payroll cost or standard labour in Snowflake. Unknown: if payroll cost by week is in Snowflake. A separate ticket can check GL labour accounts.

## Gaps

- No production Kronos or SuccessFactors data in Snowflake.
- Kronos timecards in development have 1 employee at each pilot site.
- Kronos has no Direct or Indirect field and no FTE rule.
- Employed FTE with a Direct and Indirect split is monthly, from Excel, and ends at period 2026010.
- Agency hours by week stop at week 15 (Redruth) and week 35 (Bromborough). No file loaded after 2026-09-25.
- Gustavo's weekly sheet is not identified in Snowflake.

## Open questions

For Ben (headcount mart project; full name and role Unknown):

1. Is "PUK Agency wk35 Aug2026.xlsx" Gustavo's weekly agency sheet, or a different file?
2. Will a new agency file load each week? Who loads it?
3. Why does Redruth agency data stop at week 15?
4. Is `WEEK_NUM` an ISO week or a fiscal week?
5. When will the SF branch of `FCT_HEADCOUNT_ACTUAL` go live with site and Direct or Indirect?

For Gustavo (role Unknown):

1. What is the format of the weekly agency sheet? Where is it saved?
2. Does it split Direct and Indirect hours for Redruth and Bromborough?

For site finance at Redruth and Bromborough:

1. Which system gives employed hours today: Kronos, Open Options or other?
2. How do you get Direct and Indirect Employed FTE for one week?
3. Which hours divide into FTE: 37.5, 39, 40 or other?

For the Kronos (UKG) feed owner (Unknown):

1. Why do only 609 of 15,364 employees in scope have timecard rows?
2. When will the feed move to production?

## Sources

All Snowflake checks ran read-only on account `JBSUSA-PILGRIMS_EUROPE_PROD` on 2026-11-17.

1. `snowflake_object_search` for Kronos, UKG, payroll, headcount, FTE, agency, SuccessFactors.
2. `PEOPLE_STORE.INFORMATION_SCHEMA.TABLES` and `COLUMNS`. `UKG_KRONOS_STORE.INFORMATION_SCHEMA.TABLES`. `DEV_RAW.INFORMATION_SCHEMA.TABLES`, schemas `UKG` and `SFACTORS`.
3. `SNOWFLAKE.ACCOUNT_USAGE.TABLES`, `SCHEMATA` and `COLUMNS`, filtered on names like `%KRONOS%`, `%UKG%`, `%PAYROLL%`, `%HEADCOUNT%`, `%AGENCY%`, `%FTE%`, `%HR%`.
4. `GET_DDL('table', 'PEOPLE_STORE.HEADCOUNT_MT.FCT_HEADCOUNT_ACTUAL')` and `FCT_HEADCOUNT_AGENCY`.
5. `ACCOUNT_USAGE.TASK_VERSIONS` and `TASK_HISTORY` for `TASK_SYNC_EMPLOYEES`, `TASK_SYNC_DAILY_ACTUAL_TOTALS`, `TASK_DAILY_HEADCOUNT_SNAPSHOT`, 2026-10-18 to 2026-11-17.
6. `ACCOUNT_USAGE.QUERY_HISTORY`, writes to `DIRECT_HOURS_FTES_OPEN_OPTIONS`, last 400 days.
7. Aggregate `SELECT` queries. Example for employed FTE:

```sql
select site, period_key, source, direct_indirect, count(*) rows_n,
       sum(heads) heads, round(sum(fte),1) fte
from PEOPLE_STORE.HEADCOUNT_MT.FCT_HEADCOUNT_ACTUAL
where site in ('Redruth','Bromborough') and period_key >= 2026008
group by 1,2,3,4;
```

Example for weekly agency hours:

```sql
select coalesce(r.new_site, sm.new_site, r.site) site, upper(r.category) cat,
       count(distinct r.year_num||'-'||lpad(r.week_num,2,'0')) weeks,
       round(sum(r.hours_received),0) hours
from PEOPLE_STORE.HEADCOUNT_MT.STG_AGENCY_HOURS_RAW r
left join PEOPLE_STORE.HEADCOUNT_MT.REF_AGENCY_SITE_MAPPING sm on r.site = sm.site
where coalesce(r.new_site, sm.new_site, r.site) in ('Redruth','Bromborough')
group by 1,2;
```

8. Meeting notes: `docs/meetings/Initial Meeting - 121126.txt`.
9. Line definitions: `sql/02_wpl_line.sql`, lines 62 and 113 to 118.
