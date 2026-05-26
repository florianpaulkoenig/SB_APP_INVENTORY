-- ---------------------------------------------------------------------------
-- Artwork Provenance / Owner tracking
-- Stores the chain of ownership for each artwork, starting with the artist
-- and including the selling gallery, then subsequent collectors.
-- ---------------------------------------------------------------------------

CREATE TABLE artwork_provenance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id    UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  owner_name    TEXT NOT NULL,
  owner_type    TEXT NOT NULL DEFAULT 'collector'
                  CHECK (owner_type IN ('artist', 'gallery', 'collector', 'institution', 'other')),
  acquisition_date   DATE,
  acquisition_method TEXT
                  CHECK (acquisition_method IN ('creation', 'gallery_sale', 'auction', 'private_sale', 'gift', 'inheritance', 'other')),
  notes         TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  confirmed     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artwork_provenance_artwork_id ON artwork_provenance(artwork_id);
CREATE INDEX idx_artwork_provenance_user_id    ON artwork_provenance(user_id);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON artwork_provenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE artwork_provenance ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access to artwork_provenance"
  ON artwork_provenance FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Gallery: read-only (for their own artworks via gallery_id)
CREATE POLICY "Gallery can read provenance for their artworks"
  ON artwork_provenance FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gallery'
    AND EXISTS (
      SELECT 1 FROM artworks a
      JOIN galleries g ON g.id = a.gallery_id
      WHERE a.id = artwork_provenance.artwork_id
        AND g.user_id = auth.uid()
    )
  );
