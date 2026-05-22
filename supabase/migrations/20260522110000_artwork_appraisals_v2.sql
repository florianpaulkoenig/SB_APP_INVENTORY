-- ============================================================================
-- Artwork Appraisals v2 — add provenance, sale record fields
-- ============================================================================

ALTER TABLE artwork_appraisals
  ADD COLUMN IF NOT EXISTS provenance    TEXT,
  ADD COLUMN IF NOT EXISTS sale_date     DATE,
  ADD COLUMN IF NOT EXISTS sale_price    NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS sale_currency TEXT DEFAULT 'CHF';
