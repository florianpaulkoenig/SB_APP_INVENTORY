-- ---------------------------------------------------------------------------
-- Invoice number on liquidity income & expenses
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

ALTER TABLE noa_liquidity_expenses
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;
