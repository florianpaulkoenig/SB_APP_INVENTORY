-- ---------------------------------------------------------------------------
-- Effective account balance (Konto-Saldo) on noa_liquidity_settings
--   User enters the real bank balance; the app shows the difference to the
--   computed Tagessaldo until it is accepted (startsaldo correction) or the
--   discrepancy is resolved.
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_settings
  ADD COLUMN IF NOT EXISTS effective_balance      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS effective_balance_date DATE;
