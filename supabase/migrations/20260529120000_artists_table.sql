-- Artists table for multi-artist portfolios (e.g. NOA Collection)
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio TEXT NOT NULL DEFAULT 'noa_collection' CHECK (portfolio IN ('simon_berger', 'noa_collection')),
  name TEXT NOT NULL,
  nationality TEXT,
  birth_year INTEGER,
  biography TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_portfolio ON artists(portfolio);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to artists"
  ON artists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Link artworks to artists (nullable — SB artworks stay null)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES artists(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
