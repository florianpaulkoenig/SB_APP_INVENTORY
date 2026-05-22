-- ============================================================================
-- Artwork Appraisals
-- Stores formal appraisal documents for insurance, resale, estate, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS artwork_appraisals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id            UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  appraisal_number      TEXT NOT NULL,
  appraised_value       NUMERIC(14,2) NOT NULL CHECK (appraised_value > 0),
  currency              TEXT NOT NULL DEFAULT 'CHF',
  appraisal_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose               TEXT NOT NULL DEFAULT 'insurance'
                          CHECK (purpose IN ('insurance', 'resale', 'estate', 'donation', 'other')),
  appraiser_name        TEXT NOT NULL DEFAULT 'NOA Contemporary',
  appraiser_credentials TEXT,
  condition             TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE artwork_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages artwork_appraisals"
  ON artwork_appraisals FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (SELECT auth.uid())) = 'admin'
  );
