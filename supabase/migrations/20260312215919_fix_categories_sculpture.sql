DO $$
DECLARE
  v_to_sculpture INTEGER;
BEGIN
  -- Height 30, 40 with painting → sculpture (missed in previous migration)
  UPDATE artworks SET category = 'sculpture'
  WHERE height IN (30, 40) AND category = 'painting'
    AND inventory_number LIKE 'IMP-%';
  GET DIAGNOSTICS v_to_sculpture = ROW_COUNT;

  RAISE NOTICE 'Category fixes: % painting → sculpture (height 30/40)', v_to_sculpture;
END $$;
