-- ---------------------------------------------------------------------------
-- NOA Inventory -- Add 'noa_curation' to portfolio CHECK constraints
-- ---------------------------------------------------------------------------
-- The portfolio discriminator column was originally constrained to
-- ('simon_berger', 'noa_collection'). This migration widens the constraint
-- on all affected tables to also allow 'noa_curation'.
-- ---------------------------------------------------------------------------

-- artworks
ALTER TABLE artworks DROP CONSTRAINT IF EXISTS artworks_portfolio_check;
ALTER TABLE artworks ADD CONSTRAINT artworks_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- deliveries
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_portfolio_check;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- catalogues
ALTER TABLE catalogues DROP CONSTRAINT IF EXISTS catalogues_portfolio_check;
ALTER TABLE catalogues ADD CONSTRAINT catalogues_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- viewing_rooms
ALTER TABLE viewing_rooms DROP CONSTRAINT IF EXISTS viewing_rooms_portfolio_check;
ALTER TABLE viewing_rooms ADD CONSTRAINT viewing_rooms_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- share_links
ALTER TABLE share_links DROP CONSTRAINT IF EXISTS share_links_portfolio_check;
ALTER TABLE share_links ADD CONSTRAINT share_links_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- exhibitions
ALTER TABLE exhibitions DROP CONSTRAINT IF EXISTS exhibitions_portfolio_check;
ALTER TABLE exhibitions ADD CONSTRAINT exhibitions_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));

-- artists
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_portfolio_check;
ALTER TABLE artists ADD CONSTRAINT artists_portfolio_check
  CHECK (portfolio IN ('simon_berger', 'noa_collection', 'noa_curation'));
