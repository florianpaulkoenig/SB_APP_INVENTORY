-- Add optional free-text description to each floor plan file.
-- Used as a caption in the Exhibition Dossier PDF.
ALTER TABLE exhibition_floor_plans
  ADD COLUMN IF NOT EXISTS description TEXT;
