-- ============================================================================
-- NOA Liquidity — Projekte
-- Groups related income & expense positions (e.g. a commissioned artwork:
-- Anzahlung, Abschlusszahlung, Transporteinnahme, Transportkosten, Zahlung
-- Künstler) under one project. Deleting the project cascades to all its
-- positions; each position stays individually payable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS noa_liquidity_projects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE noa_liquidity_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages noa_liquidity_projects" ON noa_liquidity_projects;
CREATE POLICY "Admin manages noa_liquidity_projects"
  ON noa_liquidity_projects FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

-- Link income & expenses to a project (nullable — standalone entries stay as-is)
ALTER TABLE noa_liquidity_income
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES noa_liquidity_projects(id) ON DELETE CASCADE;

ALTER TABLE noa_liquidity_expenses
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES noa_liquidity_projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_noa_liquidity_income_project
  ON noa_liquidity_income (project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_noa_liquidity_expenses_project
  ON noa_liquidity_expenses (project_id) WHERE project_id IS NOT NULL;
