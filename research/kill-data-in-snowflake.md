# Kill data in Snowflake

This note records progress on issue #2. It tells the team that a first kill
table now exists in Snowflake, so nobody builds a second one.

## The table

`DEV_ANALYTICS.FINANCE_PL_WEEKLY.MTECH_BIRDKILL` is a view. It was created on
13 November 2026.

- Source: `PROD_RAW.MTECH.MVPMTSPROCRECVTRANSHOUSEDETAIL`.
- Grain: one row per site per kill date.
- Columns: `LOADS`, `BIRDS_DELIVERED`, `DOA`, `REJECTS`, `BIRDS_KILLED` and
  `LIVE_WEIGHT_NET`, with `WEEK_START`, `ISO_YEAR` and `ISO_WEEK`.
- Sites: Dungannon (S01), Ashbourne (S10) and Anwick (S11). These are all the
  bird kill sites.
- Species: chicken. Broiler loads only. Void loads are excluded.
- Coverage: July 2018 to 8 November 2026.

## Known gaps

- `REJECTS` is set to 0. The team must agree a condemnation code list first.
  Until then `BIRDS_KILLED` is birds delivered less DOA only. This is not yet
  the glossary definition of kill.
- Pork is not in this table. The pork kill definition is Unknown. See issue #3.
- The table is in `DEV_ANALYTICS`. It stays there for now.
- No week has been reconciled against a figure site finance trusts.

## Finance week

The Pilgrim's Europe finance week starts on Monday and ends on Sunday. The
fiscal calendar is `PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER`. The
`WEEK_START` column in the view agrees with it.
