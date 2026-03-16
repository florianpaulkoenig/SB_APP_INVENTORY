-- ---------------------------------------------------------------------------
-- Exhibition Images table
-- Stores photos uploaded to exhibitions / art fairs (installation views,
-- booth shots, etc.). Same pattern as artwork_images.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exhibition_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by exhibition
CREATE INDEX idx_exhibition_images_exhibition_id ON exhibition_images(exhibition_id);

-- Enable RLS
ALTER TABLE exhibition_images ENABLE ROW LEVEL SECURITY;

-- Admin: full CRUD (same pattern as other admin policies)
CREATE POLICY "admin_full_access_exhibition_images"
  ON exhibition_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- Authenticated users (gallery/collector): read-only
CREATE POLICY "authenticated_read_exhibition_images"
  ON exhibition_images
  FOR SELECT
  USING (auth.role() = 'authenticated');
