# Weekly P&L

The weekly P&L is the profit and loss that each site finance team reports every week. This project moves its data and logic into Snowflake, so sites spend less time building it.

## Language

**Weekly P&L**:
A weekly estimated result for a site. Sales, variances and some costs are actual. Most overheads are a run rate.
_Avoid_: Weekly actuals, ECTO

**Site finance**:
The finance team at one site that builds and explains the weekly P&L.
_Avoid_: Site accountants

**Site**:
A factory that the weekly P&L reports on. A site is a pilot site or a kill site.

**Pilot site**:
A site that gets the full weekly P&L in v1. The pilot sites are Redruth and Bromborough. They do not kill.

**Kill site**:
A site that gets the kill lines only. The poultry kill sites are Anwick, Ashbourne, Ballymena and Dungannon. The pork kill sites are Spalding and Westerleigh.

**RAG**:
The status of a weekly P&L line. Green: the source and the rule are decided. Amber: the line is built, but its rule is not confirmed. Red: the line is not built, because its source is not in Snowflake or is Unknown.

**The fog**:
Open questions that do not have a ticket yet.

## Kill

**Kill (poultry)**:
Birds delivered, less dead on arrival, in head. Condemnations are not taken off. Reports show them as detail, by condemnation code. Void loads are not included. All sites use the Dungannon rule.
_Avoid_: Birds delivered, live weight, rejects

**Kill (pork)**:
Pigs over scale, less TC'd pigs, in head. It is Unknown if the Hellenic kill quantity already takes off TC'd pigs.
_Avoid_: Pigs delivered, pigs over scale, pay weight

**Kill (lamb)**:
Lamb carcasses, in head, from HCS. The rule for condemned carcasses is Unknown.
_Avoid_: Sheep kill

**Dungannon rule**:
The poultry kill rule that Dungannon uses. Dungannon is the poultry master process. All sites use this rule.

**TC'd**:
Total Condemned. A TC'd pig is a whole pig that is condemned. A TC'd pig is not in kill.

## Systems

**Hellenic**:
The pig processing system. Hellenic also held a sheep database. The weekly P&L does not use it.

**HCS**:
The lamb production system. It gives lamb kill for Wales.

**Mtech**:
The system that holds production transactions. Mtech and Anaplan can show different kill for the same site and week. This is expected. It is not an error.

**Anaplan**:
The system that holds planned transactions.

**COPA**:
The SAP sales profitability data. It has one line for each billing item, with kg, sales value, standard cost and freight.

**Arolink**:
The system that records production yield by production stage.

**Kronos**:
The time and attendance system (UKG).

## GL and calendar

**GL line item**:
One posted line of a GL document, as site finance sees it in the SAP report FAGLL03H.
_Avoid_: GL transaction, journal line

**Ledger**:
A SAP set of books. Ledgers 0L and 1L hold the same GL line items. The weekly P&L uses 1L only.
_Avoid_: Book

**Fiscal week**:
A Monday to Sunday week of the finance calendar. A GL line item is in the fiscal week of its posting date. Opening balances have no fiscal week and are not in the weekly P&L.
_Avoid_: Posting week

**Fiscal month**:
A group of 4 or 5 fiscal weeks. The months of a quarter have 4, 5 and 4 weeks. A fiscal quarter has 13 weeks.
_Avoid_: Period, calendar month

**MTD, QTD, YTD**:
Month, quarter or year to date. The fiscal weeks from the start of the fiscal month, quarter or year to the selected week.

**Last 12 Months**:
The 52 fiscal weeks up to and including the selected week.
_Avoid_: Rolling year, L12M

## Sales

**Intercompany**:
A sale where the sold-to or the ship-to customer is on Gui's internal-site list.
_Avoid_: Interco

**External sales**:
Sales that are not intercompany.

**STO**:
Stock transport order. Goods that a site sends to a different Pilgrim's Europe site. The weekly P&L values STO at standard cost. How STO relates to intercompany sales is Unknown.
_Avoid_: Internal transfer

**Total KG**:
The weight of edible external sales, in kg. Sales tonnage on the Anaplan template is the same value in tonnes.
_Avoid_: Sales tonnage, sales volume

**Edible, Inedible**:
Each sale is edible or inedible. Total KG counts edible sales only. The rule that finds inedible sales is Unknown.

**Production tonnage**:
The weight of finished goods that a site makes in a week. It does not count semi-finished stages.
_Avoid_: Production volume, output

**Sales margin layout**:
A short P&L that Gui asked for. It goes from Total KG and G.S.V. down to standard contribution, with a price or cost per kg on most lines.

**G.S.V.**:
Gross Sales Value. The invoice value of sales before O.S.C.
_Avoid_: Gross revenue, gross sales

**O.S.C**:
The promotional discount and overrider that are taken off G.S.V. to give N.S.V. Gui calls it Override Sales Commission. The FP&A draft manual calls the line Promo Discount (O.S.C). It does not include Overrider Adj, credit note adjustments or price corrections. Gui has not confirmed this.
_Avoid_: Overrider Adj, promotions

**N.S.V.**:
Net Sales Value. G.S.V. less O.S.C. STD Ext NSV on the Anaplan template is N.S.V. of external sales.
_Avoid_: Net revenue, net sales, NSV

**Sales adjustment**:
A change to sales value that is not in COPA: credit note adjustments, price corrections, Overrider Adj and promotional adjustments.

**Overrider Adj**:
A rebate accrual for a customer. It is not part of O.S.C. This meaning is from the FP&A draft manual. Gui has not confirmed it.

**Total net revenue**:
N.S.V. of external sales, plus STO at standard cost, plus sales adjustments.

## Cost and contribution

**Standard cost**:
The released cost of one kg of a material at a plant. It is split into cost components: meat, ingredients, packaging, labour and other. Labour is direct labour plus indirect labour. The standard cost includes the cost of all BOM levels below the material.
_Avoid_: Standard price

**Top-level standard cost**:
The part of the standard cost that is added at the last production stage of a material. It does not include the standard cost of the materials from earlier stages. SAP shows it in report ZFI28N.

**STD Cost of Goods**:
The standard cost of the goods sold: meat, labour, ingredients, packaging and other. It does not include freight.
_Avoid_: Cost of sales, COS

**COGS**:
Cost of goods sold, including freight. STD Cost of Goods plus standard freight.

**Standard freight**:
The freight cost of a sale at standard.
_Avoid_: Freight

**Standard contribution**:
N.S.V. less standard cost less standard freight. The Sales margin layout includes the Other cost component. The Anaplan template does not. It is Unknown if the template must include Other.
_Avoid_: Contribution, margin, CM1

**Actual contribution**:
Standard contribution, plus sales adjustments, plus operational variances.
_Avoid_: Contribution, margin

## Variances

**Operational variance**:
The difference between the actual cost and the standard cost of a week. The groups are production variances, PPV, STK, OCI and freight and distribution variances.

**Production variance**:
A variance from how production used material, packaging and labour, against standard. It includes yield and labour efficiency. Production variance = consumption less production recovery, for each cost component. Consumption includes only the materials that the plant does not make.

**Production recovery**:
The standard cost of the production output of a week: output volume x top-level standard cost, for each cost component. It includes the output of all production stages.

**Yield**:
The difference between actual output and the output that standard expects from the input, at a price.

**PPV**:
Price variance. The difference between the price paid for materials, packaging or intersite transfers and their standard price.
_Avoid_: Purchase variance

**STK**:
Stock variance. Stock gains and losses from scrap, physical inventory, production cost variances and stock revaluation.

**OCI**:
Other costs and income. Operational variances that are not production variances, PPV or STK.

**Freight variance**:
Actual freight cost less standard freight.

## Overheads and result

**Overhead**:
A site cost that is not in standard cost and is not an operational variance. Examples are indirect wages, utilities and IT.

**Run rate**:
The average weekly cost of a GL line over a selected period. Site finance can override it with a comment.
_Avoid_: Default, baseline

**Recharges**:
The overhead line for costs that are recharged to the site. EBIT Excl MC assumes that Recharges are the management charges. This is Unknown.

**EBIT**:
Actual contribution less overheads. EBIT % is EBIT divided by total net revenue.

**EBIT Excl MC**:
EBIT before management charges.

**EBITDA**:
EBIT before depreciation.

## Headcount

**FTE**:
Full-time equivalent. A headcount in units of one full-time employee. The weekly P&L splits FTE into Direct and Indirect, and into Employed and Agency.

**Employed, Agency**:
An employed worker is on the site payroll. An agency worker is supplied by an agency.
