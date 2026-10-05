-- ============================================================================
-- Sales → contacts backfill
-- Every sale with a free-text buyer_name but no contact gets linked to a
-- contact: an existing one when the name matches exactly ("First Last",
-- "Last, First" or company), otherwise a new collector contact is created.
-- Placeholder names (private / anonymous / unknown) are left alone.
-- From now on the app resolves the buyer on every sale, so artworks can be
-- filtered by collector.
-- ============================================================================

DO $$
DECLARE
  r       RECORD;
  v_name  TEXT;
  v_first TEXT;
  v_last  TEXT;
  v_id    UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, btrim(regexp_replace(buyer_name, '\s+', ' ', 'g')) AS buyer_name
    FROM sales
    WHERE contact_id IS NULL
      AND buyer_name IS NOT NULL
      AND btrim(buyer_name) <> ''
      AND lower(buyer_name) !~ '(privat|anonym|unknown|unbekannt|^n/?a$|^-+$|^\?+$)'
  LOOP
    v_name := r.buyer_name;
    v_id   := NULL;

    SELECT id INTO v_id FROM contacts
     WHERE user_id = r.user_id
       AND lower(btrim(regexp_replace(first_name || ' ' || last_name, '\s+', ' ', 'g'))) = lower(v_name)
     LIMIT 1;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM contacts
       WHERE user_id = r.user_id
         AND lower(btrim(last_name || ', ' || first_name)) = lower(v_name)
       LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM contacts
       WHERE user_id = r.user_id
         AND company IS NOT NULL
         AND lower(btrim(company)) = lower(v_name)
       LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
      IF position(',' IN v_name) > 0 THEN
        v_last  := btrim(split_part(v_name, ',', 1));
        v_first := btrim(split_part(v_name, ',', 2));
      ELSIF position(' ' IN v_name) > 0 THEN
        v_last  := regexp_replace(v_name, '^.*\s', '');
        v_first := btrim(regexp_replace(v_name, '\s\S+$', ''));
      ELSE
        v_first := '';
        v_last  := v_name;
      END IF;

      INSERT INTO contacts (user_id, type, first_name, last_name, source, notes)
      VALUES (r.user_id, 'collector', v_first, v_last, 'sale', 'Automatically created from an existing sale record')
      RETURNING id INTO v_id;
    END IF;

    UPDATE sales
       SET contact_id = v_id
     WHERE user_id = r.user_id
       AND contact_id IS NULL
       AND btrim(regexp_replace(buyer_name, '\s+', ' ', 'g')) = r.buyer_name;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS sales_contact_artwork_idx ON sales (contact_id, artwork_id)
  WHERE contact_id IS NOT NULL;
