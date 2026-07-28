-- ---------------------------------------------------------------------------
-- Convert the 60 remaining legacy reference codes on IMP-* artworks to the
-- NOA-SB-YYYY-XXXX format (year = artwork creation year).
-- Affected: 20x Wynwood numbers (#1703…#1860), 33x ADS codes (#100-01 etc.),
-- 6x Aurum refs (AU22-SBR…), 1x "502". The legacy code is preserved in the
-- notes — several of them are original gallery refs and stay traceable there.
-- Same trigger-drop pattern as 20260526 / 20260728100000.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS protect_reference_code ON artworks;

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

DO $$
DECLARE
  r        RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR r IN
    SELECT id,
           reference_code,
           COALESCE(year, EXTRACT(YEAR FROM created_at)::int) AS ref_year
    FROM   artworks
    WHERE  inventory_number LIKE 'IMP-%'
      AND  reference_code !~ '^NOA-(SB|NC|CUR)-\d{4}-[A-Z0-9]{4}$'
    ORDER  BY inventory_number
  LOOP
    attempts := 0;
    LOOP
      new_code := 'NOA-SB-' || r.ref_year || '-' || _gen_noa_ref_suffix();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM artworks WHERE reference_code = new_code);
      attempts := attempts + 1;
      IF attempts > 200 THEN
        RAISE EXCEPTION 'No unique reference code found for artwork %', r.id;
      END IF;
    END LOOP;

    UPDATE artworks
    SET reference_code = new_code,
        notes = COALESCE(notes || ' | ', '')
                || 'Alt-Referenzcode ' || r.reference_code
                || ' (Format-Migration 28.07.2026)'
    WHERE id = r.id;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS _gen_noa_ref_suffix();

CREATE TRIGGER protect_reference_code
  BEFORE UPDATE ON artworks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_reference_code_change();
