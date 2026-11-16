# Weekly P&L

The weekly P&L is the profit and loss that each site finance team reports every week. This project moves its data and logic into Snowflake, so sites spend less time building it.

## Language

**Weekly P&L**:
A weekly estimated result for a site. Sales and variances are actual; overheads are a forecast.
_Avoid_: Weekly actuals, ECTO

**Site finance**:
The finance team at one site that builds and explains the weekly P&L.
_Avoid_: Site accountants

**Kill (poultry)**:
Birds delivered, less dead on arrival, less rejects: the net birds onto the line.
_Avoid_: Birds delivered, live weight

**GL line item**:
One posted line of a GL document, as site finance sees it in the SAP report FAGLL03H.
_Avoid_: GL transaction, journal line

**Ledger**:
A SAP set of books. Ledgers 0L and 1L hold the same GL line items. The weekly P&L uses 1L only.
_Avoid_: Book

**Fiscal week**:
The week of a GL line item, as the BW field FISCALYEARWEEK gives it. Opening balances (period 000) have no fiscal week and are not in the weekly P&L.
_Avoid_: Posting week

**Run rate**:
The average weekly cost of a GL line over a selected period. Site finance can override it with a comment.
_Avoid_: Default, baseline
