-- Line catalogue of the Anaplan weekly template (ticket #11).
-- One row for each line, in template order. RAG, source and reason are from reports/anaplan-line-tags.html.
-- RULE is the rule this build uses. For Amber lines it is a default until the open tickets are decided.
-- COMPONENTS (subtotals only): leaf LINE_IDs separated by spaces. A minus sign takes the line off.
-- RATIO_NUM / RATIO_DEN (ratio lines only): line IDs. RATIO_SCALE multiplies the denominator.
-- LAYOUT: 'Anaplan template' (the Weekly P&L and Week by week tabs) or 'Sales margin' (Gui's short P&L, the Sales margin tab).
-- DATA_FROM: the first week with source data. Earlier weeks show 'No data'. COPA actuals start in the week of 2025-04-21.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_LINE
COMMENT = 'Weekly P&L app: line catalogue of the Anaplan weekly template and the Sales margin layout, with source, RAG, reason and the rule used. Subtotal components, ratio parts, layout and first data week.'
AS
WITH template AS (
SELECT
    column1::NUMBER   AS LINE_ID,
    column2::TEXT     AS LINE_GROUP,
    column3::TEXT     AS LINE_NAME,
    column4::TEXT     AS SOURCE_TYPE,
    column5::TEXT     AS SOURCE_SYSTEM,
    column6::TEXT     AS RAG,
    column7::TEXT     AS REASON,
    column8::TEXT     AS RULE,
    column9::TEXT     AS UNIT,
    column10::TEXT    AS SITE_SCOPE,
    column11::TEXT    AS COMPONENTS,
    column12::NUMBER  AS RATIO_NUM,
    column13::NUMBER  AS RATIO_DEN,
    column14::NUMBER  AS RATIO_SCALE,
    column15::TEXT    AS TICKET,
    'Anaplan template' AS LAYOUT
FROM VALUES
-- Volume
(10,  'Volume', 'Kill Pig', 'System', 'Hellenic', 'Green', 'Kill (pork) rule decided in ticket #3.', 'Pigs over scale (Killed Qty on the Hellenic booking) less TC''d pigs, by Est Kill Date. Detail: TC''d producer resp. and factory resp.', 'head', 'PORK_KILL', NULL, NULL, NULL, NULL, '#48'),
(20,  'Volume', 'Kill Chicken', 'System', 'Mtech', 'Green', 'Kill (poultry) uses the Dungannon rule.', 'PLANTHDCOUNT less DOA, by kill date. Void loads out. Detail: condemnations (all codes), not taken off.', 'head', 'POULTRY_KILL', NULL, NULL, NULL, NULL, '#10'),
(30,  'Volume', 'Kill Lamb', 'System', 'HCS', 'Red', 'Research #33 is closed. The line is not built yet. The condemned rule is #36.', NULL, 'head', 'NONE', NULL, NULL, NULL, NULL, NULL),
(40,  'Volume', 'Sales Tonnage', 'System', 'COPA (FACT_COPAPEUS4)', 'Green', 'Intercompany rule decided in ticket #20.', 'Gold COPA actuals, edible kg, sold-to and ship-to not intercompany, by posting date.', 't', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(50,  'Volume', 'Sales Tonnage (Inedible)', 'System', 'COPA', 'Amber', 'The rule that finds inedible sales is Unknown.', 'Gold COPA actuals, EDIBLE_FLAG = Inedible, sold-to and ship-to not intercompany.', 't', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(60,  'Volume', 'Production Tonnage', 'System', 'SAP goods movements', 'Amber', 'Finished goods only. Site finance has not confirmed this rule.', 'Finished goods: SAP goods movements Z61 less Z62 on GL 5000100. Cases x material net weight.', 't', 'PILOT', NULL, NULL, NULL, NULL, '#35'),
-- External sales at standard
(110, 'External sales at standard', 'STD Ext NSV', 'System', 'COPA (NET_REVENUE)', 'Green', 'Intercompany rule decided in ticket #20.', 'Gold COPA NET_REVENUE_GBP_CALC, sold-to and ship-to not intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(120, 'External sales at standard', 'STD Ext Material Cost', 'System', 'COPA silver table', 'Amber', 'The cost split is only in the silver table.', 'Silver COPA COST_COMPONENT_MEAT + COST_COMPONENT_INGREDIENTS. Sold-to and ship-to not intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(130, 'External sales at standard', 'STD Ext Packaging', 'System', 'COPA silver table', 'Amber', 'The cost split is only in the silver table.', 'Silver COPA COST_COMPONENT_PACKAGING. Sold-to and ship-to not intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(140, 'External sales at standard', 'STD Ext Labour', 'System', 'COPA silver table', 'Amber', 'Silver table only. The labour cost components are not confirmed.', 'Silver COPA CC_COST005 + CC_COST009. Sold-to and ship-to not intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(150, 'External sales at standard', 'Total Ext Material Cost', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '120 130 140', NULL, NULL, NULL, NULL),
(160, 'External sales at standard', 'STD Ext Freight', 'System', 'COPA', 'Green', 'Standard freight field (ZUF2) decided in ticket #21.', 'Gold COPA FREIGHT_STAT_GBP_CALC (-CC_FREIGHT_ZUF2), sold-to and ship-to not intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#21'),
(170, 'External sales at standard', 'STD Ext Contribution', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '110 120 130 140 160', NULL, NULL, NULL, NULL),
(180, 'External sales at standard', 'Percentage Ext C/S', 'Subtotal', NULL, NULL, NULL, NULL, '%', 'PILOT', NULL, 170, 110, 1, NULL),
-- Internal sales (STO)
(210, 'Internal sales (STO)', 'Internal Sales Tonnage (STO)', 'System', 'SAP goods movements, COPA', 'Amber', 'Movement type 641 and the intercompany flag are in Snowflake. The STO rule is Unknown.', 'Cross-plant goods movements: 641 issue (credit) plus 642 reversal of an issue (debit S), base unit KG. Moves inside the plant are not STO (#86).', 't', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(220, 'Internal sales (STO)', 'STD Internal NSV', 'Calculation', 'STO kg, released standard cost', 'Amber', 'Depends on the STO rule.', 'STO kg x released standard TOTAL_COST per kg (transfer at standard cost).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(230, 'Internal sales (STO)', 'STD Int Material Cost', 'Calculation', 'STO kg, released standard cost', 'Amber', 'Depends on the STO rule.', 'STO kg x released standard (MEAT + INGREDIENTS) per kg.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(240, 'Internal sales (STO)', 'STD Int Packaging', 'Calculation', 'STO kg, released standard cost', 'Amber', 'Depends on the STO rule.', 'STO kg x released standard PACKAGING per kg.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(250, 'Internal sales (STO)', 'STD Int Labour', 'Calculation', 'STO kg, released standard cost', 'Amber', 'Depends on the STO rule.', 'STO kg x released standard (LABOR_DIRECT + LABOUR_INDIRECT) per kg.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#20'),
(260, 'Internal sales (STO)', 'Total Int Material Cost', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '230 240 250', NULL, NULL, NULL, NULL),
(270, 'Internal sales (STO)', 'STD Int Freight', 'Calculation', 'COPA', 'Amber', 'Standard freight is ZUF2 (#21). The STO lines use goods movements 641, so the link to the intercompany COPA rule (#20) is not confirmed.', 'Gold COPA FREIGHT_STAT_GBP_CALC where sold-to or ship-to is intercompany.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#21'),
(280, 'Internal sales (STO)', 'STD Int Contribution', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '220 230 240 250 270', NULL, NULL, NULL, NULL),
(290, 'Internal sales (STO)', 'Contribution Int £/Kg', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP/kg', 'PILOT', NULL, 280, 210, 1000, NULL),
-- Sales adjustments
(310, 'Sales adjustments', 'Credit Note Adj', 'Manual', 'Excel by email (central finance)', 'Red', 'Not in Snowflake.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(320, 'Sales adjustments', 'Price Corrections', 'Manual', 'Excel by email', 'Red', 'Not in Snowflake.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(330, 'Sales adjustments', 'Overrider Adj', 'Manual', 'Unknown', 'Red', 'Manual overrider adjustments are in the fog.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(340, 'Sales adjustments', 'Promotional Adj', 'Manual', 'Excel promotion workbooks', 'Red', 'Not in Snowflake.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(350, 'Sales adjustments', 'Total Sales Adjustments', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '310 320 330 340', NULL, NULL, NULL, NULL),
-- Production variances
(410, 'Production variances', 'Production Material Yield', 'Calculation', 'GL (5000295, 5000395, 5000435), goods movements', 'Amber', 'The variance method is in the fog.', 'GL material consumption (5000295, 5000395, 5000435, 5000490) plus production output credits at standard (5000035, 5000095, 5000100): actual less standard.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(420, 'Production variances', 'Substitution', 'Calculation', 'Arolink yield (FACTS_YIELD)', 'Amber', 'The variance method is in the fog.', 'No substitution field in FACTS_YIELD. Value is empty.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(430, 'Production variances', 'Slicing Material Yield', 'Calculation', 'Arolink yield (FACTS_YIELD)', 'Amber', 'The variance method is in the fog.', 'Arolink stage Slicing: (actual output kg - potential output kg) x PRICE_GBP.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(440, 'Production variances', 'Packaging Yield', 'Calculation', 'GL (5030210, 5030220, 5030230), released standard cost', 'Amber', 'The variance method is in the fog.', 'GL packaging consumption (all P&L group PACKAGING accounts not used by another line) less standard packaging of external and STO sales.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(450, 'Production variances', 'Labour Efficiency', 'Manual', 'Agency sheet, payroll', 'Red', 'The agency sheet is manual. Agency labour integration is out of scope.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(460, 'Production variances', 'Total Production Variances', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '410 420 430 440 450', NULL, NULL, NULL, NULL),
-- Price variances (PPV)
(510, 'Price variances (PPV)', 'Materials (PPV)', 'System', 'GL (5000800, 5000805, 5000810, 5000820, 5000895)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22).', 'GL line items, accounts 5000800, 5000805, 5000810, 5000820, 5000895.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(520, 'Price variances (PPV)', 'Packaging (PPV)', 'System', 'GL (5030025)', 'Green', 'GL line items, ledger 1L, by fiscal week.', 'GL line items, account 5030025.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(530, 'Price variances (PPV)', 'Traded Good (PPV)', 'System', 'GL', 'Amber', 'The stock revaluation accounts moved to Revaluation (STK) (#22). No traded good accounts are known.', 'GL accounts Unknown. Value is empty.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#22'),
(540, 'Price variances (PPV)', 'Agriculture Standard Cost Variance (PPV)', 'Manual', 'Airsoft, plan Excel', 'Red', 'Not in Snowflake. Not used at the pilot sites.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(550, 'Price variances (PPV)', 'Intersite Tfrs (PPV)', 'System', 'GL (5030050, 5000700, 5000705, 5000710)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22).', 'GL line items, accounts 5030050, 5000700, 5000705, 5000710.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(560, 'Price variances (PPV)', 'Total Price Variances', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '510 520 530 540 550', NULL, NULL, NULL, NULL),
-- Stock variances (STK)
(610, 'Stock variances (STK)', 'Materials (STK)', 'System', 'GL (5001000, 5001020, 5000500, 5000520, 5000900, 5000915, 5000995)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22). Gui gave no line for 5000915 and 5000995.', 'GL line items: scrap 5001000, 5001020; physical inventory 5000500, 5000520; production cost variance 5000900, 5000915, 5000995.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(620, 'Stock variances (STK)', 'Packaging (STK)', 'System', 'GL (5030070, 5030075, 5030030)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22).', 'GL line items: scrap 5030070, 5030075; production cost variance 5030030.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(630, 'Stock variances (STK)', 'WIP (STK)', 'System', 'GL (5001005, 5000505, 5000905)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22).', 'GL line items: scrap 5001005; physical inventory 5000505; production cost variance 5000905.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(640, 'Stock variances (STK)', 'F.Goods (STK)', 'System', 'GL (5001010, 5000510, 5000910)', 'Green', 'GL line items, ledger 1L, by fiscal week. Accounts confirmed by Gui (#22).', 'GL line items: scrap 5001010; physical inventory 5000510; production cost variance 5000910.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(645, 'Stock variances (STK)', 'Revaluation (STK)', 'System', 'GL (5000600, 5000605, 5000610, 5000615, 5000620, 5030060)', 'Green', 'New line from Gui''s PHASE 2 sheet (#22). It is not on the Anaplan weekly template.', 'GL line items, stock revaluation accounts 5000600, 5000605, 5000610, 5000615, 5000620, 5030060.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#22'),
(650, 'Stock variances (STK)', 'Total Stock Variances', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '610 620 630 640 645', NULL, NULL, NULL, NULL),
-- Other costs and income (OCI)
(710, 'Other costs and income (OCI)', 'Materials (OCI)', 'System', 'GL', 'Amber', 'The GL accounts are not confirmed.', 'GL accounts Unknown. Value is empty.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#22'),
(720, 'Other costs and income (OCI)', 'Packaging (OCI)', 'System', 'GL (5005100, 5900230, 7002990)', 'Amber', 'Gui confirmed the same accounts at both pilot sites and added 7002990 (#22). Fuel gas (5005100) is not confirmed.', 'GL line items, accounts 5005100, 5900230, 7002990.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#22'),
(730, 'Other costs and income (OCI)', 'WIP (OCI)', 'Unknown', 'Unknown', 'Red', 'Gui''s sheets give no source.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(740, 'Other costs and income (OCI)', 'F.Goods (OCI)', 'Manual', 'Excel', 'Red', 'Not in Snowflake.', NULL, 'GBP', 'NONE', NULL, NULL, NULL, NULL, NULL),
(750, 'Other costs and income (OCI)', 'Total Other Costs\\Income', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '710 720 730 740', NULL, NULL, NULL, NULL),
-- Freight and distribution variances
(810, 'Freight and distribution variances', 'Freight', 'Calculation', 'GL (5010000, 5012000), COPA', 'Green', 'Standard freight field (ZUF2) decided in ticket #21.', 'GL freight (5010000, 5010010, 5010020, 5010050) less STD Ext Freight.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#21'),
(820, 'Freight and distribution variances', 'Distribution', 'Calculation', 'COPA', 'Amber', 'Standard freight is ZUF2 (#21). STD Int Freight is not confirmed.', 'GL 5012000 (interco freight) less STD Int Freight.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#21'),
(830, 'Freight and distribution variances', 'Total Freight\\Dist Variances', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '810 820', NULL, NULL, NULL, NULL),
(840, 'Freight and distribution variances', 'Total Operational Variances', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '410 420 430 440 450 510 520 530 540 550 610 620 630 640 645 710 720 730 740 810 820', NULL, NULL, NULL, NULL),
(850, 'Freight and distribution variances', 'Total Net Revenue', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '110 220 310 320 330 340', NULL, NULL, NULL, NULL),
(860, 'Freight and distribution variances', 'Actual Contribution', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '110 120 130 140 160 220 230 240 250 270 310 320 330 340 410 420 430 440 450 510 520 530 540 550 610 620 630 640 645 710 720 730 740 810 820', NULL, NULL, NULL, NULL),
-- Overheads (run rate)
(910,  'Overheads', 'Indirect Wages/Salaries', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group INDIRECT WAGES/SALARIES.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(920,  'Overheads', 'Employee Benefits', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group EMPLOYEE BENEFITS.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(930,  'Overheads', 'Travel Costs', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group TRAVEL COSTS.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(940,  'Overheads', 'Utilities', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group UTILITIES.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(950,  'Overheads', 'Engineering Costs', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group ENGINEERING COSTS, 5297000 and 5297100 out (in Consumables).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(960,  'Overheads', 'Hire/Rental', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group HIRE/RENTAL.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(970,  'Overheads', 'Site Services', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group SITE SERVICES.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(980,  'Overheads', 'Information Technology', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group INFORMATION TECHNOLOGY.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(990,  'Overheads', 'Fees', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group FEES, recharge accounts out.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1000, 'Overheads', 'Consumables', 'System', 'GL', 'Green', 'Account list confirmed by Gui (#22). Weekly actual, not a run rate.', 'GL line items of the week: P&L group CONSUMABLES, plus 5297000 and 5297100 (moved from Engineering Costs).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#22'),
(1010, 'Overheads', 'Fleet Costs', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group FLEET COSTS.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1020, 'Overheads', 'Insurance', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group INSURANCE.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1030, 'Overheads', 'Marketing Costs', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group MARKETING COSTS, recharge accounts out.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1040, 'Overheads', 'Others', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, P&L group OTHER.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1050, 'Overheads', 'Depreciation', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog. Today the source is SAP report S_ALR_87012936, which is not in Snowflake.', 'Run rate: average of the 13 weeks before, P&L group DEPRECIATION.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1060, 'Overheads', 'Recharges', 'Manual', 'Run rate from GL', 'Amber', 'The run rate period is in the fog.', 'Run rate: average of the 13 weeks before, accounts flagged RECHARGES in the P&L app (management charges).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, NULL),
(1070, 'Overheads', 'Total Overheads', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '910 920 930 940 950 960 970 980 990 1000 1010 1020 1030 1040 1050 1060', NULL, NULL, NULL, NULL),
-- Result
(1110, 'Result', 'EBIT', 'Subtotal', NULL, NULL, NULL, NULL, 'GBP', 'PILOT', '110 120 130 140 160 220 230 240 250 270 310 320 330 340 410 420 430 440 450 510 520 530 540 550 610 620 630 640 645 710 720 730 740 810 820 910 920 930 940 950 960 970 980 990 1000 1010 1020 1030 1040 1050 1060', NULL, NULL, NULL, NULL),
(1120, 'Result', 'EBIT Excl MC', 'Subtotal', NULL, NULL, NULL, 'EBIT less Recharges. Assumption: the recharge accounts are the management charges.', 'GBP', 'PILOT', '110 120 130 140 160 220 230 240 250 270 310 320 330 340 410 420 430 440 450 510 520 530 540 550 610 620 630 640 645 710 720 730 740 810 820 910 920 930 940 950 960 970 980 990 1000 1010 1020 1030 1040 1050', NULL, NULL, NULL, NULL),
(1130, 'Result', 'EBITDA', 'Subtotal', NULL, NULL, NULL, 'EBIT less Depreciation.', 'GBP', 'PILOT', '110 120 130 140 160 220 230 240 250 270 310 320 330 340 410 420 430 440 450 510 520 530 540 550 610 620 630 640 645 710 720 730 740 810 820 910 920 930 940 950 960 970 980 990 1000 1010 1020 1030 1040 1060', NULL, NULL, NULL, NULL),
(1140, 'Result', 'EBIT %', 'Subtotal', NULL, NULL, NULL, 'EBIT / Total Net Revenue.', '%', 'PILOT', NULL, 1110, 850, 1, NULL),
-- Headcount
(1210, 'Headcount', 'Direct Employed FTE', 'Manual', 'Kronos, payroll', 'Red', 'Kronos is not researched.', NULL, 'FTE', 'NONE', NULL, NULL, NULL, NULL, NULL),
(1220, 'Headcount', 'Indirect Employed FTE', 'Manual', 'Kronos, payroll', 'Red', 'Kronos is not researched.', NULL, 'FTE', 'NONE', NULL, NULL, NULL, NULL, NULL),
(1230, 'Headcount', 'Direct Agency FTE', 'Manual', 'Agency sheet', 'Red', 'The agency sheet is manual.', NULL, 'FTE', 'NONE', NULL, NULL, NULL, NULL, NULL),
(1240, 'Headcount', 'Indirect Agency FTE', 'Manual', 'Agency sheet', 'Red', 'The agency sheet is manual.', NULL, 'FTE', 'NONE', NULL, NULL, NULL, NULL, NULL),
(1250, 'Headcount', 'Total FTE', 'Subtotal', NULL, NULL, NULL, NULL, 'FTE', 'PILOT', '1210 1220 1230 1240', NULL, NULL, NULL, NULL)
),
-- Sales margin layout (Gui, 2026-11-18). External sales only (intercompany out). Total KG is edible kg (#52).
-- All leaf lines are Amber until Gui signs them off (#50, #51, #52, #21).
margin AS (
SELECT
    column1::NUMBER, column2::TEXT, column3::TEXT, column4::TEXT, column5::TEXT, column6::TEXT, column7::TEXT, column8::TEXT,
    column9::TEXT, column10::TEXT, column11::TEXT, column12::NUMBER, column13::NUMBER, column14::NUMBER, column15::TEXT,
    'Sales margin'
FROM VALUES
(2010, 'Sales margin', 'Total KG', 'System', 'COPA (FACT_COPAPEUS4)', 'Amber', 'Which kg is Total KG is not signed off.', 'Gold COPA actuals SALES_KG where EDIBLE_FLAG = Edible, sold-to and ship-to not intercompany (Gui''s internal-site list, #20). The same kg as Sales Tonnage.', 'kg', 'PILOT', NULL, NULL, NULL, NULL, '#52'),
(2020, 'Sales margin', 'G.S.V.', 'System', 'COPA (FACT_COPAPEUS4)', 'Amber', 'The sales in the Sales margin layout are not signed off.', 'Gold COPA actuals GROSS_REVENUE_GBP_CALC, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#52'),
(2030, 'Sales margin', 'Gross Price/kg', 'Subtotal', NULL, NULL, NULL, 'G.S.V. / Total KG.', 'GBP/kg', 'PILOT', NULL, 2020, 2010, 1, NULL),
(2040, 'Sales margin', 'O.S.C', 'System', 'COPA (FACT_COPAPEUS4)', 'Amber', 'What O.S.C is, is not signed off. The FP&A draft manual says it is the promotional discount and overrider, without Overrider Adj.', 'Gold COPA actuals TOTAL_OSC_GBP_CALC, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20). G.S.V. + O.S.C = N.S.V.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#50'),
(2050, 'Sales margin', '% O.S.C', 'Subtotal', NULL, NULL, NULL, 'O.S.C / G.S.V.', '%', 'PILOT', NULL, 2040, 2020, 1, NULL),
(2060, 'Sales margin', 'N.S.V.', 'Subtotal', NULL, NULL, NULL, 'G.S.V. less O.S.C.', 'GBP', 'PILOT', '2020 2040', NULL, NULL, NULL, NULL),
(2070, 'Sales margin', 'Net Price/kg', 'Subtotal', NULL, NULL, NULL, 'N.S.V. / Total KG.', 'GBP/kg', 'PILOT', NULL, 2060, 2010, 1, NULL),
(2110, 'Sales margin', 'Meat', 'System', 'COPA silver table', 'Amber', 'The cost split is not signed off.', 'Silver COPA COST_COMPONENT_MEAT, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#51'),
(2120, 'Sales margin', 'Labour', 'System', 'COPA silver table', 'Amber', 'The cost split is not signed off. The labour cost components are not confirmed.', 'Silver COPA CC_COST005 + CC_COST009, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#51'),
(2130, 'Sales margin', 'Ingredients', 'System', 'COPA silver table', 'Amber', 'The cost split is not signed off.', 'Silver COPA COST_COMPONENT_INGREDIENTS, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#51'),
(2140, 'Sales margin', 'Packaging', 'System', 'COPA silver table', 'Amber', 'The cost split is not signed off.', 'Silver COPA COST_COMPONENT_PACKAGING, external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#51'),
(2150, 'Sales margin', 'Other', 'Calculation', 'COPA (gold and silver)', 'Amber', 'What Other holds is not signed off.', 'Gold COPA COS_GBP_CALC less Meat, Labour, Ingredients and Packaging. So STD Cost of Goods = COPA cost of sales.', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#51'),
(2160, 'Sales margin', 'STD Cost of Goods', 'Subtotal', NULL, NULL, NULL, 'Meat + Labour + Ingredients + Packaging + Other. Freight is not in it.', 'GBP', 'PILOT', '2110 2120 2130 2140 2150', NULL, NULL, NULL, NULL),
(2170, 'Sales margin', 'STD/kg', 'Subtotal', NULL, NULL, NULL, 'STD Cost of Goods / Total KG.', 'GBP/kg', 'PILOT', NULL, 2160, 2010, 1, NULL),
(2210, 'Sales margin', 'Freight', 'System', 'COPA (FACT_COPAPEUS4)', 'Amber', 'Standard freight field (ZUF2) decided in ticket #21.', 'Gold COPA FREIGHT_STAT_GBP_CALC (-CC_FREIGHT_ZUF2), external sales (sold-to and ship-to not intercompany, Gui''s internal-site list, #20).', 'GBP', 'PILOT', NULL, NULL, NULL, NULL, '#21'),
(2220, 'Sales margin', 'Freight/kg', 'Subtotal', NULL, NULL, NULL, 'Freight / Total KG.', 'GBP/kg', 'PILOT', NULL, 2210, 2010, 1, NULL),
(2230, 'Sales margin', 'Contribution', 'Subtotal', NULL, NULL, NULL, 'N.S.V. less STD Cost of Goods less Freight.', 'GBP', 'PILOT', '2020 2040 2110 2120 2130 2140 2150 2210', NULL, NULL, NULL, NULL),
(2240, 'Sales margin', 'Contribution/kg', 'Subtotal', NULL, NULL, NULL, 'Contribution / Total KG.', 'GBP/kg', 'PILOT', NULL, 2230, 2010, 1, NULL),
(2250, 'Sales margin', '% Contribution', 'Subtotal', NULL, NULL, NULL, 'Contribution / N.S.V.', '%', 'PILOT', NULL, 2230, 2060, 1, NULL)
)
SELECT
    l.*,
    IFF(l.SOURCE_TYPE <> 'Subtotal'
        AND (l.LAYOUT = 'Sales margin' OR l.LINE_ID IN (40, 50, 110, 120, 130, 140, 160, 270, 440, 810, 820)),
        '2025-04-21'::DATE, NULL) AS DATA_FROM
FROM (SELECT * FROM template UNION ALL SELECT * FROM margin) l;
