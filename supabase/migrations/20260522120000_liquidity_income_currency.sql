-- Add currency column to noa_liquidity_income
ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CHF';
