-- ============================================================================
-- NOA Liquidity — Projekte "On Hold"
-- A project on hold keeps all its positions but is excluded from every
-- projection: its unpaid positions appear in no month column, no balance
-- chain, no profit bar and no export. Positions that were already paid
-- remain real cash movements and keep counting. The flag is purely
-- descriptive — toggling it never touches the positions themselves.
-- ============================================================================

ALTER TABLE noa_liquidity_projects
  ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT false;
