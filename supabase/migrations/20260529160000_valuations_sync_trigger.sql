-- ---------------------------------------------------------------------------
-- Valuation History: backfill + trigger
-- ---------------------------------------------------------------------------
-- Backfill: copy existing estimated_value/estimated_value_date from NOA artworks
-- into the valuations table, skipping artworks that already have valuation rows.

INSERT INTO valuations (artwork_id, user_id, value, currency, valuation_date, notes)
SELECT
  id,
  user_id,
  estimated_value,
  'CHF',
  estimated_value_date,
  'Erstbewertung Anlageinventar 2025'
FROM artworks
WHERE portfolio = 'noa_collection'
  AND estimated_value IS NOT NULL
  AND estimated_value_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM valuations v WHERE v.artwork_id = artworks.id
  );

-- ---------------------------------------------------------------------------
-- Trigger: keep artworks.estimated_value in sync with the latest valuation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_artwork_estimated_value_from_valuations()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.artwork_id, OLD.artwork_id);

  UPDATE artworks
  SET
    estimated_value      = (
      SELECT value
      FROM valuations
      WHERE artwork_id = target_id
      ORDER BY valuation_date DESC, created_at DESC
      LIMIT 1
    ),
    estimated_value_date = (
      SELECT valuation_date
      FROM valuations
      WHERE artwork_id = target_id
      ORDER BY valuation_date DESC, created_at DESC
      LIMIT 1
    )
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS trg_sync_artwork_estimated_value ON valuations;

CREATE TRIGGER trg_sync_artwork_estimated_value
AFTER INSERT OR UPDATE OR DELETE ON valuations
FOR EACH ROW EXECUTE FUNCTION sync_artwork_estimated_value_from_valuations();

-- ---------------------------------------------------------------------------
-- RLS: ensure admin has full access to valuations
-- ---------------------------------------------------------------------------

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'valuations'
      AND policyname = 'admin_all_valuations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY admin_all_valuations ON valuations
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    $policy$;
  END IF;
END $$;
