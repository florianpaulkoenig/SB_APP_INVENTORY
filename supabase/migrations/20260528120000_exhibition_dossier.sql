-- Exhibition dossier: add description_text field + floor plans table
-- description_text: public exhibition statement that appears in the dossier PDF
ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS description_text TEXT;

-- Floor plans: PDF or image files uploaded per exhibition
CREATE TABLE IF NOT EXISTS exhibition_floor_plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibition_id UUID        NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exhibition_floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages exhibition_floor_plans"
  ON exhibition_floor_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
