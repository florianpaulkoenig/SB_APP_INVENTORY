-- ---------------------------------------------------------------------------
-- Saldokorrekturen — final, dated bank-balance snapshots
--   Accepting a reconciliation difference creates a correction instead of
--   overwriting the Startsaldo. The latest correction anchors the Tagessaldo;
--   everything older is locked in the UI.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noa_liquidity_balance_corrections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correction_date DATE NOT NULL,
  balance         NUMERIC(14,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'CHF',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, correction_date)
);

ALTER TABLE noa_liquidity_balance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages noa_liquidity_balance_corrections"
  ON noa_liquidity_balance_corrections FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );
