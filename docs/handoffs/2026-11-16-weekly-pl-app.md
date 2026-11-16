# Handoff: Weekly P&L app, session of 2026-11-16 (evening)

Repo: `c:\Users\cmccann2\.Git\pilgrimseurope-weekly-profit-and-loss` (GitHub `Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss`, PUBLIC). Driver: Chris McCann. Read `AGENTS.md` first. All Git and GitHub text follows its "Writing to Git" rules. Handoffs go in `docs/handoffs/`, not `%TEMP%`.

The previous handoff is `docs/handoffs/2026-11-16-weekly-pl.md` (afternoon). Its open items still apply unless listed as done below.

## What happened this session

1. Built the 9 Green and 39 Amber lines of the Anaplan weekly template (from `reports/anaplan-line-tags.html`, ticket #11) in Snowflake.
   - SQL: `sql/01_wpl_week.sql` to `sql/14_wpl_refresh.sql`. All objects are in `DEV_ANALYTICS.FINANCE_PL_WEEKLY` and are already created.
   - `WPL_LINE` is the line catalogue: RAG, reason, rule used, subtotal components, ticket.
   - `WPL_WEEKLY_PL` gives the value for each site, week and line. `WPL_REFRESH` copies the views to `WPL_T_*` tables. `WPL_REFRESH_TASK` runs it daily at 11:00 UTC (resumed).
   - Chris chose the Amber default rules. They are in `WPL_LINE.RULE` and in the app.
2. Built and deployed the Snowflake App `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WEEKLY_PL` from `app/` (Next.js, owner's rights, `app/app.yml` version 2).
   - Style copied from `FINANCE_STORE.FPA.TRAVEL_EXPENSE_DASHBOARD` (Kim Larsen). Logo: `app/public/pilgrims-logo.png`.
   - Pages: Weekly P&L, Trend, Kill, Lines and rules, Data and quality.
   - URL: https://fehyhci-jbsusa-pilgrims-europe-prod.snowflakecomputing.app (version 2 deployed).
3. Week 45 (2 to 8 Nov 2026) tie-out: Green GL lines and STD Ext NSV equal the raw sources for both pilot sites. Poultry delivered and DOA equal `MTECH_BIRDKILL`.
4. All work is in PR #24, open, not merged: https://github.com/Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss/pull/24 (branch `weekly-pl-app`). The PR body lists what to check.
5. The new app URL had no public DNS record for 23 minutes. `ALTER APPLICATION SERVICE ... SUSPEND` then `RESUME` fixed it. If a browser still shows ERR_NAME_NOT_RESOLVED, run `ipconfig /flushdns`.

## Open state and next steps

- **Chris is testing** the app, deployed and local (`npm run dev` in `app/`, http://localhost:3000). Expect feedback on layout, figures and rules.
- **PR #24**: Chris reviews and merges. PR #23 (status report + Gui questionnaire) is still open and separate.
- **Sharing**: no role has USAGE on the app except the owner, `ENGINEER_ROLE`. Ask Chris which roles get access before any `GRANT`.
- **Amber rules change** when #20 (intercompany), #21 (standard freight) and #22 (GL accounts) are decided. Change the SQL in `sql/`, rerun the file, then `CALL DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_REFRESH()`. No app redeploy is needed for data or rule changes.
- **Known limits** (also on the app's Data and quality page): poultry kill takes off all condemnation codes, including croppings. Production Material Yield is GL consumption less output credits (a proxy). Overheads are a 13-week run rate. Substitution and Materials (OCI) are empty.
- Still open from the earlier handoff: Peter's `to-questionnaire-gl-line-items.md` (delete or mark replaced?), and the questionnaire to Gui is not sent.

## Gotchas

- Run SQL files with `snow sql -f <file> --enable-templating NONE`. The `&` in "P&L" breaks templating otherwise.
- The views take about 20 s and 23 GB per query. The app must read `WPL_T_*` tables, not the views.
- Gold `FACT_COPAPEUS4`: filter `RECORD_SOURCE = 'Actual'`. `VERSION_FLAG = 'AB'` includes budget.
- GL `FISCALYEARWEEK` has a year +1 quirk. Join `POSTINGDATE` to `PROD_ANALYTICS.FINANCE_MT.DIM_CALENDARMASTER` instead.
- Redeploy: `snow app deploy` in `app/`, about 2.5 minutes. In PowerShell the tool drops a leading `cd`, so check the working folder.
- The browser panel cannot click inside the deployed app iframe reliably. Navigate to page URLs instead.
- A browser download from the panel saves into the repo `docs/` folder. Move or delete it, do not commit it there.

## References (do not duplicate)

- `app/README.md`: pages, refresh, run and deploy.
- `sql/*.sql`: rules and comments for every line.
- PR #24 body: changes, checks and test results.
- Project memory: `/memories/projects/Users-cmccann2-.Git-pilgrimseurope-weekly-profit-and-loss/weekly-pl-app.md`.
- `reports/anaplan-line-tags.html`, `research/*.md`, `GLOSSARY.md`.

## Suggested skills

- `snowflake-apps` (then `develop`, `deploy` or `operate`): for any change, redeploy, logs or sharing of `WEEKLY_PL`.
- `sql-author`: before you change or run the `sql/` files.
- `pilgrims-reporting`: house style for any UI or report change.
- `mattpocock-skills:wait-what`: for all Git and GitHub text.
- `mattpocock-skills:code-review`: to review PR #24 if Chris asks.
- `mattpocock-skills:wayfinder`: when #20, #21 or #22 are decided and the map (#1) needs an update.
