-- ---------------------------------------------------------------------------
-- NOA Liquidity — expense payment tracking
-- Tracks which expense instance (expense_id + year + month) has been paid.
-- Recurring expenses generate one row per month when marked paid.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noa_liquidity_expense_payments (
  id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id  UUID         NOT NULL REFERENCES noa_liquidity_expenses(id) ON DELETE CASCADE,
  year        INTEGER      NOT NULL,
  month       INTEGER      NOT NULL CHECK (month BETWEEN 1 AND 12),  -- 1-indexed
  paid_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expense_id, year, month)
);

ALTER TABLE noa_liquidity_expense_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expense payments" ON noa_liquidity_expense_payments;
CREATE POLICY "Users manage own expense payments"
  ON noa_liquidity_expense_payments
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin full access
DROP POLICY IF EXISTS "Admins manage all expense payments" ON noa_liquidity_expense_payments;
CREATE POLICY "Admins manage all expense payments"
  ON noa_liquidity_expense_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_noa_liquidity_expense_payments_user
  ON noa_liquidity_expense_payments (user_id);

CREATE INDEX IF NOT EXISTS idx_noa_liquidity_expense_payments_expense
  ON noa_liquidity_expense_payments (expense_id);
