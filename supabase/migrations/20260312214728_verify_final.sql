DO $$
DECLARE
  v_gal INTEGER;
  v_art INTEGER;
  v_sales INTEGER;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO v_gal FROM galleries;
  SELECT COUNT(*) INTO v_art FROM artworks;
  SELECT COUNT(*) INTO v_sales FROM sales;
  RAISE NOTICE 'TOTALS: % galleries, % artworks, % sales', v_gal, v_art, v_sales;
  RAISE NOTICE '---';
  FOR r IN SELECT g.name, g.type, COUNT(DISTINCT a.id) as arts FROM galleries g LEFT JOIN artworks a ON a.gallery_id = g.id GROUP BY g.name, g.type ORDER BY g.name LOOP
    RAISE NOTICE '% (%) — % artworks', r.name, r.type, r.arts;
  END LOOP;
END $$;
