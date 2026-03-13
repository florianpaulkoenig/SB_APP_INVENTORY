-- TEST: Import 1 artwork + 1 sale record
DO $$
DECLARE
  v_user_id UUID;
  v_gallery_id UUID;
  v_artwork_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No auth user found'; END IF;

  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'West Chelsea Contemporary', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gallery_id;
  IF v_gallery_id IS NULL THEN
    SELECT id INTO v_gallery_id FROM galleries WHERE name = 'West Chelsea Contemporary' AND user_id = v_user_id;
  END IF;

  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-TEST-001', 'SB-TEST-0001', 'TEST IMPORT - Skull Cube (DELETE ME)', NULL, '2025', 40, 36, 40, 'cm', NULL, 45000, 'USD', 'sold', v_gallery_id, 'sculpture', 'skull', 'TEST - Bexio RE-00239 - Delete after verification')
  RETURNING id INTO v_artwork_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_artwork_id, v_gallery_id, '2025-12-31', 45000, 'USD', 50, 0, 22500, 'paid', 'TEST - Bexio RE-00239 | Payment: 2025-11-07');

  RAISE NOTICE 'TEST import complete: artwork_id = %, gallery_id = %', v_artwork_id, v_gallery_id;
END $$;
