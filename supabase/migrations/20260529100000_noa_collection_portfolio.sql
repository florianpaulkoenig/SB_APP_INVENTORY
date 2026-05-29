-- ============================================================================
-- NOA Collection Portfolio
--
-- Adds a `portfolio` discriminator to the 6 tables shared between
-- Simon Berger inventory and NOA Collection inventory.
-- All existing rows automatically receive 'simon_berger' via DEFAULT —
-- no data is deleted or modified.
--
-- Also adds Anlageverwaltung fields to artworks (all nullable, so existing
-- Simon Berger artworks are unaffected).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add portfolio column to shared tables
-- ----------------------------------------------------------------------------

ALTER TABLE artworks
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

ALTER TABLE catalogues
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

ALTER TABLE viewing_rooms
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

ALTER TABLE share_links
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS portfolio TEXT NOT NULL DEFAULT 'simon_berger'
    CHECK (portfolio IN ('simon_berger', 'noa_collection'));

-- ----------------------------------------------------------------------------
-- 2. Indexes for query performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_artworks_portfolio      ON artworks(portfolio);
CREATE INDEX IF NOT EXISTS idx_deliveries_portfolio    ON deliveries(portfolio);
CREATE INDEX IF NOT EXISTS idx_catalogues_portfolio    ON catalogues(portfolio);
CREATE INDEX IF NOT EXISTS idx_viewing_rooms_portfolio ON viewing_rooms(portfolio);
CREATE INDEX IF NOT EXISTS idx_share_links_portfolio   ON share_links(portfolio);
CREATE INDEX IF NOT EXISTS idx_exhibitions_portfolio   ON exhibitions(portfolio);

-- ----------------------------------------------------------------------------
-- 3. Anlageverwaltung fields on artworks (nullable — no impact on existing data)
-- ----------------------------------------------------------------------------

ALTER TABLE artworks
  ADD COLUMN IF NOT EXISTS purchase_price      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS purchase_currency   TEXT DEFAULT 'CHF',
  ADD COLUMN IF NOT EXISTS purchase_date       DATE,
  ADD COLUMN IF NOT EXISTS estimated_value     NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS estimated_value_date DATE;

-- ----------------------------------------------------------------------------
-- 4. Verify — these counts should match total rows in each table
-- (all existing rows are now tagged as 'simon_berger')
-- ----------------------------------------------------------------------------

-- SELECT 'artworks'     AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM artworks;
-- SELECT 'deliveries'   AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM deliveries;
-- SELECT 'catalogues'   AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM catalogues;
-- SELECT 'viewing_rooms' AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM viewing_rooms;
-- SELECT 'share_links'  AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM share_links;
-- SELECT 'exhibitions'  AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE portfolio = 'simon_berger') AS sb FROM exhibitions;
