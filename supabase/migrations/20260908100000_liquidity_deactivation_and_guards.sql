-- ============================================================================
-- NOA Liquidity — Deaktivierung gilt "ab jetzt" + zwei Absicherungen
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. deactivated_at: ab wann eine wiederkehrende Ausgabe nicht mehr anfällt
--    Deaktivieren soll NUR ab jetzt gelten — offene Altfälligkeiten bleiben
--    als überfällig stehen. Bestandszeilen bleiben NULL und behalten damit
--    das bisherige Verhalten (gelten nirgends); die neue Semantik greift für
--    jede Deaktivierung ab jetzt.
-- ---------------------------------------------------------------------------
ALTER TABLE noa_liquidity_expenses
  ADD COLUMN IF NOT EXISTS deactivated_at DATE;

COMMENT ON COLUMN noa_liquidity_expenses.deactivated_at IS
  'Datum der Deaktivierung. Instanzen mit Fälligkeit davor gelten weiter (auch als überfällig), spätere nicht mehr. NULL bei aktiven Zeilen und bei vor 2026-09 deaktivierten Altzeilen.';

-- ---------------------------------------------------------------------------
-- 2. due_date NOT NULL — eine Ausgabe ohne Fälligkeitsdatum kann in keinem
--    Monat erscheinen und ist damit dauerhaft unsichtbar.
-- ---------------------------------------------------------------------------
UPDATE noa_liquidity_expenses
   SET due_date = COALESCE(created_at::date, CURRENT_DATE)
 WHERE due_date IS NULL;

ALTER TABLE noa_liquidity_expenses
  ALTER COLUMN due_date SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Admin-Policy auf den Zahlungen reparierte Spalte: user_profiles.user_id
--    ist die auth-Id, user_profiles.id nicht. Bisher fail-closed.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage all expense payments" ON noa_liquidity_expense_payments;
CREATE POLICY "Admins manage all expense payments"
  ON noa_liquidity_expense_payments
  FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );
