# Weekly P&L app

This app shows the weekly P&L for the pilot sites, Redruth and Bromborough. It also shows kill for the kill sites. It builds each line of the Anaplan weekly template from Snowflake and shows the RAG and the rule of each line.

- App: `DEV_ANALYTICS.FINANCE_PL_WEEKLY.WEEKLY_PL` (Next.js, Snowflake App Runtime, owner's rights).
- Data: the `WPL_T_*` tables in `DEV_ANALYTICS.FINANCE_PL_WEEKLY`. The SQL is in `../sql/`.
- Look and feel: from the Travel Expense Dashboard (`FINANCE_STORE.FPA.TRAVEL_EXPENSE_DASHBOARD`), with the Pilgrim's Europe brand colours in `.cortex/skills/pilgrims-reporting/`.

## Pages

| Page | What it shows |
| --- | --- |
| Weekly P&L (`/`) | The template for one week, for All sites (default) or one pilot site. This week, last week, change, RAG and source for each line. With All sites, P&L lines add the pilot sites and kill lines add the kill sites. Click ▸ to expand a line to its sites, and a site to the items behind its figure: component lines (subtotals), the kill build-up (kill) or GL accounts. Click a line for its rule, the reason for its RAG and its ticket. |
| Trend (`/trend`) | One line over 13 weeks. Overheads also show the weekly GL actual. |
| Kill (`/kill`) | Kill (poultry) and Kill (pork) by kill site and day. Poultry has the condemnation codes. Pork has TC'd producer resp. and factory resp. |
| Lines and rules (`/lines`) | All 82 template lines with source, RAG, reason and the rule used. |
| Data and quality (`/quality`) | Freshness of each source, the open rule tickets, the known limits of the default rules, and P&L GL accounts that no line uses. |

Site, week and line are URL parameters. "Share" copies the link to the exact view.

## RAG

The RAG is from ticket #11 (`reports/anaplan-line-tags.html`). This build makes the Green and Amber lines. Red lines show as "Manual, not built". Subtotals add their component lines and say how many components are not built.

Amber lines use a default rule. The rule shows next to each line in the app and in `WPL_LINE.RULE`. Change a rule in `sql/`, run the SQL, then run `CALL DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_REFRESH()`.

## Data refresh

The views read 557 M GL rows and take about 20 seconds. So the procedure `WPL_REFRESH` copies them into the `WPL_T_*` tables. The task `WPL_REFRESH_TASK` runs it each day at 11:00 UTC, after the 10:15 UTC GL and goods movement loads.

## Access

The app runs with owner's rights. A user needs only `USAGE` on the app, not grants on the tables.

| Role | Privilege | Who |
| --- | --- | --- |
| `ENGINEER_ROLE` | OWNERSHIP | Owner role. Chris, Luke, Jason, Emma, Peter, Simon and Abhishek have this role. |
| `MODELLER_FINANCE` | USAGE | Gui. Granted 2026-11-16. Gui is the only user of this role. |

Aswani and Tracy Conall have no Snowflake user that was found. To give a person access, grant `USAGE` to a role that the person has:

```sql
GRANT USAGE ON APPLICATION SERVICE DEV_ANALYTICS.FINANCE_PL_WEEKLY.WEEKLY_PL TO ROLE <role>;
```

The user must use that role in the session that opens the app.

## Logo

The header uses `public/pilgrims-logo.png` when that file is there. Until then it shows a text wordmark. Use the same file as the Travel Expense Dashboard.

## Run locally

```bash
npm install
npm run dev
```

The app uses the default Snowflake CLI connection (`~/.snowflake/connections.toml`). Open the URL that `next dev` prints. Do not use `node .next/standalone/server.js` locally: it does not serve static files.

```bash
npm test   # vitest unit tests
```

## Deploy

```bash
snow app deploy --verbose
```

`app.yml` (version 2) holds the deployment settings and the build phases. The deploy is declarative: a setting changed with `ALTER APPLICATION SERVICE` goes back to `app.yml` on the next deploy.
