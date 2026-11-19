# Data flow change log

This log lists each change to the flow of data to the Weekly P&L app. The diagram in the README shows the flow. Its source is [`flow.yml`](flow.yml).

## How to log a change

1. In the same pull request, change `flow.yml`.
2. Add one line to the end of the table below. Set **Status** to `pending`.
3. Do not change `flow.svg` or `index.html`. A GitHub Action renders them once a day, then opens a pull request. When that pull request is merged, `pending` changes to `rendered` and the date.

| Date | Change | Ticket or PR | Status |
| --- | --- | --- | --- |
| 2026-11-17 | First version. Shows the current objects in `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. | #43 | rendered 2026-11-17 |
| 2026-11-18 | Add the material master as a source of `WPL_MOVEMENT_WEEK`. Production tonnage is now finished goods only. | #35 | pending |
| 2026-11-18 | Add `WPL_SALES_DETAIL`, `WPL_T_SALES_DETAIL` and the material groupings as planned, for the Sales margin filters. Add `WPL_DQ_DATA_TO` and `WPL_T_DQ_DATA_TO` as planned, so freshness is built in two steps. They become live when the SQL is run in `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. | None | pending |
| 2026-11-18 | The SQL of #60 ran in `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. `WPL_SALES_DETAIL`, `WPL_T_SALES_DETAIL`, `WPL_DQ_DATA_TO`, `WPL_T_DQ_DATA_TO` and the material groupings are now live. `WPL_SALES_WEEK` now reads `WPL_SALES_DETAIL`. | #60 | pending |
| 2026-11-18 | The intercompany rule in `WPL_SALES_DETAIL` now uses the sold-to and ship-to in COPA, not the customer master. The customer master stays a source for customer names. | #20 | pending |
