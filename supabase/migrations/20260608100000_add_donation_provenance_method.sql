-- Add 'donation' to artwork_provenance acquisition_method CHECK constraint
ALTER TABLE artwork_provenance
  DROP CONSTRAINT IF EXISTS artwork_provenance_acquisition_method_check;

ALTER TABLE artwork_provenance
  ADD CONSTRAINT artwork_provenance_acquisition_method_check
  CHECK (acquisition_method IN (
    'creation', 'gallery_sale', 'auction', 'private_sale',
    'gift', 'inheritance', 'donation', 'other'
  ));
