-- Import sales from PDF: dokumente_130326_123157.pdf
-- 7 invoices, 11 line items — each creates artwork (status=sold) + sale record

DO $$
DECLARE
  v_user_id UUID;
  v_gal_marthaler UUID;
  v_gal_aurum UUID;
  v_gal_promenaden UUID;
  v_gal_trugold UUID;
  v_art_id UUID;
  v_inserted INTEGER := 0;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No user found'; END IF;

  -- Look up or create galleries
  SELECT id INTO v_gal_marthaler FROM galleries WHERE name ILIKE '%marthaler%' LIMIT 1;
  IF v_gal_marthaler IS NULL THEN
    INSERT INTO galleries (user_id, name, type, city, country, commission_rate)
    VALUES (v_user_id, 'Laurent Marthaler', 'gallery', 'Montreux', 'Switzerland', 50)
    RETURNING id INTO v_gal_marthaler;
  END IF;

  SELECT id INTO v_gal_aurum FROM galleries WHERE name ILIKE '%aurum%' LIMIT 1;
  IF v_gal_aurum IS NULL THEN
    INSERT INTO galleries (user_id, name, type, city, country, commission_rate)
    VALUES (v_user_id, 'Aurum Gallery', 'gallery', 'Los Angeles', 'United States', 55)
    RETURNING id INTO v_gal_aurum;
  END IF;

  SELECT id INTO v_gal_promenaden FROM galleries WHERE name ILIKE '%promenaden%' LIMIT 1;
  IF v_gal_promenaden IS NULL THEN
    INSERT INTO galleries (user_id, name, type, city, country)
    VALUES (v_user_id, 'Promenaden Galerien Linz', 'gallery', 'Linz', 'Austria')
    RETURNING id INTO v_gal_promenaden;
  END IF;

  SELECT id INTO v_gal_trugold FROM galleries WHERE name ILIKE '%tru gold%' LIMIT 1;
  IF v_gal_trugold IS NULL THEN
    INSERT INTO galleries (user_id, name, type, city, country, commission_rate)
    VALUES (v_user_id, 'TRU GOLD', 'gallery', 'Bangkok', 'Thailand', 75)
    RETURNING id INTO v_gal_trugold;
  END IF;

  -- ============================================================
  -- RE-00289 #1: Untitled 100x100cm, Palm Beach, USD 22500, 50% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0485') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0485', 'SB-IMP-0485', 'Untitled', 'Glass, Wood and Aluminum', 2026, 100, 100, 10, 'cm', 44, 22500, 'USD', 'sold', v_gal_marthaler, 'painting', 'untitled_portrait', 'Bexio RE-00289 | Palm Beach Art Fair')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_marthaler, '2026-02-11', 22500, 'USD', 50, 'paid', 'RE-00289 | Palm Beach Art Fair | Payment: 28.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- RE-00289 #2: Untitled 150x150cm, Palm Beach, USD 22500, 50% comm
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0486') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0486', 'SB-IMP-0486', 'Untitled', 'Glass, Wood and Aluminum', 2026, 150, 150, 15, 'cm', 100, 22500, 'USD', 'sold', v_gal_marthaler, 'painting', 'untitled_portrait', 'Bexio RE-00289 | Palm Beach Art Fair')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_marthaler, '2026-02-11', 22500, 'USD', 50, 'paid', 'RE-00289 | Palm Beach Art Fair | Payment: 28.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00283 #1: Untitled 100x100cm, LA Art Show, CHF 16000, 50% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0487') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0487', 'SB-IMP-0487', 'Untitled', 'Glass, Wood and Aluminum', 2026, 100, 100, 10, 'cm', 44, 16000, 'CHF', 'sold', v_gal_marthaler, 'painting', 'untitled_portrait', 'Bexio RE-00283 | LA Art Show')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_marthaler, '2026-01-28', 16000, 'CHF', 50, 'paid', 'RE-00283 | LA Art Show | Payment: 28.01.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- RE-00283 #2: Untitled 150x150cm, LA Art Show, CHF 24000, 50% comm
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0488') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0488', 'SB-IMP-0488', 'Untitled', 'Glass, Wood and Aluminum', 2026, 150, 150, 15, 'cm', 100, 24000, 'CHF', 'sold', v_gal_marthaler, 'painting', 'untitled_portrait', 'Bexio RE-00283 | LA Art Show')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_marthaler, '2026-01-28', 24000, 'CHF', 50, 'paid', 'RE-00283 | LA Art Show | Payment: 28.01.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00290 #1: Skull Cube 50x46x50cm, Aurum, USD 52000, 55% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0489') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0489', 'SB-IMP-0489', 'Skull Cube', 'Glass', 2026, 50, 46, 50, 'cm', 275, 52000, 'USD', 'sold', v_gal_aurum, 'sculpture', 'skull', 'Bexio RE-00290 | Aurum Gallery')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_aurum, '2026-02-17', 52000, 'USD', 55, 'paid', 'RE-00290 | Aurum Gallery | Payment: 17.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- RE-00290 #2: Untitled 150x150cm, Aurum, USD 30400, 55% comm
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0490') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0490', 'SB-IMP-0490', 'Untitled', 'Glass', 2026, 150, 150, 15, 'cm', 100, 30400, 'USD', 'sold', v_gal_aurum, 'painting', 'untitled_portrait', 'Bexio RE-00290 | Aurum Gallery')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_aurum, '2026-02-17', 30400, 'USD', 55, 'paid', 'RE-00290 | Aurum Gallery | Payment: 17.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00282 #1: Untitled 100x100cm, Vaduz/Liechtenstein, CHF 20000, 50% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0491') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, category, series, notes)
    VALUES (v_user_id, 'IMP-0491', 'SB-IMP-0491', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 144, 20000, 'CHF', 'sold', 'painting', 'untitled_portrait', 'Bexio RE-00282 | Fürstentum Liechtenstein | Vaduz')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, NULL, '2026-01-27', 20000, 'CHF', 50, 'paid', 'RE-00282 | Fürstentum Liechtenstein | Payment: 17.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- RE-00282 #2: Untitled 100x100cm, Vaduz/Liechtenstein, CHF 20000, 50% comm
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0492') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, category, series, notes)
    VALUES (v_user_id, 'IMP-0492', 'SB-IMP-0492', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 144, 20000, 'CHF', 'sold', 'painting', 'untitled_portrait', 'Bexio RE-00282 | Fürstentum Liechtenstein | Vaduz')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, NULL, '2026-01-27', 20000, 'CHF', 50, 'paid', 'RE-00282 | Fürstentum Liechtenstein | Payment: 17.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00274: Parov Stelar 264.2x130.4cm, Promenaden Galerien Linz, EUR 24375
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0493') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0493', 'SB-IMP-0493', 'Parov Stelar', 'Glass', 2026, 264.2, 130.4, 'cm', 180, 24375, 'EUR', 'sold', v_gal_promenaden, 'sculpture', 'specific_portrait', 'Bexio RE-00274 | Promenaden Galerien Linz | minus train tickets')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_promenaden, '2026-01-13', 24375, 'EUR', 'paid', 'RE-00274 | Parov Stelar | Promenaden Galerien Linz | Payment: 27.01.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00271: Zeus & Poseidon pair 2x100x100cm, Mexico, USD 41400, 50% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0494') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, weight, price, currency, status, category, series, notes)
    VALUES (v_user_id, 'IMP-0494', 'SB-IMP-0494', 'Zeus & Poseidon', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 84, 41400, 'USD', 'sold', 'sculpture', 'god', 'Bexio RE-00271 | Pair (2 pieces) | Delivery: Mexico')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, NULL, '2026-01-08', 41400, 'USD', 50, 'paid', 'RE-00271 | Zeus & Poseidon | Mexico | Payment: 08.01.2026');
    v_inserted := v_inserted + 1;
  END IF;

  -- ============================================================
  -- RE-00281: Untitled 75x75cm AU22-SBR0008, TRU GOLD/Leon, CHF 12500, 75% comm
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM artworks WHERE inventory_number = 'IMP-0495') THEN
    INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, dimension_unit, weight, price, currency, status, gallery_id, category, series, notes)
    VALUES (v_user_id, 'IMP-0495', 'AU22-SBR0008', 'Untitled', 'Glass, Wood and Aluminum', 2022, 75, 75, 'cm', 5, 12500, 'CHF', 'sold', v_gal_trugold, 'painting', 'untitled_portrait', 'Bexio RE-00281 | Leon | Bali | Remaining commission 25%')
    RETURNING id INTO v_art_id;
    INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, payment_status, notes)
    VALUES (v_user_id, v_art_id, v_gal_trugold, '2026-01-21', 12500, 'CHF', 75, 'paid', 'RE-00281 | Leon | Bali | Payment: 17.02.2026');
    v_inserted := v_inserted + 1;
  END IF;

  RAISE NOTICE 'Imported % sales from dokumente_130326_123157.pdf', v_inserted;
END $$;
