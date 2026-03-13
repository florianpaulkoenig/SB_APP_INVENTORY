DO $$
DECLARE
  v_art_count INTEGER;
  v_sales_count INTEGER;
  v_gal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_art_count FROM artworks WHERE status = 'sold' AND inventory_number LIKE 'IMP-%';
  SELECT COUNT(*) INTO v_sales_count FROM sales WHERE notes LIKE 'Bexio RE-%';
  SELECT COUNT(*) INTO v_gal_count FROM galleries;
  RAISE NOTICE 'Imported artworks: %, Sales: %, Total galleries: %', v_art_count, v_sales_count, v_gal_count;
END $$;
