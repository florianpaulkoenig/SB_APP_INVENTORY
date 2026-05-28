-- Add photo_type column to exhibition_images.
-- 'exhibition' = installation view / artwork photo (default)
-- 'venue'      = venue space photo (no artwork shown)
ALTER TABLE exhibition_images
  ADD COLUMN IF NOT EXISTS photo_type TEXT NOT NULL DEFAULT 'exhibition';
