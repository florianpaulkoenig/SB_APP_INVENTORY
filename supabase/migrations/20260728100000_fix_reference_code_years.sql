-- ---------------------------------------------------------------------------
-- Align reference-code year with the artwork's creation year.
-- 341 works carry entry-year codes (all "…-2026-XXXX" on 2020–2025 works)
-- because generateArtworkRefCode() used the current year; the data convention
-- (and all imported codes) is code year = artwork year. The front-end fix
-- landed in commit 21ec9fc; this migration repairs the existing rows.
-- The old code is preserved in the notes for traceability (issued COAs).
-- ---------------------------------------------------------------------------

-- 1. Temporarily drop the immutability trigger (same pattern as 20260526).
DROP TRIGGER IF EXISTS protect_reference_code ON artworks;

-- 2. Suffix helper matching generateArtworkRefCode(): L-D-L-D, no I/O/0/1.
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

-- 3. Rewrite every "PREFIX-YYYY-SUFFIX" code whose year segment differs from
--    the artwork's year. The suffix is kept unless the resulting code would
--    collide with an existing one (3 known cases → fresh suffix).
DO $$
DECLARE
  r        RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR r IN
    SELECT id,
           reference_code,
           year,
           (regexp_match(reference_code, '^(.*)-(\d{4})-([A-Z0-9]+)$'))[1] AS pfx,
           (regexp_match(reference_code, '^(.*)-(\d{4})-([A-Z0-9]+)$'))[2] AS code_year,
           (regexp_match(reference_code, '^(.*)-(\d{4})-([A-Z0-9]+)$'))[3] AS sfx
    FROM   artworks
    WHERE  year IS NOT NULL
      AND  reference_code ~ '^.*-\d{4}-[A-Z0-9]+$'
    ORDER  BY inventory_number
  LOOP
    CONTINUE WHEN r.code_year::int = r.year;

    new_code := r.pfx || '-' || r.year || '-' || r.sfx;
    attempts := 0;
    WHILE EXISTS (SELECT 1 FROM artworks WHERE reference_code = new_code AND id <> r.id) LOOP
      new_code := r.pfx || '-' || r.year || '-' || _gen_noa_ref_suffix();
      attempts := attempts + 1;
      IF attempts > 200 THEN
        RAISE EXCEPTION 'No unique reference code found for artwork %', r.id;
      END IF;
    END LOOP;

    UPDATE artworks
    SET reference_code = new_code,
        notes = COALESCE(notes || ' | ', '')
                || 'Alt-Referenzcode ' || r.reference_code
                || ' (Jahr-Korrektur 28.07.2026: Code-Jahr = Erstellungsjahr)'
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4. Clean up and restore the immutability trigger.
DROP FUNCTION IF EXISTS _gen_noa_ref_suffix();

CREATE TRIGGER protect_reference_code
  BEFORE UPDATE ON artworks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_reference_code_change();
