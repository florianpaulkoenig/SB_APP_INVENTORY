-- ---------------------------------------------------------------------------
-- Precise Startsaldo anchor timestamp
--   The Tagessaldo counts every payment marked AFTER the Startsaldo was set;
--   the DATE column lacks time precision (same-day accepts would double-count).
-- ---------------------------------------------------------------------------

ALTER TABLE noa_liquidity_settings
  ADD COLUMN IF NOT EXISTS starting_balance_at TIMESTAMPTZ;

-- Backfill from the existing date column (start of day)
UPDATE noa_liquidity_settings
SET starting_balance_at = starting_balance_date::timestamptz
WHERE starting_balance_at IS NULL;
