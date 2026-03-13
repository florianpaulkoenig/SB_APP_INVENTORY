DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.sale_date, s.sale_price, a.title, g.name as gallery_name
    FROM sales s
    JOIN galleries g ON g.id = s.gallery_id
    LEFT JOIN artworks a ON a.id = s.artwork_id
    WHERE g.name = 'Impeccable Imagination'
    ORDER BY s.sale_date DESC
    LIMIT 15
  LOOP
    RAISE NOTICE '% | % | % | %', r.sale_date, r.sale_price, r.title, r.gallery_name;
  END LOOP;
END $$;
