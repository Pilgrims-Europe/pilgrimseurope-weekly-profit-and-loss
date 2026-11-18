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
Birds delivered, less dead on arrival, in head. Birds delivered is `PLANTHDCOUNT` in Mtech. Condemnations are not taken off. Reports show them as detail, by Mtech condemnation code. Void loads are not included. All sites use the Dungannon rule.
_Avoid_: Birds delivered, live weight, rejects

**Kill (pork)**:
Pigs over scale, less TC'd pigs, in head. The source field is `"Killed Qty"` on the Hellenic booking. Ticket #10 checks if `"Killed Qty"` already takes off TC'd pigs.
_Avoid_: Pigs delivered, pigs over scale, pay weight

**Kill (lamb)**:
Lamb carcasses, in head, from HCS. The rule for condemned carcasses is Unknown. Ticket #36 decides it.
_Avoid_: Sheep kill

**Dungannon rule**:
The poultry kill rule that Dungannon uses. Dungannon is the poultry master process. All sites use this rule.

**TC'd**:
Total Condemned. A TC'd pig is a whole pig that is condemned. A TC'd pig is not in kill.

**Hellenic**:
The pig processing system. Snowflake also holds an old Hellenic sheep copy. The weekly P&L does not use it.

**HCS**:
The lamb production system. It gives lamb kill for Wales. Snowflake loads it every day into `PRODUCTION_HCS`.

**Mtech**:
The system that holds production transactions. Mtech and Anaplan can show different kill for the same site and week. This is expected. It is not an error.

**Anaplan**:
The system that holds planned transactions.

**GL line item**:
One posted line of a GL document, as site finance sees it in the SAP report FAGLL03H.
_Avoid_: GL transaction, journal line

**Ledger**:
A SAP set of books. Ledgers 0L and 1L hold the same GL line items. The weekly P&L uses 1L only.
_Avoid_: Book

**Fiscal week**:
A Monday to Sunday week of the finance calendar (DIM_CALENDARMASTER). A GL line item is in the fiscal week of its posting date. The BW field FISCALYEARWEEK gives the same week, but its year label is one year ahead (202746 is fiscal week 2026-46). Opening balances (period 000) have no fiscal week and are not in the weekly P&L.
_Avoid_: Posting week

**Run rate**:
The average weekly cost of a GL line over a selected period. Site finance can override it with a comment.
_Avoid_: Default, baseline

**Fiscal month**:
A group of 4 or 5 fiscal weeks. The months of a quarter have 4, 5 and 4 weeks. A fiscal quarter has 13 weeks.
_Avoid_: Period, calendar month

**MTD, QTD, YTD**:
Month, quarter or year to date. The fiscal weeks from the start of the fiscal month, quarter or year to the selected week.

**Last 12 Months**:
The 52 fiscal weeks up to and including the selected week.
_Avoid_: Rolling year, L12M

**Sales margin layout**:
A short P&L that Gui asked for. It goes from Total KG and G.S.V. down to Contribution, with a price or cost per kg on most lines.

**G.S.V.**:
Gross Sales Value. The invoice value of sales before O.S.C.
_Avoid_: Gross revenue, gross sales

**O.S.C**:
Override Sales Commission. The value that G.S.V. less O.S.C gives N.S.V. How it relates to the template line Overrider Adj is Unknown.
_Avoid_: Overrider, promotions

**N.S.V.**:
Net Sales Value. G.S.V. less O.S.C.
_Avoid_: Net revenue, net sales

**STD Cost of Goods**:
The standard cost of the goods sold: meat, labour, ingredients, packaging and other. It does not include freight.
_Avoid_: Cost of sales, COS

**COGS**:
Cost of goods sold, including freight. STD Cost of Goods plus freight.

**Contribution**:
N.S.V. less STD Cost of Goods less freight, in the Sales margin layout.
_Avoid_: Margin, CM1
