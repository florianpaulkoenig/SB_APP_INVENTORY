-- ---------------------------------------------------------------------------
-- Liquidity balance tracking
-- 1. Add currency to settings table
-- 2. Add currency to income table (was missing from original migration)
-- 3. Create actual monthly balances table for Ist-Saldo verification
-- ---------------------------------------------------------------------------

-- 1. Currency on settings (startsaldo is in this currency)
ALTER TABLE noa_liquidity_settings
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CHF';

-- 2. Currency on income entries
ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CHF';

-- 3. Actual monthly balances (Ist-Saldo per Monatsende)
CREATE TABLE IF NOT EXISTS noa_liquidity_actual_balances (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  month       INT NOT NULL,   -- 1-indexed (1 = Januar, 12 = Dezember)
  balance     NUMERIC(14,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'CHF',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year, month)
);

ALTER TABLE noa_liquidity_actual_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages noa_liquidity_actual_balances" ON noa_liquidity_actual_balances;
CREATE POLICY "Admin manages noa_liquidity_actual_balances"
  ON noa_liquidity_actual_balances FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (SELECT auth.uid())) = 'admin'
  );
