-- ---------------------------------------------------------------------------
-- Catalogue links: gallery, contact, exhibition
-- ---------------------------------------------------------------------------

ALTER TABLE catalogues
  ADD COLUMN IF NOT EXISTS gallery_id    UUID REFERENCES galleries(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id    UUID REFERENCES contacts(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES exhibitions(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_catalogues_gallery_id    ON catalogues(gallery_id);
CREATE INDEX IF NOT EXISTS idx_catalogues_contact_id    ON catalogues(contact_id);
CREATE INDEX IF NOT EXISTS idx_catalogues_exhibition_id ON catalogues(exhibition_id);

NOTIFY pgrst, 'reload schema';
