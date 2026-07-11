-- ---------------------------------------------------------------------------
-- Provisional flag on liquidity income & expenses
--   Provisional items are excluded from the definitive liquidity curve and
--   only appear in the provisional (dashed) curve.
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS provisional BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE noa_liquidity_expenses
  ADD COLUMN IF NOT EXISTS provisional BOOLEAN NOT NULL DEFAULT false;
