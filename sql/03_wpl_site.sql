-- Sites in the weekly P&L app.
-- PILOT sites get the P&L lines. Kill sites get the kill lines only (the pilot sites do not kill).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE
COMMENT = 'Weekly P&L app: sites with their kind (PILOT, POULTRY_KILL, PORK_KILL) and source keys (profit centre, plant, Mtech plant, Hellenic participant code).'
AS
SELECT
    column1::TEXT AS SITE,
    column2::TEXT AS SITE_KIND,
    column3::TEXT AS PROFIT_CENTER,
    column4::TEXT AS PLANT,
    column5::TEXT AS MTECH_PLANT,
    column6::TEXT AS HELLENIC_CODE,
    column7::NUMBER AS SITE_ORDER
FROM VALUES
    ('Redruth',     'PILOT',        'PRED01', '2504', NULL,  NULL,  1),
    ('Bromborough', 'PILOT',        'PBRO01', '2506', NULL,  NULL,  2),
    ('Anwick',      'POULTRY_KILL', NULL,     NULL,   'S11', NULL,  3),
    ('Ashbourne',   'POULTRY_KILL', NULL,     NULL,   'S10', NULL,  4),
    ('Dungannon',   'POULTRY_KILL', NULL,     NULL,   'S01', NULL,  5),
    ('Spalding',    'PORK_KILL',    NULL,     NULL,   NULL,  '001', 6),
    ('Westerleigh', 'PORK_KILL',    NULL,     NULL,   NULL,  '003', 7);
