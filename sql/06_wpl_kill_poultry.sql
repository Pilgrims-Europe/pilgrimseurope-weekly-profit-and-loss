-- Kill (poultry), decided rule (research/kill-data.md, Decisions):
-- birds delivered (PLANTHDCOUNT) less DOA. Void loads out. Dungannon rule for all sites.
-- Condemnations (all Mtech codes) are shown as detail. They are not taken off kill (changed 2026-11-17).
-- Delivered and DOA use the same source and filters as MTECH_BIRDKILL (broiler loads, by EVENTDATE).

-- Condemnations by site, kill date and code (detail for the app).
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_POULTRY_CODE
COMMENT = 'Weekly P&L app: Mtech condemnation head by kill site, kill date and condemnation code. Void lots out.'
AS
SELECT
    s.SITE,
    t.EVENTDATE::DATE           AS KILL_DATE,
    w.WEEK_START,
    c.CONDEMNATIONNO            AS CODE,
    c.CONDEMNATIONNAME          AS CODE_NAME,
    c.CALCULATIONCATEGORY,
    SUM(x.HEAD)                 AS HEAD
FROM PROD_RAW.MTECH.PMTSCONDEMNTRANS t
JOIN PROD_RAW.MTECH.PROTEINFACILITYPLANTS p ON p.IRN = t.PROTEINFACILITYPLANTSIRN
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.MTECH_PLANT = p.PLANTNO
JOIN PROD_RAW.MTECH.PMTSCONDEMNTRANSDETAILS x ON x.PMTSCONDEMNTRANSIRN = t.IRN
JOIN PROD_RAW.MTECH.PMTSCONDEMNATIONS c ON c.IRN = x.PMTSCONDEMNATIONSIRN
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON t.EVENTDATE::DATE BETWEEN w.WEEK_START AND w.WEEK_END
WHERE NOT COALESCE(t.VOIDFLAG, FALSE)
GROUP BY ALL;

-- Kill by site and kill date.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_POULTRY
COMMENT = 'Weekly P&L app: Kill (poultry) by kill site and kill date = PLANTHDCOUNT - DOA. CONDEMNED (all codes) is detail only, not taken off. Broiler loads, void loads out.'
AS
WITH delivered AS (
    SELECT
        s.SITE,
        r.EVENTDATE::DATE       AS KILL_DATE,
        COUNT(*)                AS LOADS,
        SUM(r.PLANTHDCOUNT)     AS BIRDS_DELIVERED,
        SUM(r.DOA)              AS DOA
    FROM PROD_RAW.MTECH.MVPMTSPROCRECVTRANSHOUSEDETAIL r
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.MTECH_PLANT = r.PLANTNO
    WHERE r.SPECIESTYPE = 1
      AND r.BIRDTYPE = 3
      AND NOT r.VOIDFLAG
      AND r.EVENTDATE >= '2025-12-29'
    GROUP BY ALL
),
condemned AS (
    SELECT SITE, KILL_DATE, SUM(HEAD) AS CONDEMNED
    FROM DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_POULTRY_CODE
    GROUP BY ALL
)
SELECT
    d.SITE,
    d.KILL_DATE,
    w.WEEK_START,
    d.LOADS,
    d.BIRDS_DELIVERED,
    d.DOA,
    COALESCE(c.CONDEMNED, 0)                                AS CONDEMNED,
    d.BIRDS_DELIVERED - d.DOA                               AS BIRDS_KILLED
FROM delivered d
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON d.KILL_DATE BETWEEN w.WEEK_START AND w.WEEK_END
LEFT JOIN condemned c ON c.SITE = d.SITE AND c.KILL_DATE = d.KILL_DATE;
