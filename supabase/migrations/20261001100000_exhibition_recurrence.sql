-- Annually recurring art fairs: once an edition has ended, the app asks for
-- next year's dates and whether the artist will exhibit again.
ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS recurs_annually BOOLEAN NOT NULL DEFAULT false,
  -- set once the follow-up prompt for this edition has been answered
  -- (next edition created, or declined) so it is never asked twice
  ADD COLUMN IF NOT EXISTS recurrence_resolved_at TIMESTAMPTZ,
  -- the edition created from this one (null when declined / not yet asked)
  ADD COLUMN IF NOT EXISTS successor_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exhibitions_recurrence_pending_idx
  ON exhibitions (user_id, end_date)
  WHERE recurs_annually AND recurrence_resolved_at IS NULL;
