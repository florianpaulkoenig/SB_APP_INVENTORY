-- ---------------------------------------------------------------------------
-- Migrate legacy SB-IMP-* reference codes to NOA-SB-YYYY-XXXX format
-- Affects artworks imported via the 2026 bulk-import and PDF-invoice migrations.
-- ---------------------------------------------------------------------------

-- 1. Temporarily drop the immutability trigger so we can rewrite old codes.
DROP TRIGGER IF EXISTS protect_reference_code ON artworks;

-- 2. Helper function that produces a random 4-char suffix matching
--    the same character set as the front-end generateArtworkRefCode():
--      letters = ABCDEFGHJKLMNPQRSTUVWXYZ  (23 chars, no I O)
--      digits  = 23456789                   (8 chars,  no 0 1)
--    Pattern: letter-digit-letter-digit  e.g. "K7M2"
CREATE OR REPLACE FUNCTION _gen_noa_ref_suffix()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  letters TEXT[] := ARRAY['A','B','C','D','E','F','G','H','J','K','L','M',
                           'N','P','Q','R','S','T','U','V','W','X','Y','Z'];
  digits  TEXT[] := ARRAY['2','3','4','5','6','7','8','9'];
BEGIN
  RETURN
    letters[floor(random() * 23 + 1)::int] ||
    digits [floor(random() * 8  + 1)::int] ||
    letters[floor(random() * 23 + 1)::int] ||
    digits [floor(random() * 8  + 1)::int];
END;
$$;

-- 3. Reassign each SB-IMP-* artwork a unique NOA-SB-YYYY-XXXX code.
--    Year is taken from the artwork's own creation year (the `year` column),
--    falling back to the record's created_at year when year is NULL.
DO $$
DECLARE
  r        RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR r IN
    SELECT id,
           COALESCE(year, EXTRACT(YEAR FROM created_at)::int) AS ref_year
    FROM   artworks
    WHERE  reference_code LIKE 'SB-IMP-%'
    ORDER  BY reference_code
  LOOP
    attempts := 0;
    LOOP
      new_code := 'NOA-SB-' || r.ref_year || '-' || _gen_noa_ref_suffix();

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM artworks WHERE reference_code = new_code
      );

      attempts := attempts + 1;
      IF attempts > 200 THEN
        RAISE EXCEPTION 'Could not generate a unique reference code for artwork % after 200 attempts', r.id;
      END IF;
    END LOOP;

    UPDATE artworks SET reference_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4. Remove the helper function.
DROP FUNCTION IF EXISTS _gen_noa_ref_suffix();

-- 5. Restore the immutability trigger.
CREATE TRIGGER protect_reference_code
  BEFORE UPDATE ON artworks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_reference_code_change();
