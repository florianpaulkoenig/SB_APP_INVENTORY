DO $$
DECLARE
  r RECORD;
  v_total_sales INTEGER;
  v_total_artworks INTEGER;
  v_orphan_sales INTEGER;
  v_imp_2026 INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_sales FROM sales;
  SELECT COUNT(*) INTO v_total_artworks FROM artworks;
  RAISE NOTICE 'Total: % artworks, % sales', v_total_artworks, v_total_sales;

  -- Check if Impeccable Imagination 2026 sales still exist
  SELECT COUNT(*) INTO v_imp_2026 FROM sales s
    JOIN galleries g ON g.id = s.gallery_id
    WHERE g.name = 'Impeccable Imagination'
    AND EXTRACT(YEAR FROM s.sale_date) = 2026;
  RAISE NOTICE 'Impeccable Imagination 2026 sales remaining: %', v_imp_2026;

  -- Check orphan sales (sales pointing to deleted artworks)
  SELECT COUNT(*) INTO v_orphan_sales FROM sales s
    WHERE s.artwork_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM artworks a WHERE a.id = s.artwork_id);
  RAISE NOTICE 'Orphan sales (artwork deleted but sale remains): %', v_orphan_sales;

  -- Check orphan artworks pointing to deleted galleries
  FOR r IN
    SELECT COUNT(*) as cnt FROM artworks a
    WHERE a.gallery_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM galleries g WHERE g.id = a.gallery_id)
  LOOP
    RAISE NOTICE 'Orphan artworks (gallery deleted but artwork remains): %', r.cnt;
  END LOOP;

  -- Show any remaining 2026 sales across all galleries
  RAISE NOTICE '---';
  RAISE NOTICE 'All 2026 sales:';
  FOR r IN
    SELECT s.sale_date, s.sale_price, a.title, g.name as gallery_name, s.id as sale_id
    FROM sales s
    LEFT JOIN galleries g ON g.id = s.gallery_id
    LEFT JOIN artworks a ON a.id = s.artwork_id
    WHERE EXTRACT(YEAR FROM s.sale_date) = 2026
    ORDER BY g.name, s.sale_date
  LOOP
    RAISE NOTICE '% | % | % | % | %', r.sale_date, r.sale_price, r.title, r.gallery_name, r.sale_id;
  END LOOP;
END $$;
