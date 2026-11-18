# Data flow change log

This log lists each change to the flow of data to the Weekly P&L app. The diagram in the README shows the flow. Its source is [`flow.yml`](flow.yml).

## How to log a change

1. In the same pull request, change `flow.yml`.
2. Add one line to the end of the table below. Set **Status** to `pending`.
3. Do not change `flow.svg` or `index.html`. A GitHub Action renders them once a day, then opens a pull request. When that pull request is merged, `pending` changes to `rendered` and the date.

| Date | Change | Ticket or PR | Status |
| --- | --- | --- | --- |
| 2026-11-17 | First version. Shows the current objects in `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. | #43 | rendered 2026-11-17 |
