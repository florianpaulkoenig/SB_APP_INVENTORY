-- ---------------------------------------------------------------------------
-- NOA Liquidity — storno of single expense instances
-- A payment row with skipped = true means: this instance (expense + year +
-- month) was cancelled. It is treated as resolved (not überfällig, hidden
-- from the month) but does NOT count as a cash movement.
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_expense_payments
  ADD COLUMN IF NOT EXISTS skipped BOOLEAN NOT NULL DEFAULT false;
