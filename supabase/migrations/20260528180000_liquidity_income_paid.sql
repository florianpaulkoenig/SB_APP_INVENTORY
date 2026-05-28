-- ---------------------------------------------------------------------------
-- Add paid_at to noa_liquidity_income
-- NULL  = unpaid / pending
-- value = timestamp when marked as paid
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
