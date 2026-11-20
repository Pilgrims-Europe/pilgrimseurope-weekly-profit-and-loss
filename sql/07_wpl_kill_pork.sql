-- Kill (pork) by provenance (detail for the app). Gui asked for the split on 2026-11-18.
-- Provenance is the Hellenic super category: Standard, ODB/RA, ODB/RA C, Link, F/R Hamps, Organic, R/B GOS.
-- "Killed Qty" and delivered come from the booking. TC'd pigs come from the lot. Both carry "idSuperCategory".
-- Hellenic has no Red Tractor field: "Farm Assured", "Quality Assured", "MandS Assured" and "VAN Assured" are all unused.
-- So Gui's labels (RT, ODB, Free Range, GOS, Organic) are not in the data. This view shows the Hellenic names.
-- Detail only. Unlike WPL_KILL_PORK, this view does not floor kill at 0 for a day, so the detail stays additive.
-- WPL_KILL_PORK is the one source for the kill figure.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_PORK_TYPE
COMMENT = 'Weekly P&L app: Kill (pork) by kill site, Est Kill Date and provenance (Hellenic super category). Detail only: no daily floor at 0, so it stays additive. WPL_KILL_PORK is the one source for kill.'
AS
WITH booking AS (
    SELECT *
    FROM PROD_RAW.HELLENIC."STG_PIG_BOOKING DETAIL__live"
    WHERE "Species" = 'PIGS'
      AND "Est Kill Date" >= '2024-12-30'
      AND UPPER("hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY "idBookingDetail" ORDER BY "hdr__timestamp" DESC) = 1
),
lot AS (
    SELECT "idLOT", "Participant Code", "Kill Date"::DATE AS KILL_DATE, "idSuperCategory"
    FROM PROD_RAW.HELLENIC."STG_PIG_LOT__live"
    WHERE "Species" = 'PIGS'
      AND "Kill Date" >= '2024-12-30'
      AND UPPER("hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY "idLOT" ORDER BY "hdr__timestamp" DESC) = 1
),
tc AS (
    SELECT t."idTransaction", t."idLOT"
    FROM PROD_RAW.HELLENIC."STG_PIG_TRANSACTIONS__live" t
    WHERE t."Species" = 'PIGS'
      AND t."Remark Code" = 1
      AND UPPER(t."hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY t."idTransaction" ORDER BY t."hdr__timestamp" DESC) = 1
),
factory AS (
    SELECT DISTINCT "idTransaction"
    FROM PROD_RAW.HELLENIC."STG_PIG_CONDEMNED PARTS__live"
    WHERE "Factory" = TRUE
      AND UPPER("hdr__operation") <> 'D'
),
super_category AS (
    SELECT "idSuperCategory", NULLIF(TRIM("Description"), '') AS SUPER_CATEGORY
    FROM PROD_RAW.HELLENIC."STG_PIG_SUPER CATEGORIES__live"
    WHERE UPPER("hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY "idSuperCategory" ORDER BY "hdr__timestamp" DESC) = 1
),
book_cat AS (
    SELECT
        s.SITE,
        b."Est Kill Date"::DATE                     AS KILL_DATE,
        COALESCE(c.SUPER_CATEGORY, 'NOT SET')       AS SUPER_CATEGORY,
        COUNT(*)                                    AS BOOKINGS,
        SUM(b."Delivered Qty")                      AS PIGS_DELIVERED,
        SUM(b."Killed Qty")                         AS KILLED_QTY
    FROM booking b
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.HELLENIC_CODE = b."Participant Code"
    LEFT JOIN super_category c ON c."idSuperCategory" = b."idSuperCategory"
    GROUP BY ALL
),
tc_cat AS (
    SELECT
        s.SITE,
        l.KILL_DATE,
        COALESCE(c.SUPER_CATEGORY, 'NOT SET')       AS SUPER_CATEGORY,
        COUNT_IF(f."idTransaction" IS NULL)         AS TC_PRODUCER_RESP,
        COUNT_IF(f."idTransaction" IS NOT NULL)     AS TC_FACTORY_RESP
    FROM tc
    JOIN lot l ON l."idLOT" = tc."idLOT"
    JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.HELLENIC_CODE = l."Participant Code"
    LEFT JOIN factory f ON f."idTransaction" = tc."idTransaction"
    LEFT JOIN super_category c ON c."idSuperCategory" = l."idSuperCategory"
    GROUP BY ALL
)
SELECT
    b.SITE,
    b.KILL_DATE,
    w.WEEK_START,
    b.SUPER_CATEGORY,
    b.BOOKINGS,
    b.PIGS_DELIVERED,
    b.KILLED_QTY,
    COALESCE(t.TC_PRODUCER_RESP, 0)                 AS TC_PRODUCER_RESP,
    COALESCE(t.TC_FACTORY_RESP, 0)                  AS TC_FACTORY_RESP,
    b.KILLED_QTY - COALESCE(t.TC_PRODUCER_RESP, 0) - COALESCE(t.TC_FACTORY_RESP, 0) AS PIGS_KILLED
FROM book_cat b
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON b.KILL_DATE BETWEEN w.WEEK_START AND w.WEEK_END
LEFT JOIN tc_cat t
       ON t.SITE = b.SITE
      AND t.KILL_DATE = b.KILL_DATE
      AND t.SUPER_CATEGORY = b.SUPER_CATEGORY;

-- Kill (pork), decided rule (research/kill-data.md, Decisions 2026-11-16):
-- Kill = pigs over scale less TC'd pigs, in head, by "Est Kill Date".
-- Pigs over scale = "Killed Qty" on the Hellenic booking. Week 45 check (2026-11-16): "Killed Qty" does not take off TC'd pigs,
-- so the view takes them off. Kill for a day is never below 0 (Killed Qty is not final on the kill day, it can be 0).
-- Detail: TC'd pigs (Remark Code 1). Factory resp. when a condemned parts row has "Factory" = TRUE, else producer resp.
-- The factory/producer split is the probable rule in research/kill-data.md (Gaps). It is not confirmed.
-- The Hellenic tables are CDC copies: keep the latest row for each key and drop deletes.
CREATE OR REPLACE VIEW DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_KILL_PORK
COMMENT = 'Weekly P&L app: Kill (pork) by kill site and Est Kill Date = Killed Qty (pigs over scale) less TC''d pigs. Detail: delivered, DOA, DIP, casualty, Killed Qty, TC''d producer resp. and factory resp.'
AS
WITH booking AS (
    SELECT *
    FROM PROD_RAW.HELLENIC."STG_PIG_BOOKING DETAIL__live"
    WHERE "Species" = 'PIGS'
      AND "Est Kill Date" >= '2024-12-30'
      AND UPPER("hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY "idBookingDetail" ORDER BY "hdr__timestamp" DESC) = 1
),
lot AS (
    SELECT "idLOT", "Participant Code", "Kill Date"::DATE AS KILL_DATE
    FROM PROD_RAW.HELLENIC."STG_PIG_LOT__live"
    WHERE "Species" = 'PIGS'
      AND "Kill Date" >= '2024-12-30'
      AND UPPER("hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY "idLOT" ORDER BY "hdr__timestamp" DESC) = 1
),
tc AS (
    SELECT t."idTransaction", t."idLOT"
    FROM PROD_RAW.HELLENIC."STG_PIG_TRANSACTIONS__live" t
    WHERE t."Species" = 'PIGS'
      AND t."Remark Code" = 1
      AND UPPER(t."hdr__operation") <> 'D'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY t."idTransaction" ORDER BY t."hdr__timestamp" DESC) = 1
),
factory AS (
    SELECT DISTINCT "idTransaction"
    FROM PROD_RAW.HELLENIC."STG_PIG_CONDEMNED PARTS__live"
    WHERE "Factory" = TRUE
      AND UPPER("hdr__operation") <> 'D'
),
tc_day AS (
    SELECT
        l."Participant Code"                            AS HELLENIC_CODE,
        l.KILL_DATE,
        COUNT_IF(f."idTransaction" IS NULL)             AS TC_PRODUCER_RESP,
        COUNT_IF(f."idTransaction" IS NOT NULL)         AS TC_FACTORY_RESP
    FROM tc
    JOIN lot l ON l."idLOT" = tc."idLOT"
    LEFT JOIN factory f ON f."idTransaction" = tc."idTransaction"
    GROUP BY ALL
),
book_day AS (
    SELECT
        "Participant Code"          AS HELLENIC_CODE,
        "Est Kill Date"::DATE       AS KILL_DATE,
        COUNT(*)                    AS BOOKINGS,
        SUM("Delivered Qty")        AS PIGS_DELIVERED,
        SUM("DOA")                  AS DOA,
        SUM("DIP")                  AS DIP,
        SUM("Casualty")             AS CASUALTY,
        SUM("Killed Qty")           AS KILLED_QTY
    FROM booking
    GROUP BY ALL
)
SELECT
    s.SITE,
    b.KILL_DATE,
    w.WEEK_START,
    b.BOOKINGS,
    b.PIGS_DELIVERED,
    b.DOA,
    b.DIP,
    b.CASUALTY,
    COALESCE(t.TC_PRODUCER_RESP, 0)     AS TC_PRODUCER_RESP,
    COALESCE(t.TC_FACTORY_RESP, 0)      AS TC_FACTORY_RESP,
    b.KILLED_QTY,
    GREATEST(b.KILLED_QTY - COALESCE(t.TC_PRODUCER_RESP, 0) - COALESCE(t.TC_FACTORY_RESP, 0), 0) AS PIGS_KILLED
FROM book_day b
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_SITE s ON s.HELLENIC_CODE = b.HELLENIC_CODE
JOIN DEV_ANALYTICS.FINANCE_PL_WEEKLY.WPL_WEEK w ON b.KILL_DATE BETWEEN w.WEEK_START AND w.WEEK_END
LEFT JOIN tc_day t ON t.HELLENIC_CODE = b.HELLENIC_CODE AND t.KILL_DATE = b.KILL_DATE;
