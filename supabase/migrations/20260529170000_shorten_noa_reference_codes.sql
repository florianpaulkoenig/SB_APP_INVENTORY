-- Shorten NOA Collection reference codes from "NOA-NC-NOA0124" to "NC-NOA0124"
-- The double "NOA" was redundant (portfolio prefix + inventory number prefix).
-- Already applied directly on 2026-05-29; kept here for version history.

-- (Applied via direct query with trigger temporarily disabled)
-- ALTER TABLE artworks DISABLE TRIGGER protect_reference_code;
-- UPDATE artworks SET reference_code = REPLACE(reference_code, 'NOA-NC-', 'NC-')
-- WHERE portfolio = 'noa_collection' AND reference_code LIKE 'NOA-NC-%';
-- ALTER TABLE artworks ENABLE TRIGGER protect_reference_code;
