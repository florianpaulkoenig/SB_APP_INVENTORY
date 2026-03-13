DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT g.id, g.name, g.type, g.commission_rate, 
           COUNT(a.id) AS artwork_count,
           COUNT(s.id) AS sales_count
    FROM galleries g
    LEFT JOIN artworks a ON a.gallery_id = g.id
    LEFT JOIN sales s ON s.gallery_id = g.id
    GROUP BY g.id, g.name, g.type, g.commission_rate
    ORDER BY g.name
  LOOP
    RAISE NOTICE '% | % | % | comm: % | artworks: % | sales: %', 
      r.id, r.name, r.type, r.commission_rate, r.artwork_count, r.sales_count;
  END LOOP;
END $$;
