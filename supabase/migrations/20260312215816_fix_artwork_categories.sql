DO $$
DECLARE
  v_to_painting INTEGER;
  v_to_sculpture INTEGER;
BEGIN
  -- Height 75, 100, 150 → painting
  UPDATE artworks SET category = 'painting'
  WHERE height IN (75, 100, 150) AND category = 'sculpture'
    AND inventory_number LIKE 'IMP-%';
  GET DIAGNOSTICS v_to_painting = ROW_COUNT;

  -- Height 30, 40 → sculpture
  UPDATE artworks SET category = 'sculpture'
  WHERE height IN (30, 40) AND category = 'painting'
    AND inventory_number LIKE 'IMP-%';
  GET DIAGNOSTICS v_to_sculpture = ROW_COUNT;

  RAISE NOTICE 'Category fixes: % → painting, % → sculpture', v_to_painting, v_to_sculpture;
END $$;
