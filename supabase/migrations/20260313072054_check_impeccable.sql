DO $$
DECLARE
  r RECORD;
  v_total NUMERIC := 0;
BEGIN
  RAISE NOTICE 'Sales for Impeccable Imagination in 2026:';
  FOR r IN
    SELECT s.id, s.sale_date, s.sale_price, s.currency, a.title, a.inventory_number, g.name as gallery_name
    FROM sales s
    JOIN galleries g ON g.id = s.gallery_id
    LEFT JOIN artworks a ON a.id = s.artwork_id
    WHERE g.name = 'Impeccable Imagination'
      AND EXTRACT(YEAR FROM s.sale_date) = 2026
    ORDER BY s.sale_date
  LOOP
    RAISE NOTICE '% | % | % % | % | %', r.sale_date, r.sale_price, r.currency, r.title, r.inventory_number, r.id;
    v_total := v_total + r.sale_price;
  END LOOP;
  RAISE NOTICE 'Total: %', v_total;
  
  RAISE NOTICE '---';
  RAISE NOTICE 'All sales for Impeccable Imagination (all years):';
  FOR r IN
    SELECT EXTRACT(YEAR FROM s.sale_date) as yr, COUNT(*) as cnt, SUM(s.sale_price) as total
    FROM sales s
    JOIN galleries g ON g.id = s.gallery_id
    WHERE g.name = 'Impeccable Imagination'
    GROUP BY EXTRACT(YEAR FROM s.sale_date)
    ORDER BY yr
  LOOP
    RAISE NOTICE 'Year %: % sales, total %', r.yr, r.cnt, r.total;
  END LOOP;
END $$;
