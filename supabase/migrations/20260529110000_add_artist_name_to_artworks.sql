-- Add artist_name column to artworks (nullable, for multi-artist portfolios like NOA Collection)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_name TEXT;

CREATE INDEX IF NOT EXISTS idx_artworks_artist_name ON artworks(artist_name);
