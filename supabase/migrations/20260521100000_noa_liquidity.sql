-- ============================================================================
-- NOA Liquidity Feature
-- Adds expected payment dates to sales + production orders,
-- plus three new tables: settings (starting balance), expenses, special income.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_expected_date DATE;

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS payment_expected_date DATE;

-- ---------------------------------------------------------------------------
-- 2. NOA starting balance settings (one row per user)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noa_liquidity_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
  starting_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE noa_liquidity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages noa_liquidity_settings"
  ON noa_liquidity_settings FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 3. Manual expenses (fixed monthly or one-time)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noa_liquidity_expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL CHECK (type IN ('fixed', 'one_time')),
  -- fixed: active=true means it recurs every month
  active      BOOLEAN NOT NULL DEFAULT true,
  -- one_time: the specific month's first day (e.g. 2026-06-01)
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE noa_liquidity_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages noa_liquidity_expenses"
  ON noa_liquidity_expenses FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- 4. Manual / special income entries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noa_liquidity_income (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expected_date DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE noa_liquidity_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages noa_liquidity_income"
  ON noa_liquidity_income FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );
