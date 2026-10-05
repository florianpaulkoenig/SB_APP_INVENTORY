-- ============================================================================
-- Exhibitions & art fairs — status
-- Manual lifecycle status per exhibition. The app derives the display phase
-- from status + dates (confirmed → upcoming / running / completed).
--   idea       under consideration, nothing requested yet
--   requested  application sent / in negotiation
--   confirmed  participation is fixed (default — all existing rows)
--   cancelled  was confirmed, then called off
--   declined   not taking part (rejected or turned down)
-- Cancelled / declined exhibitions are excluded from the annual schedule,
-- analytics (impact, career, dashboard, fair optimizer) and reminders.
-- ============================================================================

ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

ALTER TABLE exhibitions DROP CONSTRAINT IF EXISTS exhibitions_status_check;
ALTER TABLE exhibitions
  ADD CONSTRAINT exhibitions_status_check
  CHECK (status IN ('idea', 'requested', 'confirmed', 'cancelled', 'declined'));

CREATE INDEX IF NOT EXISTS exhibitions_user_status_idx
  ON exhibitions (user_id, status);
