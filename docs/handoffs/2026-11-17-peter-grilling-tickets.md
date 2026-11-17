# Handoff for Chris: Peter's grilling sessions, 2026-11-17

Repo: `Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss`. Read `AGENTS.md` first. All Git and GitHub text follows its "Writing to Git" rules.

Peter Nwora (pnwora7) grilled tickets #4, #22, #31, #34 and #35 with the agent. Peter decided each item below. Gui has not confirmed any of it. Nothing is posted on the tickets. Two tasks are left for you: the `sql/09` change and the ticket comments.

## Task 1: change `sql/09_wpl_movement_week.sql` (ticket #35)

Decision: until site finance confirms, Production Tonnage is finished goods only.

- Source: Z61 less Z62 on GL account `0005000100` (finished goods).
- Convert finished goods in cases (base unit `CS`) to kg with `NET_WEIGHT` in `PROD_ANALYTICS.FINANCE_MT.DIM_MATERIALMASTER`. Join on `LTRIM(MATERIAL_NUMBER, '0') = LTRIM(MATERIAL, '0')`. Keep only rows with weight unit `KG`. One material can have 2 rows with the same weight.
- Today the view keeps base unit `KG` only and counts all Z61 less Z62 rows, so it counts every production stage.
- Tag the Production Tonnage line Amber, with a note on the line: finished goods, SAP Z61 less Z62, GL 5000100, not confirmed by site finance.
- Facts and a query to copy: `research/z61-movement-type.md`.

## Task 2: post the decision comments

`gh` is installed on Peter's machine but he is not logged in. Post these four comments on the tickets. Do not close a ticket until Gui answers.

### #22 (GL accounts for Consumables, OCI and Traded Good)

| Line | GL accounts | Sites |
|---|---|---|
| Consumables | All accounts in P&L group CONSUMABLES, company code 125 (45 accounts) | Both |
| Packaging (OCI) | 5005100, 5900230 | Both |
| Traded Good (PPV) | 5000600, 5000605, 5000610, 5000620 | Both |
| Materials (OCI) | None. Empty, labelled line. | Both |

The lines stay Amber until Gui confirms. Facts for Gui:

- Account 5005100 is named COGS-FUEL-GAS, not packaging. It is in P&L group PACKAGING. Fiscal year 2026: about 509 thousand pounds at Redruth and 531 thousand pounds at Bromborough. The app puts it in Packaging (OCI) only, so Packaging Yield is about 1.04 million pounds lower than the P&L group PACKAGING total. Peter chose to keep it. Question 11 in `questionnaires/line-sources-for-gui.html` asks Gui.
- The four Traded Good accounts are inventory revaluation (raw material, semi-finished, finished goods, ingredients). Redruth has lines on all four. This does not match "Redruth reports no traded goods".

### #31 (sales adjustment lines)

- All four lines are Not in v1: Credit Note Adj, Price Corrections, Overrider Adj and Promotional Adj. They show empty, tagged Red.
- Net revenue comes from the COPA gold table `PROD_ANALYTICS.FINANCE_MT.FACT_COPAPEUS4`. The P&L says so.
- Why: COPA has credit note billing types (ZG1, ZS1, RE, G2, L2) and a `PROMOTIONAL_DISC` column. The correction columns are zero at the pilot sites. Unknown: if SAP net revenue already includes the Excel amounts. Loading the files could count an amount twice. I did not verify that COPA net revenue includes credit notes.
- Open: what Overrider Adj is, and if it needs a field on the site entry screen (#9). Peter is not sure. Until Gui answers, no field.
- Question 10 in `questionnaires/red-line-sources-for-gui.html` asks Gui.

### #34 (WIP, F.Goods and Agriculture PPV)

- WIP (OCI), F.Goods (OCI) and Agriculture Standard Cost Variance (PPV) are all Not in v1. They show empty, tagged Red.
- The Total Other Costs and Income line shows a note that WIP (OCI), F.Goods (OCI) and Materials (OCI) are empty.
- Snowflake has no GL account named WIP or OCI in company code 125. The finished goods accounts are already in other lines.
- Open: where WIP gets its value, and who owns the F.Goods Excel file. Questions 5 to 7 in `questionnaires/red-line-sources-for-gui.html` already ask Gui.

### #35 (production tonnage)

- The decision is in Task 1.
- Weeks: the app uses fiscal weeks (Monday to Sunday) by posting date.
- Gui sends the question to site finance at Redruth and Bromborough. The owner is Unknown.
- Open: which tonnage site finance reports today, if net weight is right for cases, the SAP text of Z61 (Aswani Nune), and why Bromborough differs from Arolink by 13.6% in week 2026-10-05.
- Questions 11 and 12 in `questionnaires/red-line-sources-for-gui.html` ask Gui.

### #4 (GL line items)

#4 is closed. Peter's decisions on the GL table `PROD_RAW.SAP."jbs_bw4_hana.edw.fmco.figl/C_ACTUALPLANGL"`:

- Ledger 1L only. The table has a third ledger, EL, from fiscal period 004 of 2025. Ignore it.
- Leave out period 000 (opening balances). It has no posting date and some lines have no week.
- Full reload each week.
- Open for Gui: line matching to FAGLL03H without line item number, posting key, assignment and reference (question 9), and PPV by supplier (question 10) in `questionnaires/line-sources-for-gui.html`.

## One conflict to decide

Peter chose to take the week from `FISCALYEARWEEK`. The app does not do this. `sql/05_wpl_gl_week.sql` assigns each GL line item to a week by posting date, through `WPL_WEEK`. `GLOSSARY.md` now says "Fiscal week: the week of a GL line item, as the BW field FISCALYEARWEEK gives it". Decide which is right, then fix the code or the glossary entry.

Facts: `FISCALYEARWEEK` runs 202601 to 202746 for fiscal years 2025 and 2026. The label year is one ahead of `FISCALYEAR`. Unknown: if it matches the weekly P&L week.

## Questionnaires

Peter added questions to these files. They are pushed. Nobody has sent them to Gui.

- `questionnaires/line-sources-for-gui.html`: question 11 (fuel gas). "Anything else?" is now question 12.
- `questionnaires/red-line-sources-for-gui.html`: question 10 (sales adjustments in SAP net revenue) and questions 11 and 12 (production tonnage). "Anything else?" is now question 13.
- `to-questionnaire-gl-line-items.md` is marked Replaced. Peter owns it. Delete it if you want.

## Gotchas

- The terminal is PowerShell. Do not use heredocs.
- `git push` can be rejected when `origin/main` has moved. Run `git pull --rebase`, then push.
- `gh` is not logged in on Peter's machine. Peter must run `gh auth login` himself.
- Neither questionnaire was opened in a browser after the edits. Check them in Edge or Chrome before you send them.

## Suggested skills

- `sql-author`: before you change `sql/09` or run SQL on the GL or COPA tables.
- `pilgrims-reporting` and `html-authoring`: before you edit any questionnaire or report HTML.
- `mattpocock-skills:wait-what`: for all Git and GitHub text.
