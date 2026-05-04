-- =====================================================
-- NOA Inventory: Full Bexio Import (484 artworks + sales)
-- Generated: 2026-03-12 22:31
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_gal_0 UUID; -- Agence DS
  v_gal_1 UUID; -- Alte Brennerei
  v_gal_2 UUID; -- Art Galerie Tres Art
  v_gal_3 UUID; -- Artstübli Kunst & Kultur
  v_gal_4 UUID; -- Aurum Gallery
  v_gal_5 UUID; -- Berengo Studio
  v_gal_6 UUID; -- Carte Blanche
  v_gal_7 UUID; -- Corpus Artis
  v_gal_8 UUID; -- Cris Contini Contemporary
  v_gal_9 UUID; -- Direct / Project
  v_gal_10 UUID; -- Fabien Castanier Gallery
  v_gal_11 UUID; -- Galerie One
  v_gal_12 UUID; -- Galleria Sacchetti
  v_gal_13 UUID; -- Goldman Global Arts
  v_gal_14 UUID; -- Impeccable Imagination
  v_gal_15 UUID; -- La Villart, Calvi
  v_gal_16 UUID; -- Laurent Marthaler
  v_gal_17 UUID; -- Luca Fine Art
  v_gal_18 UUID; -- Mazel Galerie
  v_gal_19 UUID; -- NOA Contemporary
  v_gal_20 UUID; -- Spacejunk Grenoble
  v_gal_21 UUID; -- Underdogs Gallery
  v_gal_22 UUID; -- Verein Kulturmühle Lützeflüh
  v_gal_23 UUID; -- West Chelsea Contemporary
  v_gal_24 UUID; -- vierwind
  v_art_id UUID;
BEGIN

  -- Get admin user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found';
  END IF;

  -- ===================== GALLERIES =====================
  -- Gallery: Agence DS
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Agence DS', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_0;
  IF v_gal_0 IS NULL THEN
    SELECT id INTO v_gal_0 FROM galleries WHERE name = 'Agence DS' AND user_id = v_user_id;
  END IF;

  -- Gallery: Alte Brennerei
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Alte Brennerei', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_1;
  IF v_gal_1 IS NULL THEN
    SELECT id INTO v_gal_1 FROM galleries WHERE name = 'Alte Brennerei' AND user_id = v_user_id;
  END IF;

  -- Gallery: Art Galerie Tres Art
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Art Galerie Tres Art', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_2;
  IF v_gal_2 IS NULL THEN
    SELECT id INTO v_gal_2 FROM galleries WHERE name = 'Art Galerie Tres Art' AND user_id = v_user_id;
  END IF;

  -- Gallery: Artstübli Kunst & Kultur
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Artstübli Kunst & Kultur', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_3;
  IF v_gal_3 IS NULL THEN
    SELECT id INTO v_gal_3 FROM galleries WHERE name = 'Artstübli Kunst & Kultur' AND user_id = v_user_id;
  END IF;

  -- Gallery: Aurum Gallery
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Aurum Gallery', 'gallery', 75)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_4;
  IF v_gal_4 IS NULL THEN
    SELECT id INTO v_gal_4 FROM galleries WHERE name = 'Aurum Gallery' AND user_id = v_user_id;
  END IF;

  -- Gallery: Berengo Studio
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Berengo Studio', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_5;
  IF v_gal_5 IS NULL THEN
    SELECT id INTO v_gal_5 FROM galleries WHERE name = 'Berengo Studio' AND user_id = v_user_id;
  END IF;

  -- Gallery: Carte Blanche
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Carte Blanche', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_6;
  IF v_gal_6 IS NULL THEN
    SELECT id INTO v_gal_6 FROM galleries WHERE name = 'Carte Blanche' AND user_id = v_user_id;
  END IF;

  -- Gallery: Corpus Artis
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Corpus Artis', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_7;
  IF v_gal_7 IS NULL THEN
    SELECT id INTO v_gal_7 FROM galleries WHERE name = 'Corpus Artis' AND user_id = v_user_id;
  END IF;

  -- Gallery: Cris Contini Contemporary
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Cris Contini Contemporary', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_8;
  IF v_gal_8 IS NULL THEN
    SELECT id INTO v_gal_8 FROM galleries WHERE name = 'Cris Contini Contemporary' AND user_id = v_user_id;
  END IF;

  -- Gallery: Direct / Project
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Direct / Project', 'direct', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_9;
  IF v_gal_9 IS NULL THEN
    SELECT id INTO v_gal_9 FROM galleries WHERE name = 'Direct / Project' AND user_id = v_user_id;
  END IF;

  -- Gallery: Fabien Castanier Gallery
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Fabien Castanier Gallery', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_10;
  IF v_gal_10 IS NULL THEN
    SELECT id INTO v_gal_10 FROM galleries WHERE name = 'Fabien Castanier Gallery' AND user_id = v_user_id;
  END IF;

  -- Gallery: Galerie One
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Galerie One', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_11;
  IF v_gal_11 IS NULL THEN
    SELECT id INTO v_gal_11 FROM galleries WHERE name = 'Galerie One' AND user_id = v_user_id;
  END IF;

  -- Gallery: Galleria Sacchetti
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Galleria Sacchetti', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_12;
  IF v_gal_12 IS NULL THEN
    SELECT id INTO v_gal_12 FROM galleries WHERE name = 'Galleria Sacchetti' AND user_id = v_user_id;
  END IF;

  -- Gallery: Goldman Global Arts
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Goldman Global Arts', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_13;
  IF v_gal_13 IS NULL THEN
    SELECT id INTO v_gal_13 FROM galleries WHERE name = 'Goldman Global Arts' AND user_id = v_user_id;
  END IF;

  -- Gallery: Impeccable Imagination
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Impeccable Imagination', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_14;
  IF v_gal_14 IS NULL THEN
    SELECT id INTO v_gal_14 FROM galleries WHERE name = 'Impeccable Imagination' AND user_id = v_user_id;
  END IF;

  -- Gallery: La Villart, Calvi
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'La Villart, Calvi', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_15;
  IF v_gal_15 IS NULL THEN
    SELECT id INTO v_gal_15 FROM galleries WHERE name = 'La Villart, Calvi' AND user_id = v_user_id;
  END IF;

  -- Gallery: Laurent Marthaler
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Laurent Marthaler', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_16;
  IF v_gal_16 IS NULL THEN
    SELECT id INTO v_gal_16 FROM galleries WHERE name = 'Laurent Marthaler' AND user_id = v_user_id;
  END IF;

  -- Gallery: Luca Fine Art
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Luca Fine Art', 'gallery', 10)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_17;
  IF v_gal_17 IS NULL THEN
    SELECT id INTO v_gal_17 FROM galleries WHERE name = 'Luca Fine Art' AND user_id = v_user_id;
  END IF;

  -- Gallery: Mazel Galerie
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Mazel Galerie', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_18;
  IF v_gal_18 IS NULL THEN
    SELECT id INTO v_gal_18 FROM galleries WHERE name = 'Mazel Galerie' AND user_id = v_user_id;
  END IF;

  -- Gallery: NOA Contemporary
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'NOA Contemporary', 'gallery', 60)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_19;
  IF v_gal_19 IS NULL THEN
    SELECT id INTO v_gal_19 FROM galleries WHERE name = 'NOA Contemporary' AND user_id = v_user_id;
  END IF;

  -- Gallery: Spacejunk Grenoble
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Spacejunk Grenoble', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_20;
  IF v_gal_20 IS NULL THEN
    SELECT id INTO v_gal_20 FROM galleries WHERE name = 'Spacejunk Grenoble' AND user_id = v_user_id;
  END IF;

  -- Gallery: Underdogs Gallery
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Underdogs Gallery', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_21;
  IF v_gal_21 IS NULL THEN
    SELECT id INTO v_gal_21 FROM galleries WHERE name = 'Underdogs Gallery' AND user_id = v_user_id;
  END IF;

  -- Gallery: Verein Kulturmühle Lützeflüh
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'Verein Kulturmühle Lützeflüh', 'gallery', 40)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_22;
  IF v_gal_22 IS NULL THEN
    SELECT id INTO v_gal_22 FROM galleries WHERE name = 'Verein Kulturmühle Lützeflüh' AND user_id = v_user_id;
  END IF;

  -- Gallery: West Chelsea Contemporary
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'West Chelsea Contemporary', 'gallery', 0)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_23;
  IF v_gal_23 IS NULL THEN
    SELECT id INTO v_gal_23 FROM galleries WHERE name = 'West Chelsea Contemporary' AND user_id = v_user_id;
  END IF;

  -- Gallery: vierwind
  INSERT INTO galleries (user_id, name, type, commission_rate)
  VALUES (v_user_id, 'vierwind', 'gallery', 50)
  ON CONFLICT DO NOTHING RETURNING id INTO v_gal_24;
  IF v_gal_24 IS NULL THEN
    SELECT id INTO v_gal_24 FROM galleries WHERE name = 'vierwind' AND user_id = v_user_id;
  END IF;

  -- ===================== ARTWORKS + SALES =====================
  -- [1/484] Untitled (RE-00212)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0001', '#1709', 'Untitled', 'Mirror, Wood and Aluminum', 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100.0, 66500.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00212 | Payment: 22.09.2025 | Delivery: Miami, FL, USA | Materials: Mirror, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-08-04', 66500.0, 'USD', 0, 0.0, 33250.0, 'paid', 'Bexio RE-00212 | Payment: 22.09.2025 | Delivery: Miami, FL, USA | Materials: Mirror, Wood and Aluminum');

  -- [2/484] Untitled (RE-00206)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0002', '#1860', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00206 | Payment: 24.07.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-07-02', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00206 | Payment: 24.07.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [3/484] Untitled (RE-00200)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0003', '#1858', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00200 | Payment: 02.07.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-06-04', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00200 | Payment: 02.07.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [4/484] Untitled (RE-00191)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0004', '#1708', 'Untitled', 'Glass, Wood and Aluminum', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 67000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-04-07', 67000.0, 'USD', 0, 0.0, 33500.0, 'paid', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [5/484] Untitled (RE-00191)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0005', '#1850', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-04-07', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [6/484] Untitled (RE-00191)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0006', '#1749', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-04-07', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00191 | Payment: 23.04.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [7/484] Untitled (RE-00182)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0007', '#1770', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00182 | Payment: 26.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-03-07', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00182 | Payment: 26.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [8/484] Untitled (RE-00164)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0008', '#1705', 'Untitled', 'Glass, Wood and Aluminum', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 67000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-02-10', 67000.0, 'USD', 0, 0.0, 33500.0, 'paid', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [9/484] Untitled (RE-00164)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0009', '#1707', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-02-10', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [10/484] Untitled (RE-00164)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0010', '#1788', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-02-10', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00164 | Payment: 11.03.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [11/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0011', '#1710', 'Untitled', 'Glass, Wood and Aluminum', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 67000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 67000.0, 'USD', 0, 0.0, 33500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [12/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0012', '#1745', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [13/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0013', '#1746', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [14/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0014', '#1769', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [15/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0015', '#1747', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [16/484] Untitled (RE-00155)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0016', '#1748', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-20', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00155 | Payment: 10.02.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [17/484] Hestia (RE-00205)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0017', '#100-20', 'Hestia', 'Glass and Wood', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 10000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00205 | Payment: 23.12.2024 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-12-23', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00205 | Payment: 23.12.2024 | Delivery: France | Materials: Glass and Wood');

  -- [18/484] Untitled (RE-00151)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0018', '#1706', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2024-12-13', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [19/484] Untitled (RE-00151)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0019', '#1704', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2024-12-13', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [20/484] Untitled (RE-00151)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0020', '#1703', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 45000.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2024-12-13', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00151 | Payment: 20.01.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [21/484] Cube (Sphere) (RE-00144)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0021', '#40-01', 'Cube (Sphere)', 'Glass', 2024, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 135.0, 30000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'sphere', 'Bexio RE-00144 | Payment: 18.12.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-19', 30000.0, 'EUR', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00144 | Payment: 18.12.2024 | Delivery: France | Materials: Glass');

  -- [22/484] Poseidon (RE-00143)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0022', '#100-26', 'Poseidon', 'Glass', 2024, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 14500.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00143 | Payment: 20.02.2025 | Delivery: France | Split payment | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-19', 14500.0, 'EUR', 50, 0.0, 7250.0, 'paid', 'Bexio RE-00143 | Payment: 20.02.2025 | Delivery: France | Split payment | Materials: Glass');

  -- [23/484] Untitled (RE-00141)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0023', '#100-01', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-19', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass');

  -- [24/484] Untitled (RE-00141)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0024', '#100-03', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-19', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass');

  -- [25/484] Untitled (RE-00141)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0025', '#100-06', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-19', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00141 | Payment: 20.11.2024 | Delivery: France | Materials: Glass');

  -- [26/484] Athene (RE-00202)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0026', '#100-14', 'Athene', 'Glass and Wood', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00202 | Payment: 15.11.2025 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-15', 14000.0, 'EUR', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00202 | Payment: 15.11.2025 | Delivery: France | Materials: Glass and Wood');

  -- [27/484] Untitled (RE-00138)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0027', '#150-02', 'Untitled', 'Glass', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 23500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00138 | Payment: 19.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-15', 23500.0, 'EUR', 50, 0.0, 11750.0, 'paid', 'Bexio RE-00138 | Payment: 19.11.2024 | Delivery: France | Materials: Glass');

  -- [28/484] Untitled (RE-00137)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0028', '#150-07', 'Untitled', 'Glass', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 21000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00137 | Payment: 15.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-14', 21000.0, 'EUR', 50, 0.0, 10500.0, 'paid', 'Bexio RE-00137 | Payment: 15.11.2024 | Delivery: France | Materials: Glass');

  -- [29/484] Untitled (RE-00136)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0029', '#75-05', 'Untitled', 'Glass and Wood', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00136 | Payment: 06.12.2024 | Delivery: Switzerland | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-13', 9500.0, 'EUR', 50, 0.0, 4750.0, 'paid', 'Bexio RE-00136 | Payment: 06.12.2024 | Delivery: Switzerland | Materials: Glass and Wood');

  -- [30/484] Artemis (RE-00135)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0030', '#100-13', 'Artemis', 'Glass and Wood', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00135 | Payment: 19.11.2024 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-13', 14000.0, 'EUR', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00135 | Payment: 19.11.2024 | Delivery: France | Materials: Glass and Wood');

  -- [31/484] Untitled (RE-00133)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0031', '#100-23', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00133 | Payment: 12.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-12', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00133 | Payment: 12.11.2024 | Delivery: France | Materials: Glass');

  -- [32/484] Zeus (RE-00132)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0032', '#180-01', 'Zeus', 'Glass', 2024, 180.0, 180.0, NULL, 'cm', 180.0, 180.0, NULL, 150.0, 31000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00132 | Payment: 12.02.2025 | Delivery: France | Split payment | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-12', 31000.0, 'EUR', 50, 0.0, 15500.0, 'paid', 'Bexio RE-00132 | Payment: 12.02.2025 | Delivery: France | Split payment | Materials: Glass');

  -- [33/484] Cube (Skull) (RE-00129)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0033', '#30-03', 'Cube (Skull)', 'Glass', 2024, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 23000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00129 | Payment: 31.12.2024 | Delivery: France | Split payment | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-11', 23000.0, 'EUR', 50, 0.0, 11500.0, 'paid', 'Bexio RE-00129 | Payment: 31.12.2024 | Delivery: France | Split payment | Materials: Glass');

  -- [34/484] Untitled (RE-00127)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0034', '#100-08', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00127 | Payment: 12.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-11', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00127 | Payment: 12.11.2024 | Delivery: France | Materials: Glass');

  -- [35/484] Untitled (RE-00127)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0035', '#100-25', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00127 | Payment: 12.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-11', 14500.0, 'EUR', 50, 0.0, 7250.0, 'paid', 'Bexio RE-00127 | Payment: 12.11.2024 | Delivery: France | Materials: Glass');

  -- [36/484] Untitled (RE-00126)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0036', '#150-01', 'Untitled', 'Glass', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 23500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00126 | Payment: 12.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-11', 23500.0, 'EUR', 50, 0.0, 11750.0, 'paid', 'Bexio RE-00126 | Payment: 12.11.2024 | Delivery: France | Materials: Glass');

  -- [37/484] Cube (Skull) (RE-00122)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0037', '#40-02', 'Cube (Skull)', 'Glass', 2024, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 135.0, 35000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00122 | Payment: 12.11.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-08', 35000.0, 'EUR', 50, 0.0, 17500.0, 'paid', 'Bexio RE-00122 | Payment: 12.11.2024 | Delivery: France | Materials: Glass');

  -- [38/484] Untitled (RE-00110)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0038', '#100-04', 'Untitled', 'Glass and Wood', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00110 | Payment: 05.11.2024 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-01', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00110 | Payment: 05.11.2024 | Delivery: France | Materials: Glass and Wood');

  -- [39/484] Untitled (RE-00110)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0039', '#100-07', 'Untitled', 'Glass and Wood', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00110 | Payment: 05.11.2024 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-11-01', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00110 | Payment: 05.11.2024 | Delivery: France | Materials: Glass and Wood');

  -- [40/484] Cube (Skull) (RE-00106)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0040', '#30-01', 'Cube (Skull)', 'Glass', 2024, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 23000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-23', 23000.0, 'EUR', 50, 0.0, 11500.0, 'paid', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass');

  -- [41/484] Cube (Skull Red) (RE-00106)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0041', '#30-02', 'Cube (Skull Red)', 'Glass', 2024, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 23000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-23', 23000.0, 'EUR', 50, 0.0, 11500.0, 'paid', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass');

  -- [42/484] Untitled (Round Mirror) (RE-00106)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0042', '#125-02', 'Untitled (Round Mirror)', 'Glass and Wood', 2024, 125.0, 125.0, 10.0, 'cm', 125.0, 125.0, 10.0, 44.0, 24000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass and Wood')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-23', 24000.0, 'EUR', 50, 0.0, 12000.0, 'paid', 'Bexio RE-00106 | Payment: 24.10.2024 | Delivery: France | Materials: Glass and Wood');

  -- [43/484] Demeter (RE-00101)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0043', '#100-15', 'Demeter', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-07', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [44/484] Hephaistos (RE-00101)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0044', '#100-17', 'Hephaistos', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-07', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [45/484] Untitled (RE-00101)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0045', '#100-05', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-07', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [46/484] Untitled (RE-00101)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0046', '#100-10', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-07', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00101 | Payment: 23.10.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [47/484] Zeus (RE-00092)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0047', '#150-11', 'Zeus', 'Glass, Wood and Aluminum', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 24000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-23', 24000.0, 'EUR', 50, 0.0, 12000.0, 'paid', 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [48/484] Apollo (RE-00092)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0048', '#100-12', 'Apollo', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-23', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [49/484] Dionysos (RE-00092)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0049', '#100-16', 'Dionysos', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-23', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00092 | Payment: 25.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [50/484] Untitled (RE-00087)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0050', '#100-11', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-12', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [51/484] Untitled (RE-00087)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0051', '#100-19', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-12', 14500.0, 'EUR', 50, 0.0, 7250.0, 'paid', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [52/484] Untitled (RE-00087)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0052', '#100-21', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-12', 14500.0, 'EUR', 50, 0.0, 7250.0, 'paid', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [53/484] Untitled (RE-00087)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0053', '#100-22', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-09-12', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00087 | Payment: 23.09.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [54/484] Artwork Sales - West Chelsea Contemporary - Skull Cube (RE-00239)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0054', 'SB-IMP-0054', 'Artwork Sales - West Chelsea Contemporary - Skull Cube', NULL, 2025, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 45000.0, 'USD', 'sold', v_gal_23, 'sculpture', 'skull', 'Bexio RE-00239 | Payment: 07.11.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-31', 45000.0, 'USD', 0, 0.0, 22500.0, 'paid', 'Bexio RE-00239 | Payment: 07.11.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [55/484] Artwork Sales - West Chelsea Contemporary - 231107871 (RE-00238)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0055', 'SB-IMP-0055', 'Artwork Sales - West Chelsea Contemporary - 231107871', NULL, 2025, 100.0, 100.0, 10, 'cm', 100.0, 100.0, 10, 44, 23000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00238 | Payment: 28.01.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-31', 23000.0, 'USD', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00238 | Payment: 28.01.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [56/484] Artwork Sales - West Chelsea Contemporary - 231108127 (RE-00237)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0056', 'SB-IMP-0056', 'Artwork Sales - West Chelsea Contemporary - 231108127', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 34000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00237 | Payment: 26.11.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-31', 34000.0, 'USD', 0, 0.0, 17000.0, 'paid', 'Bexio RE-00237 | Payment: 26.11.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [57/484] Artwork Sales - West Chelsea Contemporary - Live Performance (RE-00236)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0057', 'SB-IMP-0057', 'Artwork Sales - West Chelsea Contemporary - Live Performance', NULL, 2025, 100.0, 100.0, 10, 'cm', 100.0, 100.0, 10, 44, 23000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00236 | Payment: 08.12.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-31', 23000.0, 'USD', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00236 | Payment: 08.12.2025 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [58/484] Artwork Sales - West Chelsea Contemporary - Commission (Venus) (RE-00234)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0058', 'SB-IMP-0058', 'Artwork Sales - West Chelsea Contemporary - Commission (Venus)', NULL, 2025, 100.0, 100.0, 10, 'cm', 100.0, 100.0, 10, 44, 23000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00234 | Payment: 12.02.2026 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-31', 23000.0, 'USD', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00234 | Payment: 12.02.2026 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [59/484] Untitled (RE-00267)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0059', 'SB-IMP-0059', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 19500.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00267 | Payment: 29.12.2025 | Delivery: Agence DS, Paris, Frankreich | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-12-29', 19500.0, 'EUR', 60, 0.0, 7800.0, 'paid', 'Bexio RE-00267 | Payment: 29.12.2025 | Delivery: Agence DS, Paris, Frankreich | Materials: Glas, Holz, Aluminium');

  -- [60/484] Personal Commission (RE-00266)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0060', 'SB-IMP-0060', 'Personal Commission', 'Glas, Holz, Aluminium', 2025, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 75000.0, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00266 | Payment: 29.12.2025 | Delivery: Ruggell, Fürstentum | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-12-29', 75000.0, 'CHF', 50, 0.0, 37500.0, 'paid', 'Bexio RE-00266 | Payment: 29.12.2025 | Delivery: Ruggell, Fürstentum | Materials: Glas, Holz, Aluminium');

  -- [61/484] Personal Commission (RE-00265)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0061', 'SB-IMP-0061', 'Personal Commission', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 65000.0, 'USD', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00265 | Payment: 29.12.2025 | Delivery: Sydney, Australien | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-12-29', 65000.0, 'USD', 20, 0.0, 52000.0, 'paid', 'Bexio RE-00265 | Payment: 29.12.2025 | Delivery: Sydney, Australien | Materials: Glas, Holz, Aluminium');

  -- [62/484] Untitled (RE-00264)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0062', 'SB-IMP-0062', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 19000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00264 | Payment: 18.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-12-16', 19000.0, 'EUR', 0, 0.0, 9500.0, 'paid', 'Bexio RE-00264 | Payment: 18.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [63/484] Untitled (RE-00264)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0063', 'SB-IMP-0063', 'Untitled', 'Glass, Wood and Aluminum', 2025, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 28500.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00264 | Payment: 18.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-12-16', 28500.0, 'EUR', 0, 0.0, 14250.0, 'paid', 'Bexio RE-00264 | Payment: 18.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [64/484] Exhibition in Musei Civici di Treviso (RE-00263)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0064', 'SB-IMP-0064', 'Exhibition in Musei Civici di Treviso', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13000.0, 'EUR', 'sold', v_gal_8, 'sculpture', NULL, 'Bexio RE-00263 | Payment: 05.01.2026')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2025-12-12', 13000.0, 'EUR', 0, 0.0, 6500.0, 'paid', 'Bexio RE-00263 | Payment: 05.01.2026');

  -- [65/484] Exhibition in Musei Civici di Treviso (RE-00262)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0065', 'SB-IMP-0065', 'Exhibition in Musei Civici di Treviso', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13000.0, 'EUR', 'sold', v_gal_8, 'sculpture', NULL, 'Bexio RE-00262 | Payment: 05.01.2026')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2025-12-12', 13000.0, 'EUR', 0, 0.0, 6500.0, 'paid', 'Bexio RE-00262 | Payment: 05.01.2026');

  -- [66/484] Exhibition in Casarsa della Delizia (RE-00260)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0066', 'SB-IMP-0066', 'Exhibition in Casarsa della Delizia', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 12000.0, 'EUR', 'sold', v_gal_8, 'sculpture', NULL, 'Bexio RE-00260 | Payment: 05.01.2026')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2025-12-12', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00260 | Payment: 05.01.2026');

  -- [67/484] Artwork Sales - West Chelsea Contemporary - Eagle (RE-00259)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0067', 'SB-IMP-0067', 'Artwork Sales - West Chelsea Contemporary - Eagle', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 30600.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00259 | Payment: 28.01.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-12-08', 30600.0, 'USD', 0, 0.0, 15300.0, 'paid', 'Bexio RE-00259 | Payment: 28.01.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [68/484] Untitled (RE-00258)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0068', 'SB-IMP-0068', 'Untitled', NULL, 2025, 29.0, 24.0, 15.0, 'cm', 29.0, 24.0, 15.0, NULL, 4162.81, 'CHF', 'sold', v_gal_24, 'sculpture', 'untitled_portrait', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_24, '2025-12-08', 4162.81, 'CHF', 50, 0.0, 2081.41, 'paid', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz');

  -- [69/484] Untitled (RE-00258)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0069', 'SB-IMP-0069', 'Untitled', NULL, 2025, 29.0, 24.0, 15.0, 'cm', 29.0, 24.0, 15.0, NULL, 3700.28, 'CHF', 'sold', v_gal_24, 'sculpture', 'untitled_portrait', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_24, '2025-12-08', 3700.28, 'CHF', 50, 0.0, 1850.14, 'paid', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz');

  -- [70/484] Untitled (RE-00258)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0070', 'SB-IMP-0070', 'Untitled', NULL, 2025, 39.0, 24.0, 15.0, 'cm', 39.0, 24.0, 15.0, NULL, 5087.88, 'CHF', 'sold', v_gal_24, 'sculpture', 'untitled_portrait', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_24, '2025-12-08', 5087.88, 'CHF', 50, 0.0, 2543.94, 'paid', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz');

  -- [71/484] Untitled (#2) (RE-00258)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0071', 'SB-IMP-0071', 'Untitled (#2)', NULL, 2025, 39.0, 24.0, 15.0, 'cm', 39.0, 24.0, 15.0, NULL, 5087.88, 'CHF', 'sold', v_gal_24, 'sculpture', 'untitled_portrait', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_24, '2025-12-08', 5087.88, 'CHF', 50, 0.0, 2543.94, 'paid', 'Bexio RE-00258 | Payment: 05.01.2026 | Delivery: Schweiz');

  -- [72/484] Untitled (RE-00257)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0072', 'SB-IMP-0072', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 19500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00257 | Payment: 16.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-12-08', 19500.0, 'EUR', 0, 0.0, 9750.0, 'paid', 'Bexio RE-00257 | Payment: 16.12.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [73/484] Eiger, Mönch & Jungfrau (RE-00256)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0073', 'SB-IMP-0073', 'Eiger, Mönch & Jungfrau', 'Glas', 2025, 6.0, 290.0, 130.0, 'cm', 6.0, 290.0, 130.0, 565.0, 130500.0, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00256 | Payment: 08.12.2025 | Materials: Glas')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-12-08', 130500.0, 'CHF', 60, 0.0, 52200.0, 'paid', 'Bexio RE-00256 | Payment: 08.12.2025 | Materials: Glas');

  -- [74/484] Mona Lisa (RE-00253)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0074', 'SB-IMP-0074', 'Mona Lisa', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 21250.0, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00253 | Payment: 29.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-11-29', 21250.0, 'CHF', 50, 0.0, 10625.0, 'paid', 'Bexio RE-00253 | Payment: 29.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium');

  -- [75/484] Brick (RE-00252)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0075', 'SB-IMP-0075', 'Brick', 'Glas', 2025, 20.0, 10.0, 5.0, 'cm', 20.0, 10.0, 5.0, 3.0, 6105.46, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00252 | Payment: 08.12.2025 | Delivery: Langenthal, Schweiz | Materials: Glas')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-11-21', 6105.46, 'CHF', 60, 0.0, 2442.18, 'paid', 'Bexio RE-00252 | Payment: 08.12.2025 | Delivery: Langenthal, Schweiz | Materials: Glas');

  -- [76/484] BREAK - CONSTRUCT — Frames (RE-00250)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0076', 'SB-IMP-0076', 'BREAK - CONSTRUCT — Frames', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 300.0, 'CHF', 'sold', v_gal_6, 'sculpture', NULL, 'Bexio RE-00250 | Payment: 02.02.2026')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_6, '2025-11-19', 300.0, 'CHF', 0, 0.0, 150.0, 'paid', 'Bexio RE-00250 | Payment: 02.02.2026');

  -- [77/484] Artwork Sales - West Chelsea Contemporary - Brick (RE-00231)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0077', 'SB-IMP-0077', 'Artwork Sales - West Chelsea Contemporary - Brick', NULL, 2025, 20.0, 10.0, 5.0, 'cm', 20.0, 10.0, 5.0, NULL, 6000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00231 | Payment: 18.12.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-11-14', 6000.0, 'USD', 0, 0.0, 3000.0, 'paid', 'Bexio RE-00231 | Payment: 18.12.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [78/484] Untitled (RE-00249)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0078', 'SB-IMP-0078', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15784.59, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00249 | Payment: 11.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-11-11', 15784.59, 'CHF', 50, 0.0, 7892.29, 'paid', 'Bexio RE-00249 | Payment: 11.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium');

  -- [79/484] Untitled (RE-00249)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0079', 'SB-IMP-0079', 'Untitled', 'Glas, Holz, Aluminium', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, 15.0, 12070.57, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00249 | Payment: 11.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-11-11', 12070.57, 'CHF', 50, 0.0, 6035.28, 'paid', 'Bexio RE-00249 | Payment: 11.11.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium');

  -- [80/484] Untitled (RE-00248)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0080', 'SB-IMP-0080', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 20000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00248 | Payment: 29.11.2025 | Exhibition: A MATTER OF METAMORPHOSIS | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2025-11-10', 20000.0, 'EUR', 0, 0.0, 10000.0, 'paid', 'Bexio RE-00248 | Payment: 29.11.2025 | Exhibition: A MATTER OF METAMORPHOSIS | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [81/484] Untitled (RE-00247)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0081', 'SB-IMP-0081', 'Untitled', 'Glass, Wood and Aluminum', 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 35.0, 11000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00247 | Payment: 10.11.2025 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-11-07', 11000.0, 'EUR', 0, 0.0, 5500.0, 'paid', 'Bexio RE-00247 | Payment: 10.11.2025 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [82/484] BREAK - CONSTRUCT — Consultancy Services (RE-00241)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0082', 'SB-IMP-0082', 'BREAK - CONSTRUCT — Consultancy Services', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 32231.88, 'CHF', 'sold', v_gal_6, 'sculpture', NULL, 'Bexio RE-00241 | Payment: 02.02.2026')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_6, '2025-11-06', 32231.88, 'CHF', 0, 0.0, 16115.94, 'paid', 'Bexio RE-00241 | Payment: 02.02.2026');

  -- [83/484] Artwork Sales - West Chelsea Contemporary - Winston Churchill (RE-00243)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0083', 'SB-IMP-0083', 'Artwork Sales - West Chelsea Contemporary - Winston Churchill', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 39000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00243 | Payment: 12.02.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-11-03', 39000.0, 'USD', 0, 0.0, 19500.0, 'paid', 'Bexio RE-00243 | Payment: 12.02.2026 | Exhibition: Lux Aeterna | Delivery: Austin TX, USA');

  -- [84/484] Artwork Sales - West Chelsea Contemporary (RE-00230)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0084', 'SB-IMP-0084', 'Artwork Sales - West Chelsea Contemporary', NULL, 2025, 100.0, 100.0, 10, 'cm', 100.0, 100.0, 10, 44, 23000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00230 | Payment: 07.11.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-10-31', 23000.0, 'USD', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00230 | Payment: 07.11.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [85/484] Untitled (RE-00240)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0085', 'SB-IMP-0085', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14657.38, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00240 | Payment: 28.10.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-10-28', 14657.38, 'CHF', 50, 0.0, 7328.69, 'paid', 'Bexio RE-00240 | Payment: 28.10.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium');

  -- [86/484] Untitled (RE-00240)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0086', 'SB-IMP-0086', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10992.57, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00240 | Payment: 28.10.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-10-28', 10992.57, 'CHF', 50, 0.0, 5496.29, 'paid', 'Bexio RE-00240 | Payment: 28.10.2025 | Delivery: Schweiz | Materials: Glas, Holz, Aluminium');

  -- [87/484] Artwork Sales - West Chelsea Contemporary - 231107874 (RE-00222)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0087', 'SB-IMP-0087', 'Artwork Sales - West Chelsea Contemporary - 231107874', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 34000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00222 | Payment: 27.10.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-10-24', 34000.0, 'USD', 0, 0.0, 17000.0, 'paid', 'Bexio RE-00222 | Payment: 27.10.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [88/484] Untitled (RE-00228)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0088', 'SB-IMP-0088', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 19500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00228 | Payment: 07.11.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-10-23', 19500.0, 'EUR', 0, 0.0, 9750.0, 'paid', 'Bexio RE-00228 | Payment: 07.11.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [89/484] Untitled (RE-00229)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0089', 'SB-IMP-0089', 'Untitled', 'Glass, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16000.0, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00229 | Payment: 22.10.2025 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2025-10-22', 16000.0, 'CHF', 50, 0.0, 8000.0, 'paid', 'Bexio RE-00229 | Payment: 22.10.2025 | Materials: Glass, Holz und Aluminium');

  -- [90/484] Untitled (RE-00227)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0090', 'SB-IMP-0090', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 20000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00227 | Payment: 22.10.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-10-16', 20000.0, 'EUR', 0, 0.0, 10000.0, 'paid', 'Bexio RE-00227 | Payment: 22.10.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [91/484] Untitled (RE-00227)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0091', 'SB-IMP-0091', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 20000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00227 | Payment: 22.10.2025 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-10-16', 20000.0, 'EUR', 0, 0.0, 10000.0, 'paid', 'Bexio RE-00227 | Payment: 22.10.2025 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [92/484] Cube (Skull, red) (RE-00226)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0092', 'SB-IMP-0092', 'Cube (Skull, red)', NULL, 2025, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 40500.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'skull', 'Bexio RE-00226 | Payment: 27.02.2026 | Delivery: Export')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-10-16', 40500.0, 'CHF', 50, 0.0, 20250.0, 'paid', 'Bexio RE-00226 | Payment: 27.02.2026 | Delivery: Export');

  -- [93/484] Untitled (RE-00225)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0093', 'SB-IMP-0093', 'Untitled', NULL, 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 20000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00225 | Payment: 29.11.2025 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-10-16', 20000.0, 'CHF', 50, 0.0, 10000.0, 'paid', 'Bexio RE-00225 | Payment: 29.11.2025 | Delivery: Schweiz');

  -- [94/484] Untitled (RE-00224)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0094', 'SB-IMP-0094', 'Untitled', NULL, 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11250.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00224 | Payment: 10.11.2025 | Delivery: Export')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-10-16', 11250.0, 'CHF', 50, 0.0, 5625.0, 'paid', 'Bexio RE-00224 | Payment: 10.11.2025 | Delivery: Export');

  -- [95/484] Artwork Sales - West Chelsea Contemporary (RE-00223)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0095', 'SB-IMP-0095', 'Artwork Sales - West Chelsea Contemporary', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 23000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00223 | Payment: 08.10.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-10-08', 23000.0, 'USD', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00223 | Payment: 08.10.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [96/484] Artwork Sales - West Chelsea Contemporary (RE-00221)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0096', 'SB-IMP-0096', 'Artwork Sales - West Chelsea Contemporary', NULL, 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100, 34000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00221 | Payment: 22.09.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-09-22', 34000.0, 'USD', 0, 0.0, 17000.0, 'paid', 'Bexio RE-00221 | Payment: 22.09.2025 | Exhibition: Lux Aeterna (Advance delivery before | Delivery: Austin TX, USA');

  -- [97/484] Neurozentrum — Projekt Wandgestaltung (RE-00220)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0097', 'SB-IMP-0097', 'Neurozentrum — Projekt Wandgestaltung', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 18501.387604070307, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00220 | Payment: 17.09.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-09-17', 18501.387604070307, 'CHF', 10, 10.0, 16651.248843663274, 'paid', 'Bexio RE-00220 | Payment: 17.09.2025');

  -- [98/484] 4 Löwen (RE-00219)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0098', 'SB-IMP-0098', '4 Löwen', 'Glas, Holz, Aluminium', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, 40.0, 40854.22, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00219 | Payment: 03.09.2025 | Delivery: ? | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-09-03', 40854.22, 'CHF', 50, 0.0, 20427.11, 'paid', 'Bexio RE-00219 | Payment: 03.09.2025 | Delivery: ? | Materials: Glas, Holz, Aluminium');

  -- [99/484] Berengo Studio - Werkverkäufe - St.Regis (RE-00218)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0099', 'SB-IMP-0099', 'Berengo Studio - Werkverkäufe - St.Regis', 'Glass, wood and aluminum', 2025, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 15000.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00218 | Payment: 17.09.2025 | Delivery: Venice, Italy | Materials: Glass, wood and aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-08-22', 15000.0, 'EUR', 60, 60.0, 6000.0, 'paid', 'Bexio RE-00218 | Payment: 17.09.2025 | Delivery: Venice, Italy | Materials: Glass, wood and aluminum');

  -- [100/484] Berg (RE-00217)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0100', 'SB-IMP-0100', 'Berg', 'Glas, Holz, Aluminium', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, 60.0, 30000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00217 | Payment: 03.09.2025 | Delivery: ? | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-08-21', 30000.0, 'USD', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00217 | Payment: 03.09.2025 | Delivery: ? | Materials: Glas, Holz, Aluminium');

  -- [101/484] Untitled (RE-00216)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0101', 'SB-IMP-0101', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 20000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00216 | Payment: 18.12.2025 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-08-21', 20000.0, 'EUR', 0, 0.0, 10000.0, 'paid', 'Bexio RE-00216 | Payment: 18.12.2025 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [102/484] Untitled (RE-00215)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0102', 'SB-IMP-0102', 'Untitled', 'Glass, Wood and Aluminum', 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100.0, 17750.0, 'USD', 'sold', v_gal_17, 'painting', 'untitled_portrait', 'Bexio RE-00215 | Payment: 22.09.2025 | Delivery: Atlanta, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_17, '2025-08-21', 17750.0, 'USD', 10, 0.0, 15975.0, 'paid', 'Bexio RE-00215 | Payment: 22.09.2025 | Delivery: Atlanta, USA | Materials: Glass, Wood and Aluminum');

  -- [103/484] Untitled (damaged/replacement) (RE-00213)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0103', 'SB-IMP-0103', 'Untitled (damaged/replacement)', 'Glass, Wood and Aluminum', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 12375.0, 'USD', 'sold', v_gal_13, 'painting', 'untitled_portrait', 'Bexio RE-00213 | Payment: 17.09.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-08-21', 12375.0, 'USD', 50, 0.0, 6187.5, 'paid', 'Bexio RE-00213 | Payment: 17.09.2025 | Delivery: Miami, FL, USA | Materials: Glass, Wood and Aluminum');

  -- [104/484] Personal Commission (RE-00214)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0104', 'SB-IMP-0104', 'Personal Commission', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 65000.0, 'USD', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00214 | Payment: 13.08.2025 | Delivery: UK | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-08-12', 65000.0, 'USD', 50, 0.0, 32500.0, 'paid', 'Bexio RE-00214 | Payment: 13.08.2025 | Delivery: UK | Materials: Glas, Holz, Aluminium');

  -- [105/484] Brick (Skull) (RE-00211)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0105', 'SB-IMP-0105', 'Brick (Skull)', 'Glas', 2025, 20.0, 10.0, 5.0, 'cm', 20.0, 10.0, 5.0, 2.5, 6400.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00211 | Payment: 04.08.2025 | Delivery: Schweiz | Materials: Glas')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-07-31', 6400.0, 'EUR', 0, 0.0, 3200.0, 'paid', 'Bexio RE-00211 | Payment: 04.08.2025 | Delivery: Schweiz | Materials: Glas');

  -- [106/484] Cube (Sphere) (RE-00210)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0106', 'SB-IMP-0106', 'Cube (Sphere)', NULL, 2025, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, NULL, 27000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'sphere', 'Bexio RE-00210 | Payment: 21.08.2025 | Delivery: Slowenien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-07-28', 27000.0, 'CHF', 50, 0.0, 13500.0, 'paid', 'Bexio RE-00210 | Payment: 21.08.2025 | Delivery: Slowenien');

  -- [107/484] Untitled (RE-00209)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0107', 'SB-IMP-0107', 'Untitled', 'Glass, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 18000.0, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2025-07-28', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium');

  -- [108/484] Untitled (RE-00209)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0108', 'SB-IMP-0108', 'Untitled', 'Glass, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 18000.0, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2025-07-28', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium');

  -- [109/484] Untitled (RE-00209)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0109', 'SB-IMP-0109', 'Untitled', 'Glass, Holz und Aluminium', 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11000.0, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2025-07-28', 11000.0, 'CHF', 50, 0.0, 5500.0, 'paid', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium');

  -- [110/484] Untitled (RE-00209)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0110', 'SB-IMP-0110', 'Untitled', 'Glass, Holz und Aluminium', 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 12000.0, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2025-07-28', 12000.0, 'CHF', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00209 | Payment: 04.08.2025 | Materials: Glass, Holz und Aluminium');

  -- [111/484] Korrekturzahlung — CHF / USD Verwechslung (RE-00208)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0111', 'SB-IMP-0111', 'Korrekturzahlung — CHF / USD Verwechslung', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 1210.72, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00208 | Payment: 31.07.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-07-28', 1210.72, 'CHF', 0, 0.0, 605.36, 'paid', 'Bexio RE-00208 | Payment: 31.07.2025');

  -- [112/484] Sales — Urban Art Fair — Q2 2025 (RE-00207)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0112', 'SB-IMP-0112', 'Sales — Urban Art Fair — Q2 2025', 'Glass, Wood and Aluminum', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 30900.0, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00207 | Payment: 04.08.2025 | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2025-07-28', 30900.0, 'EUR', 0, 0.0, 15450.0, 'paid', 'Bexio RE-00207 | Payment: 04.08.2025 | Materials: Glass, Wood and Aluminum');

  -- [113/484] Horse Head (RE-00204)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0113', 'SB-IMP-0113', 'Horse Head', 'Glass, Wood and Aluminum', 2025, 150.0, 150.0, 15, 'cm', 150.0, 150.0, 15, 100.0, 35500.0, 'USD', 'sold', v_gal_17, 'painting', NULL, 'Bexio RE-00204 | Payment: 24.07.2025 | Delivery: Atlanta, USA | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_17, '2025-06-17', 35500.0, 'USD', 0, 0.0, 17750.0, 'paid', 'Bexio RE-00204 | Payment: 24.07.2025 | Delivery: Atlanta, USA | Materials: Glass, Wood and Aluminum');

  -- [114/484] Untitled (RE-00203)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0114', 'SB-IMP-0114', 'Untitled', 'Glass, Wood and Aluminum', 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 12000.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00203 | Payment: 02.07.2025 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2025-06-12', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00203 | Payment: 02.07.2025 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum');

  -- [115/484] Untitled (RE-00201)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0115', 'SB-IMP-0115', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 18000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00201 | Payment: 11.06.2025 | Delivery: Singapur | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-06-11', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00201 | Payment: 11.06.2025 | Delivery: Singapur | Materials: Glas, Holz, Aluminium');

  -- [116/484] Untitled (RE-00201)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0116', 'SB-IMP-0116', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 18000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00201 | Payment: 11.06.2025 | Delivery: Singapur | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-06-11', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00201 | Payment: 11.06.2025 | Delivery: Singapur | Materials: Glas, Holz, Aluminium');

  -- [117/484] Artwork Sales - The Sublime Nature of Being #2 (RE-00172)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0117', 'SB-IMP-0117', 'Artwork Sales - The Sublime Nature of Being #2', 'Glass,Wood and Aluminum', 2025, 150.0, 100.0, 15.0, 'cm', 150.0, 100.0, 15.0, 100.0, 24000.0, 'USD', 'sold', v_gal_14, 'sculpture', NULL, 'Bexio RE-00172 | Payment: 03.06.2025 | Delivery: Dubai, UAE | Materials: Glass,Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2025-06-02', 24000.0, 'USD', 50, 50.0, 12000.0, 'paid', 'Bexio RE-00172 | Payment: 03.06.2025 | Delivery: Dubai, UAE | Materials: Glass,Wood and Aluminum');

  -- [118/484] Untitled (RE-00199)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0118', 'SB-IMP-0118', 'Untitled', 'Glas, Holz, Aluminium', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9250.69, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00199 | Payment: 11.06.2025 | Delivery: Zürich, Schweiz | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-05-22', 9250.69, 'CHF', 0, 0.0, 4625.35, 'paid', 'Bexio RE-00199 | Payment: 11.06.2025 | Delivery: Zürich, Schweiz | Materials: Glas, Holz, Aluminium');

  -- [119/484] Beduin (RE-00198)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0119', 'SB-IMP-0119', 'Beduin', 'Glas, Holz und Aluminium', 2025, 400.0, 570.0, NULL, 'cm', 400.0, 570.0, NULL, NULL, 66666.67, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-05-13', 66666.67, 'EUR', 50, 0.0, 26666.67, 'paid', 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium');

  -- [120/484] Mother (RE-00198)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0120', 'SB-IMP-0120', 'Mother', 'Glas, Holz und Aluminium', 2025, 400.0, 410.0, NULL, 'cm', 400.0, 410.0, NULL, NULL, 66666.67, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-05-13', 66666.67, 'EUR', 50, 0.0, 26666.67, 'paid', 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium');

  -- [121/484] Daugthers (RE-00198)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0121', 'SB-IMP-0121', 'Daugthers', 'Glas, Holz und Aluminium', 2025, 400.0, 550.0, NULL, 'cm', 400.0, 550.0, NULL, NULL, 66666.67, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-05-13', 66666.67, 'EUR', 50, 0.0, 26666.67, 'paid', 'Bexio RE-00198 | Payment: 16.05.2025 | Delivery: Paris, Frankreich | Materials: Glas, Holz und Aluminium');

  -- [122/484] Untitled (RE-00197)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0122', 'SB-IMP-0122', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 13500.0, 'EUR', 'sold', v_gal_2, 'sculpture', 'untitled_portrait', 'Bexio RE-00197 | Payment: 13.05.2025 | Delivery: Beda, Niederlanden | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_2, '2025-05-13', 13500.0, 'EUR', 50, 0.0, 5400.0, 'paid', 'Bexio RE-00197 | Payment: 13.05.2025 | Delivery: Beda, Niederlanden | Materials: Glas, Holz und Aluminium');

  -- [123/484] Untitled (RE-00196)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0123', 'SB-IMP-0123', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2025-05-13', 17000.0, 'EUR', 50, 0.0, 6800.0, 'paid', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium');

  -- [124/484] Untitled (RE-00196)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0124', 'SB-IMP-0124', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2025-05-13', 17000.0, 'EUR', 50, 0.0, 6800.0, 'paid', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium');

  -- [125/484] Untitled (RE-00196)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0125', 'SB-IMP-0125', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2025-05-13', 17000.0, 'EUR', 50, 0.0, 6800.0, 'paid', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium');

  -- [126/484] Untitled (RE-00196)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0126', 'SB-IMP-0126', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2025-05-13', 17000.0, 'EUR', 50, 0.0, 6800.0, 'paid', 'Bexio RE-00196 | Payment: 13.05.2025 | Delivery: Venedig, Italien | Materials: Glas, Holz und Aluminium');

  -- [127/484] Untitled (RE-00195)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0127', 'SB-IMP-0127', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 16713.09, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00195 | Payment: 12.05.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-05-12', 16713.09, 'CHF', 50, 0.0, 8356.55, 'paid', 'Bexio RE-00195 | Payment: 12.05.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium');

  -- [128/484] Artist License Fee - Merchandise - Q1, 2025 (RE-00194)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0128', 'SB-IMP-0128', 'Artist License Fee - Merchandise - Q1, 2025', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 385.0, 'USD', 'sold', v_gal_13, 'sculpture', NULL, 'Bexio RE-00194 | Payment: 02.07.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-05-01', 385.0, 'USD', 0, 0.0, 192.5, 'paid', 'Bexio RE-00194 | Payment: 02.07.2025');

  -- [129/484] Untitled (RE-00193)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0129', 'SB-IMP-0129', 'Untitled', 'Glas, Holz und Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 16000.0, 'EUR', 'sold', v_gal_15, 'sculpture', 'untitled_portrait', 'Bexio RE-00193 | Payment: 12.05.2025 | Delivery: Calvi, Korsika, Frankreich | Materials: Glas, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_15, '2025-04-24', 16000.0, 'EUR', 50, 0.0, 6400.0, 'paid', 'Bexio RE-00193 | Payment: 12.05.2025 | Delivery: Calvi, Korsika, Frankreich | Materials: Glas, Holz und Aluminium');

  -- [130/484] Artwork Purchase — Hummingbird (RE-00192)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0130', 'SB-IMP-0130', 'Artwork Purchase — Hummingbird', 'Glass', 2025, 40.0, 40.0, 40.0, 'cm', 40.0, 40.0, 40.0, NULL, 23850.0, 'USD', 'sold', v_gal_14, 'sculpture', NULL, 'Bexio RE-00192 | Payment: 23.05.2025 | Delivery: India | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2025-04-17', 23850.0, 'USD', 0, 0.0, 11925.0, 'paid', 'Bexio RE-00192 | Payment: 23.05.2025 | Delivery: India | Materials: Glass');

  -- [131/484] Artwork Sales — Solo Show "Echoes" — Installment #4 (RE-00189)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0131', 'SB-IMP-0131', 'Artwork Sales — Solo Show "Echoes" — Installment #4', NULL, 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16575.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00189 | Payment: 03.01.2026 | Exhibition: Echoes')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2025-03-19', 16575.0, 'USD', 50, 50.0, 8287.5, 'paid', 'Bexio RE-00189 | Payment: 03.01.2026 | Exhibition: Echoes');

  -- [132/484] Artwork Sales — Solo Show "Echoes" — Installment #3 (RE-00188)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0132', 'SB-IMP-0132', 'Artwork Sales — Solo Show "Echoes" — Installment #3', NULL, 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16575.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00188 | Payment: 03.01.2026 | Exhibition: Echoes')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2025-03-19', 16575.0, 'USD', 50, 50.0, 8287.5, 'paid', 'Bexio RE-00188 | Payment: 03.01.2026 | Exhibition: Echoes');

  -- [133/484] Artwork Sales — Solo Show "Echoes" — Installment #2 (RE-00187)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0133', 'SB-IMP-0133', 'Artwork Sales — Solo Show "Echoes" — Installment #2', NULL, 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16575.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00187 | Payment: 23.05.2025 | Exhibition: Echoes')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2025-03-19', 16575.0, 'USD', 50, 50.0, 8287.5, 'paid', 'Bexio RE-00187 | Payment: 23.05.2025 | Exhibition: Echoes');

  -- [134/484] Untitled (RE-00186)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0134', 'SB-IMP-0134', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17200.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-03-19', 17200.0, 'EUR', 50, 0.0, 6880.0, 'paid', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium');

  -- [135/484] Untitled (RE-00186)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0135', 'SB-IMP-0135', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17200.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-03-19', 17200.0, 'EUR', 50, 0.0, 6880.0, 'paid', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium');

  -- [136/484] Untitled (RE-00186)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0136', 'SB-IMP-0136', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17200.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-03-19', 17200.0, 'EUR', 50, 0.0, 6880.0, 'paid', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium');

  -- [137/484] Lion (RE-00186)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0137', 'SB-IMP-0137', 'Lion', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 17200.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-03-19', 17200.0, 'EUR', 50, 0.0, 6880.0, 'paid', 'Bexio RE-00186 | Payment: 19.03.2025 | Delivery: Italien | Materials: Glas, Holz, Aluminium');

  -- [138/484] Artwork Sales — Solo Show "Echoes" — Installment #1 (RE-00150)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0138', 'SB-IMP-0138', 'Artwork Sales — Solo Show "Echoes" — Installment #1', NULL, 2025, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16575.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00150 | Payment: 23.04.2025 | Exhibition: Echoes')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2025-03-19', 16575.0, 'USD', 50, 50.0, 8287.5, 'paid', 'Bexio RE-00150 | Payment: 23.04.2025 | Exhibition: Echoes');

  -- [139/484] Untitled (RE-00185)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0139', 'SB-IMP-0139', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 16713.09, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00185 | Payment: 26.03.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-03-14', 16713.09, 'CHF', 50, 0.0, 8356.55, 'paid', 'Bexio RE-00185 | Payment: 26.03.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium');

  -- [140/484] Untitled (RE-00184)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0140', 'SB-IMP-0140', 'Untitled', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 14856.08, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00184 | Payment: 12.05.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-03-13', 14856.08, 'CHF', 50, 0.0, 7428.04, 'paid', 'Bexio RE-00184 | Payment: 12.05.2025 | Delivery: Montreux, CH | Materials: Glas, Holz, Aluminium');

  -- [141/484] Design Services / Live Performance — The Sublime Nature of Being (RE-00183)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0141', 'SB-IMP-0141', 'Design Services / Live Performance — The Sublime Nature of Being', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 23850.0, 'USD', 'sold', v_gal_14, 'sculpture', NULL, 'Bexio RE-00183 | Payment: 02.05.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2025-03-13', 23850.0, 'USD', 0, 0.0, 11925.0, 'paid', 'Bexio RE-00183 | Payment: 02.05.2025');

  -- [142/484] Artwork Sales - The Sublime Nature of Being #1 (RE-00178)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0142', 'SB-IMP-0142', 'Artwork Sales - The Sublime Nature of Being #1', 'Glass', 2025, 40.0, 40.0, 40.0, 'cm', 40.0, 40.0, 40.0, NULL, 53000.0, 'USD', 'sold', v_gal_14, 'sculpture', NULL, 'Bexio RE-00178 | Payment: 14.03.2025 | Delivery: Dubai, UAE | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2025-03-13', 53000.0, 'USD', 50, 50.0, 26500.0, 'paid', 'Bexio RE-00178 | Payment: 14.03.2025 | Delivery: Dubai, UAE | Materials: Glass');

  -- [143/484] Artist License Fee - Merchandise (RE-00175)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0143', 'SB-IMP-0143', 'Artist License Fee - Merchandise', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 275.0, 'USD', 'sold', v_gal_13, 'sculpture', NULL, 'Bexio RE-00175 | Payment: 07.04.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-02-26', 275.0, 'USD', 0, 0.0, 137.5, 'paid', 'Bexio RE-00175 | Payment: 07.04.2025');

  -- [144/484] Personal Commission (RE-00174)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0144', 'SB-IMP-0144', 'Personal Commission', 'Glas, Holz, Aluminium', 2025, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 58000.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00174 | Payment: 10.11.2025 | Delivery: Kitzbühl, Österreich | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-25', 58000.0, 'EUR', 50, 0.0, 29000.0, 'paid', 'Bexio RE-00174 | Payment: 10.11.2025 | Delivery: Kitzbühl, Österreich | Materials: Glas, Holz, Aluminium');

  -- [145/484] Untitled (Head of a Horse) (RE-00173)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0145', 'SB-IMP-0145', 'Untitled (Head of a Horse)', 'Spiegel, Holz, Aluminium', 2025, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 40.0, 20700.0, 'USD', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00173 | Payment: 28.02.2025 | Delivery: USA | Materials: Spiegel, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-25', 20700.0, 'USD', 50, 0.0, 10350.0, 'paid', 'Bexio RE-00173 | Payment: 28.02.2025 | Delivery: USA | Materials: Spiegel, Holz, Aluminium');

  -- [146/484] Skull Cube (RE-00171)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0146', 'SB-IMP-0146', 'Skull Cube', 'Glass', 2025, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 140.0, 21500.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00171 | Payment: 18.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-18', 21500.0, 'EUR', 50, 0.0, 8600.0, 'paid', 'Bexio RE-00171 | Payment: 18.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass');

  -- [147/484] Skull Cube (RE-00171)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0147', 'SB-IMP-0147', 'Skull Cube', 'Glass', 2025, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 140.0, 21500.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00171 | Payment: 18.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-18', 21500.0, 'EUR', 50, 0.0, 8600.0, 'paid', 'Bexio RE-00171 | Payment: 18.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass');

  -- [148/484] Fragile (RE-00170)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0148', 'SB-IMP-0148', 'Fragile', NULL, 2024, 20.0, 20.0, 5.0, 'cm', 20.0, 20.0, 5.0, NULL, 7400.56, 'CHF', 'sold', v_gal_24, 'sculpture', NULL, 'Bexio RE-00170 | Payment: 20.02.2025 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_24, '2025-02-14', 7400.56, 'CHF', 50, 0.0, 3700.28, 'paid', 'Bexio RE-00170 | Payment: 20.02.2025 | Delivery: Schweiz');

  -- [149/484] Skull Cube (RE-00169)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0149', 'SB-IMP-0149', 'Skull Cube', 'Glass', 2025, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 140.0, 41628.12, 'CHF', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00169 | Payment: 12.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-12', 41628.12, 'CHF', 50, 0.0, 18732.65, 'paid', 'Bexio RE-00169 | Payment: 12.02.2025 | Delivery: Cologny, Schweiz | Materials: Glass');

  -- [150/484] Untitled (RE-00167)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0150', 'SB-IMP-0150', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 27000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00167 | Payment: 12.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-12', 27000.0, 'CHF', 50, 0.0, 13500.0, 'paid', 'Bexio RE-00167 | Payment: 12.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium');

  -- [151/484] Untitled (RE-00166)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0151', 'SB-IMP-0151', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 34000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00166 | Payment: 12.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-12', 34000.0, 'USD', 50, 0.0, 17000.0, 'paid', 'Bexio RE-00166 | Payment: 12.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [152/484] Untitled (RE-00165)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0152', 'SB-IMP-0152', 'Untitled', NULL, 2025, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 12500.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00165 | Payment: 14.03.2025 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-02-12', 12500.0, 'CHF', 50, 0.0, 6250.0, 'paid', 'Bexio RE-00165 | Payment: 14.03.2025 | Delivery: Schweiz');

  -- [153/484] Werkverkäufe - West Chelsea Contemporary (RE-00120)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0153', 'SB-IMP-0153', 'Werkverkäufe - West Chelsea Contemporary', 'Glass, Wood and Aluminum', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 28980.2, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00120 | Payment: 11.03.2025 | Exhibition: Beauty in Destruction | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-02-12', 28980.2, 'USD', 0, 0.0, 14490.1, 'paid', 'Bexio RE-00120 | Payment: 11.03.2025 | Exhibition: Beauty in Destruction | Materials: Glass, Wood and Aluminum');

  -- [154/484] Sales — Solo Show — Monuments — Mar. 2025 (RE-00163)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0154', 'SB-IMP-0154', 'Sales — Solo Show — Monuments — Mar. 2025', 'Glass, Wood and Aluminum', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13150.0, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00163 | Payment: 02.05.2025 | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2025-02-10', 13150.0, 'EUR', 0, 0.0, 6575.0, 'paid', 'Bexio RE-00163 | Payment: 02.05.2025 | Materials: Glass, Wood and Aluminum');

  -- [155/484] Sales — Solo Show — Monuments — Jan. 2025 (RE-00162)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0155', 'SB-IMP-0155', 'Sales — Solo Show — Monuments — Jan. 2025', 'Screen print on paper with a varnish finish', 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 1829.28, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00162 | Payment: 28.02.2025 | Materials: Screen print on paper with a varnish finish')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2025-02-10', 1829.28, 'EUR', 0, 0.0, 914.64, 'paid', 'Bexio RE-00162 | Payment: 28.02.2025 | Materials: Screen print on paper with a varnish finish');

  -- [156/484] Artstübli — Edition (RE-00161)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0156', 'SB-IMP-0156', 'Artstübli — Edition', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 800.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00161 | Payment: 12.02.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-02-06', 800.0, 'EUR', 0, 0.0, 400.0, 'paid', 'Bexio RE-00161 | Payment: 12.02.2025');

  -- [157/484] Untitled (RE-00160)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0157', 'SB-IMP-0157', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 18000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-06', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium');

  -- [158/484] Untitled (RE-00160)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0158', 'SB-IMP-0158', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 18000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-06', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium');

  -- [159/484] Untitled (RE-00160)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0159', 'SB-IMP-0159', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 17000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-06', 17000.0, 'CHF', 50, 0.0, 8500.0, 'paid', 'Bexio RE-00160 | Payment: 20.02.2025 | Delivery: Palm Beach, USA | Materials: Glas, Holz, Aluminium');

  -- [160/484] Untitled (RE-00159)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0160', 'SB-IMP-0160', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 28000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00159 | Payment: 06.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-06', 28000.0, 'USD', 50, 0.0, 14000.0, 'paid', 'Bexio RE-00159 | Payment: 06.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [161/484] Untitled (RE-00159)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0161', 'SB-IMP-0161', 'Untitled', 'Glas, Holz, Aluminium', 2025, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 28000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00159 | Payment: 06.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2025-02-06', 28000.0, 'USD', 50, 0.0, 14000.0, 'paid', 'Bexio RE-00159 | Payment: 06.02.2025 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [162/484] Untitled (RE-00158)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0162', 'SB-IMP-0162', 'Untitled', NULL, 2025, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25439.41, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00158 | Payment: 26.02.2025 | Delivery: Chur, Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2025-01-28', 25439.41, 'CHF', 50, 0.0, 12719.7, 'paid', 'Bexio RE-00158 | Payment: 26.02.2025 | Delivery: Chur, Schweiz');

  -- [163/484] Dog (Personal Commission) (RE-00156)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0163', 'SB-IMP-0163', 'Dog (Personal Commission)', 'Glass, Wood and Aluminum', 2025, 122.0, 122.0, NULL, 'cm', 122.0, 122.0, NULL, 60.0, 48000.0, 'EUR', 'sold', v_gal_19, 'painting', NULL, 'Bexio RE-00156 | Payment: 12.02.2025 | Delivery: Vancouver, Canada | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2025-01-22', 48000.0, 'EUR', 0, 0.0, 24000.0, 'paid', 'Bexio RE-00156 | Payment: 12.02.2025 | Delivery: Vancouver, Canada | Materials: Glass, Wood and Aluminum');

  -- [164/484] Artist Fee for Subway Project (RE-00154)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0164', 'SB-IMP-0164', 'Artist Fee for Subway Project', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'USD', 'sold', v_gal_13, 'sculpture', NULL, 'Bexio RE-00154 | Payment: 20.02.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2025-01-13', 10000.0, 'USD', 0, 0.0, 5000.0, 'paid', 'Bexio RE-00154 | Payment: 20.02.2025');

  -- [165/484] Untitled (RE-00153)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0165', 'SB-IMP-0165', 'Untitled', 'Glass, Wood and Aluminum', 2025, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 40.0, 15000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00153 | Payment: 08.01.2025 | Delivery: London, UK | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-01-03', 15000.0, 'EUR', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00153 | Payment: 08.01.2025 | Delivery: London, UK | Materials: Glass, Wood and Aluminum');

  -- [166/484] Cube (Skull) (RE-00107)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0166', 'SB-IMP-0166', 'Cube (Skull)', 'Glass', 2025, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 25000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00107 | Payment: 08.01.2025 | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2025-01-03', 25000.0, 'EUR', 50, 0.0, 12500.0, 'paid', 'Bexio RE-00107 | Payment: 08.01.2025 | Delivery: France | Materials: Glass');

  -- [167/484] Werkverkäufe - West Chelsea Contemporary (RE-00116)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0167', 'SB-IMP-0167', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2025, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 54556.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00116 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2025-01-01', 54556.0, 'USD', 0, 0.0, 27278.0, 'paid', 'Bexio RE-00116 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [168/484] Untitled (RE-00152)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0168', 'SB-IMP-0168', 'Untitled', 'Glas, Holz, Aluminium', 2024, 100, 100, 10, 'cm', 100, 100, 10, 42.0, 19000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-12-19', 19000.0, 'USD', 50, 0.0, 9500.0, 'paid', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [169/484] Untitled (RE-00152)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0169', 'SB-IMP-0169', 'Untitled', 'Glas, Holz, Aluminium', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 28000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-12-19', 28000.0, 'USD', 50, 0.0, 14000.0, 'paid', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [170/484] Untitled (RE-00152)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0170', 'SB-IMP-0170', 'Untitled', 'Glas, Holz, Aluminium', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 30000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-12-19', 30000.0, 'USD', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [171/484] Untitled (RE-00152)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0171', 'SB-IMP-0171', 'Untitled', 'Glas, Holz, Aluminium', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 30000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-12-19', 30000.0, 'USD', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00152 | Payment: 31.12.2024 | Delivery: Miami, USA | Materials: Glas, Holz, Aluminium');

  -- [172/484] Werkverkäufe - Solo Show (RE-00149)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0172', 'SB-IMP-0172', 'Werkverkäufe - Solo Show', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 55250.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00149 | Payment: 29.11.2024 | Exhibition: Echoes | Delivery: Miami FL, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2024-11-29', 55250.0, 'USD', 0, 0.0, 27625.0, 'paid', 'Bexio RE-00149 | Payment: 29.11.2024 | Exhibition: Echoes | Delivery: Miami FL, USA');

  -- [173/484] Untitled (RE-00148)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0173', 'SB-IMP-0173', 'Untitled', 'Glass, Holz und Aluminium', 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13927.58, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00148 | Payment: 26.11.2024 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-11-26', 13927.58, 'CHF', 50, 0.0, 6963.79, 'paid', 'Bexio RE-00148 | Payment: 26.11.2024 | Materials: Glass, Holz und Aluminium');

  -- [174/484] Untitled (RE-00148)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0174', 'SB-IMP-0174', 'Untitled', 'Glass, Holz und Aluminium', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9285.05, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00148 | Payment: 26.11.2024 | Materials: Glass, Holz und Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-11-26', 9285.05, 'CHF', 50, 0.0, 4642.53, 'paid', 'Bexio RE-00148 | Payment: 26.11.2024 | Materials: Glass, Holz und Aluminium');

  -- [175/484] Untitled (RE-00147)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0175', 'SB-IMP-0175', 'Untitled', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11262.5, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00147 | Payment: 31.12.2024 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-11-20', 11262.5, 'EUR', 0, 0.0, 5631.25, 'paid', 'Bexio RE-00147 | Payment: 31.12.2024 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum');

  -- [176/484] Untitled (RE-00145)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0176', 'SB-IMP-0176', 'Untitled', 'Glass', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 75000.0, 'USD', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00145 | Payment: 20.11.2024 | Delivery: Los Angeles | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-11-20', 75000.0, 'USD', 0, 0.0, 37500.0, 'paid', 'Bexio RE-00145 | Payment: 20.11.2024 | Delivery: Los Angeles | Materials: Glass');

  -- [177/484] Untitled (RE-00140)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0177', 'SB-IMP-0177', 'Untitled', 'Glass, Wood and Aluminum', 2024, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, 5.0, 7000.0, 'EUR', 'sold', v_gal_19, 'painting', 'untitled_portrait', 'Bexio RE-00140 | Payment: 31.12.2024 | Delivery: Portugal | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-11-17', 7000.0, 'EUR', 0, 0.0, 3500.0, 'paid', 'Bexio RE-00140 | Payment: 31.12.2024 | Delivery: Portugal | Materials: Glass, Wood and Aluminum');

  -- [178/484] Untitled (RE-00139)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0178', 'SB-IMP-0178', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 15500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00139 | Payment: 03.06.2025 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-11-15', 15500.0, 'EUR', 0, 0.0, 7750.0, 'paid', 'Bexio RE-00139 | Payment: 03.06.2025 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [179/484] Werkverkäufe - West Chelsea Contemporary (RE-00134)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0179', 'SB-IMP-0179', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 17500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00134 | Payment: 12.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-11-12', 17500.0, 'USD', 0, 0.0, 8750.0, 'paid', 'Bexio RE-00134 | Payment: 12.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [180/484] Production costs of the sculptures (RE-00121)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0180', 'SB-IMP-0180', 'Production costs of the sculptures', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 2490.0, 'USD', 'sold', v_gal_13, 'sculpture', NULL, 'Bexio RE-00121 | Payment: 20.02.2025')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_13, '2024-11-08', 2490.0, 'USD', 0, 0.0, 1245.0, 'paid', 'Bexio RE-00121 | Payment: 20.02.2025');

  -- [181/484] Werkverkäufe - West Chelsea Contemporary - Skull Garry (RE-00117)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0181', 'SB-IMP-0181', 'Werkverkäufe - West Chelsea Contemporary - Skull Garry', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', 'skull', 'Bexio RE-00117 | Payment: 12.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-11-05', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00117 | Payment: 12.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [182/484] Werkverkäufe - West Chelsea Contemporary (RE-00115)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0182', 'SB-IMP-0182', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 60000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00115 | Payment: 06.02.2025 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-11-05', 60000.0, 'USD', 0, 0.0, 30000.0, 'paid', 'Bexio RE-00115 | Payment: 06.02.2025 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [183/484] Werkverkäufe - West Chelsea Contemporary (RE-00114)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0183', 'SB-IMP-0183', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 60000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00114 | Payment: 06.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-11-05', 60000.0, 'USD', 0, 0.0, 30000.0, 'paid', 'Bexio RE-00114 | Payment: 06.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [184/484] Werkverkauf - Art Salon Zürich (RE-00113)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0184', 'SB-IMP-0184', 'Werkverkauf - Art Salon Zürich', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 16713.091922005573, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00113 | Payment: 05.11.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-11-05', 16713.091922005573, 'CHF', 0, 0.0, 8356.545961002786, 'paid', 'Bexio RE-00113 | Payment: 05.11.2024 | Delivery: Schweiz');

  -- [185/484] Untitled (RE-00112)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0185', 'SB-IMP-0185', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 5.0, 16500.0, 'USD', 'sold', v_gal_4, 'painting', 'untitled_portrait', 'Bexio RE-00112 | Payment: 05.11.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2024-11-03', 16500.0, 'USD', 75, 0.0, 4125.0, 'paid', 'Bexio RE-00112 | Payment: 05.11.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum');

  -- [186/484] Werkverkäufe - West Chelsea Contemporary - 231104812 (RE-00111)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0186', 'SB-IMP-0186', 'Werkverkäufe - West Chelsea Contemporary - 231104812', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00111 | Payment: 26.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-11-01', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00111 | Payment: 26.11.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [187/484] Werkverkauf - Art Salon Zürich (RE-00109)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0187', 'SB-IMP-0187', 'Werkverkauf - Art Salon Zürich', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 16713.091922005573, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00109 | Payment: 05.11.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-11-01', 16713.091922005573, 'CHF', 0, 0.0, 8356.545961002786, 'paid', 'Bexio RE-00109 | Payment: 05.11.2024 | Delivery: Schweiz');

  -- [188/484] Untitley (RE-00108)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0188', 'SB-IMP-0188', 'Untitley', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', NULL, 'Bexio RE-00108 | Payment: 01.11.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-10-26', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00108 | Payment: 01.11.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [189/484] #540 (RE-00105)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0189', 'SB-IMP-0189', '#540', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 18000.0, 'CHF', 'sold', v_gal_12, 'sculpture', NULL, 'Bexio RE-00105 | Payment: 31.12.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_12, '2024-10-22', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00105 | Payment: 31.12.2024 | Delivery: Schweiz');

  -- [190/484] #615 (RE-00105)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0190', 'SB-IMP-0190', '#615', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 18000.0, 'CHF', 'sold', v_gal_12, 'sculpture', NULL, 'Bexio RE-00105 | Payment: 31.12.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_12, '2024-10-22', 18000.0, 'CHF', 50, 0.0, 9000.0, 'paid', 'Bexio RE-00105 | Payment: 31.12.2024 | Delivery: Schweiz');

  -- [191/484] Untitled (RE-00104)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0191', 'SB-IMP-0191', 'Untitled', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10100.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00104 | Payment: 05.11.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-10-22', 10100.0, 'EUR', 0, 0.0, 5050.0, 'paid', 'Bexio RE-00104 | Payment: 05.11.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [192/484] Untitled (RE-00104)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0192', 'SB-IMP-0192', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 16066.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00104 | Payment: 05.11.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-10-22', 16066.0, 'EUR', 0, 0.0, 8033.0, 'paid', 'Bexio RE-00104 | Payment: 05.11.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [193/484] Untitled (RE-00103)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0193', 'SB-IMP-0193', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00103 | Payment: 31.12.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-10-22', 15000.0, 'CHF', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00103 | Payment: 31.12.2024 | Delivery: Schweiz');

  -- [194/484] Production Costs for Edition — November (RE-00102)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0194', 'SB-IMP-0194', 'Production Costs for Edition — November', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 843.0, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00102 | Payment: 31.12.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2024-10-07', 843.0, 'EUR', 0, 0.0, 421.5, 'paid', 'Bexio RE-00102 | Payment: 31.12.2024');

  -- [195/484] Werkverkäufe - West Chelsea Contemporary (RE-00099)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0195', 'SB-IMP-0195', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00099 | Payment: 02.10.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-10-02', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00099 | Payment: 02.10.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [196/484] Untitled (RE-00098)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0196', 'SB-IMP-0196', 'Untitled', 'Glass, Wood, Aluminum', 2024, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25500.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-10-01', 25500.0, 'EUR', 60, 0.0, 10200.0, 'paid', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum');

  -- [197/484] Untitled (RE-00098)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0197', 'SB-IMP-0197', 'Untitled', 'Glass, Wood, Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-10-01', 11000.0, 'EUR', 60, 0.0, 4400.0, 'paid', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum');

  -- [198/484] Untitled (RE-00098)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0198', 'SB-IMP-0198', 'Untitled', 'Glass, Wood, Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9900.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-10-01', 9900.0, 'EUR', 60, 0.0, 3960.0, 'paid', 'Bexio RE-00098 | Payment: 02.10.2024 | Delivery: Beda, Netherlands | Materials: Glass, Wood, Aluminum');

  -- [199/484] Untitled (RE-00097)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0199', 'SB-IMP-0199', 'Untitled', 'Glass', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10000.0, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00097 | Payment: 02.10.2024 | Delivery: Schweiz | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-10-01', 10000.0, 'CHF', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00097 | Payment: 02.10.2024 | Delivery: Schweiz | Materials: Glass');

  -- [200/484] Werkverkauf - Gittertor (RE-00096)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0200', 'SB-IMP-0200', 'Werkverkauf - Gittertor', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 20000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00096 | Payment: 08.01.2025 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-09-25', 20000.0, 'USD', 50, 50.0, 10000.0, 'paid', 'Bexio RE-00096 | Payment: 08.01.2025 | Delivery: Schweiz');

  -- [201/484] Werkverkauf - 60/40 cm (RE-00095)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0201', 'SB-IMP-0201', 'Werkverkauf - 60/40 cm', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00095 | Payment: 02.10.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-09-25', 10000.0, 'USD', 0, 0.0, 5000.0, 'paid', 'Bexio RE-00095 | Payment: 02.10.2024 | Delivery: Schweiz');

  -- [202/484] Cube (RE-00094)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0202', 'SB-IMP-0202', 'Cube', 'Glass', 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 31000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00094 | Payment: 25.09.2024 | Delivery: USA | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-09-25', 31000.0, 'USD', 0, 0.0, 15500.0, 'paid', 'Bexio RE-00094 | Payment: 25.09.2024 | Delivery: USA | Materials: Glass');

  -- [203/484] Werkverkäufe - West Chelsea Contemporary (RE-00093)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0203', 'SB-IMP-0203', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 17500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00093 | Payment: 25.09.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-09-25', 17500.0, 'USD', 0, 0.0, 8750.0, 'paid', 'Bexio RE-00093 | Payment: 25.09.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [204/484] Werkverkauf (RE-00091)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0204', 'SB-IMP-0204', 'Werkverkauf', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 16713.091922005573, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00091 | Payment: 19.09.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-09-18', 16713.091922005573, 'CHF', 0, 0.0, 8356.545961002786, 'paid', 'Bexio RE-00091 | Payment: 19.09.2024 | Delivery: Schweiz');

  -- [205/484] Untitled (RE-00090)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0205', 'SB-IMP-0205', 'Untitled', 'Glass, Wood and Aluminum', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 25500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00090 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-09-17', 25500.0, 'EUR', 0, 0.0, 12750.0, 'paid', 'Bexio RE-00090 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [206/484] Untitled (RE-00090)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0206', 'SB-IMP-0206', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 15500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00090 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-09-17', 15500.0, 'EUR', 0, 0.0, 7750.0, 'paid', 'Bexio RE-00090 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [207/484] Untitled (RE-00089)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0207', 'SB-IMP-0207', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 15500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00089 | Payment: 25.09.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-09-17', 15500.0, 'EUR', 0, 0.0, 7750.0, 'paid', 'Bexio RE-00089 | Payment: 25.09.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [208/484] Untitled (RE-00089)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0208', 'SB-IMP-0208', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 15500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00089 | Payment: 25.09.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-09-17', 15500.0, 'EUR', 0, 0.0, 7750.0, 'paid', 'Bexio RE-00089 | Payment: 25.09.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [209/484] Untitled (Cube) (RE-00088)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0209', 'SB-IMP-0209', 'Untitled (Cube)', 'Glass, Wood and Aluminum', 2024, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 10000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00088 | Payment: 25.09.2024 | Delivery: Switzerland | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-09-17', 10000.0, 'EUR', 0, 0.0, 5000.0, 'paid', 'Bexio RE-00088 | Payment: 25.09.2024 | Delivery: Switzerland | Materials: Glass, Wood and Aluminum');

  -- [210/484] Untitled (RE-00086)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0210', 'SB-IMP-0210', 'Untitled', 'Glass, Wood and Aluminum', 2024, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, 55.0, 8000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00086 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2024-09-12', 8000.0, 'EUR', 0, 0.0, 4000.0, 'paid', 'Bexio RE-00086 | Payment: 31.12.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [211/484] Untitled (RE-00085)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0211', 'SB-IMP-0211', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00085 | Payment: 25.09.2024 | Delivery: Frankreich')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-08-19', 15000.0, 'CHF', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00085 | Payment: 25.09.2024 | Delivery: Frankreich');

  -- [212/484] Untitled (RE-00085)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0212', 'SB-IMP-0212', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15500.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00085 | Payment: 25.09.2024 | Delivery: Frankreich')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-08-19', 15500.0, 'CHF', 50, 0.0, 7750.0, 'paid', 'Bexio RE-00085 | Payment: 25.09.2024 | Delivery: Frankreich');

  -- [213/484] Untitled (RE-00084)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0213', 'SB-IMP-0213', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14338.58, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00084 | Payment: 02.09.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-08-19', 14338.58, 'CHF', 50, 0.0, 7169.29, 'paid', 'Bexio RE-00084 | Payment: 02.09.2024 | Delivery: Schweiz');

  -- [214/484] Untitled (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0214', 'SB-IMP-0214', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12950.97, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 12950.97, 'CHF', 50, 0.0, 6475.49, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [215/484] Untitled (#2) (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0215', 'SB-IMP-0215', 'Untitled (#2)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12950.97, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 12950.97, 'CHF', 50, 0.0, 6475.49, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [216/484] Untitled (#3) (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0216', 'SB-IMP-0216', 'Untitled (#3)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12950.97, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 12950.97, 'CHF', 50, 0.0, 6475.49, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [217/484] Untitled (#4) (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0217', 'SB-IMP-0217', 'Untitled (#4)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12950.97, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 12950.97, 'CHF', 50, 0.0, 6475.49, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [218/484] Untitled (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0218', 'SB-IMP-0218', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13876.04, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 13876.04, 'CHF', 50, 0.0, 6938.02, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [219/484] Untitled (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0219', 'SB-IMP-0219', 'Untitled', NULL, 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8325.62, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 8325.62, 'CHF', 50, 0.0, 4162.81, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [220/484] Untitled (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0220', 'SB-IMP-0220', 'Untitled', NULL, 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9250.69, 'CHF', 'sold', v_gal_1, 'sculpture', 'untitled_portrait', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_1, '2024-08-05', 9250.69, 'CHF', 50, 0.0, 4625.35, 'paid', 'Bexio RE-00083 | Payment: 05.08.2024 | Delivery: Schweiz');

  -- [221/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0221', 'SB-IMP-0221', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13927.58, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 30.07.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-30', 13927.58, 'CHF', 0, 0.0, 6963.79, 'paid', 'Bexio RE-00082 | Payment: 30.07.2024');

  -- [222/484] Cube (Personal Commission) (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0222', 'SB-IMP-0222', 'Cube (Personal Commission)', 'Glas', 2024, 40.0, 40.0, 40.0, 'cm', 40.0, 40.0, 40.0, NULL, 45000.0, 'USD', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00081 | Payment: 25.07.2024 | Delivery: Tel Aviv, Israel | Materials: Glas')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-07-25', 45000.0, 'USD', 50, 0.0, 22500.0, 'paid', 'Bexio RE-00081 | Payment: 25.07.2024 | Delivery: Tel Aviv, Israel | Materials: Glas');

  -- [223/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0223', 'SB-IMP-0223', 'Untitled', 'Glass, Wood and Aluminum', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 25500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00080 | Payment: 24.07.2025 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-07-24', 25500.0, 'EUR', 0, 0.0, 12750.0, 'paid', 'Bexio RE-00080 | Payment: 24.07.2025 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [224/484] Sales — Edition — Le Corbusier (RE-00072)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0224', 'SB-IMP-0224', 'Sales — Edition — Le Corbusier', 'Screen print on paper with a varnish', 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 1500.0, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00072 | Payment: 12.09.2024 | Materials: Screen print on paper with a varnish')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2024-07-24', 1500.0, 'EUR', 50, -200.0, 4500.0, 'paid', 'Bexio RE-00072 | Payment: 12.09.2024 | Materials: Screen print on paper with a varnish');

  -- [225/484] Untitled (RE-00079)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0225', 'SB-IMP-0225', 'Untitled', 'Spiegel, Holz, Aluminium', 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00079 | Payment: 23.07.2024 | Delivery: Wynnwood, Miami, USA | Materials: Spiegel, Holz, Aluminium')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-23', 15000.0, 'USD', 0, 0.0, 7500.0, 'paid', 'Bexio RE-00079 | Payment: 23.07.2024 | Delivery: Wynnwood, Miami, USA | Materials: Spiegel, Holz, Aluminium');

  -- [226/484] Untitled (RE-00078)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0226', 'SB-IMP-0226', 'Untitled', NULL, 2024, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 23212.63, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00078 | Payment: 23.07.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-23', 23212.63, 'CHF', 0, 0.0, 11606.31, 'paid', 'Bexio RE-00078 | Payment: 23.07.2024');

  -- [227/484] Untitled (RE-00078)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0227', 'SB-IMP-0227', 'Untitled', NULL, 2024, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25998.14, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00078 | Payment: 23.07.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-23', 25998.14, 'CHF', 0, 0.0, 12999.07, 'paid', 'Bexio RE-00078 | Payment: 23.07.2024');

  -- [228/484] Untitled (RE-00077)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0228', 'SB-IMP-0228', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12800.0, 'EUR', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00077 | Payment: 19.07.2024 | Delivery: Marseille')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-19', 12800.0, 'EUR', 0, 0.0, 6400.0, 'paid', 'Bexio RE-00077 | Payment: 19.07.2024 | Delivery: Marseille');

  -- [229/484] Untitled (RE-00076)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0229', 'SB-IMP-0229', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15784.59, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00076 | Payment: 19.07.2024 | Split payment | Payment on account')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-07-19', 15784.59, 'CHF', 0, 0.0, 7892.29, 'paid', 'Bexio RE-00076 | Payment: 19.07.2024 | Split payment | Payment on account');

  -- [230/484] Werkverkäufe - West Chelsea Contemporary (RE-00075)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0230', 'SB-IMP-0230', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00075 | Payment: 03.07.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-07-03', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00075 | Payment: 03.07.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [231/484] Skull (RE-00074)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0231', 'SB-IMP-0231', 'Skull', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'skull', 'Bexio RE-00074 | Payment: 31.07.2024 | Delivery: Österreich')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-07-02', 13500.0, 'CHF', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00074 | Payment: 31.07.2024 | Delivery: Österreich');

  -- [232/484] Untitled (RE-00073)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0232', 'SB-IMP-0232', 'Untitled', 'Glass, Wood and Aluminum', 2024, 250.0, 87.0, NULL, 'cm', 250.0, 87.0, NULL, NULL, 30000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00073 | Payment: 02.10.2024 | Delivery: France | Split payment | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-06-03', 30000.0, 'EUR', 0, 0.0, 15000.0, 'paid', 'Bexio RE-00073 | Payment: 02.10.2024 | Delivery: France | Split payment | Materials: Glass, Wood and Aluminum');

  -- [233/484] Untitled (#2) (RE-00073)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0233', 'SB-IMP-0233', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2024, 250.0, 87.0, NULL, 'cm', 250.0, 87.0, NULL, NULL, 30000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00073 | Payment: 02.10.2024 | Delivery: France | Split payment | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-06-03', 30000.0, 'EUR', 0, 0.0, 15000.0, 'paid', 'Bexio RE-00073 | Payment: 02.10.2024 | Delivery: France | Split payment | Materials: Glass, Wood and Aluminum');

  -- [234/484] Untitled (RE-00046)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0234', 'SB-IMP-0234', 'Untitled', 'Glass, Wood and Aluminum', 2024, 250.0, 87.0, NULL, 'cm', 250.0, 87.0, NULL, NULL, 32000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00046 | Payment: 23.07.2024 | Delivery: France | Split payment | Payment on account | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-06-03', 32000.0, 'EUR', 0, 0.0, 16000.0, 'paid', 'Bexio RE-00046 | Payment: 23.07.2024 | Delivery: France | Split payment | Payment on account | Materials: Glass, Wood and Aluminum');

  -- [235/484] Untitled (#2) (RE-00046)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0235', 'SB-IMP-0235', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2024, 250.0, 87.0, NULL, 'cm', 250.0, 87.0, NULL, NULL, 32000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00046 | Payment: 23.07.2024 | Delivery: France | Split payment | Payment on account | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-06-03', 32000.0, 'EUR', 0, 0.0, 16000.0, 'paid', 'Bexio RE-00046 | Payment: 23.07.2024 | Delivery: France | Split payment | Payment on account | Materials: Glass, Wood and Aluminum');

  -- [236/484] Untitled (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0236', 'SB-IMP-0236', 'Untitled', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [237/484] Untitled (#2) (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0237', 'SB-IMP-0237', 'Untitled (#2)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [238/484] Untitled (#3) (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0238', 'SB-IMP-0238', 'Untitled (#3)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [239/484] Untitled (#4) (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0239', 'SB-IMP-0239', 'Untitled (#4)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [240/484] Untitled (#5) (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0240', 'SB-IMP-0240', 'Untitled (#5)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [241/484] Untitled (#6) (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0241', 'SB-IMP-0241', 'Untitled (#6)', NULL, 2024, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10666.67, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-29', 10666.67, 'EUR', 0, 0.0, 5333.33, 'paid', 'Bexio RE-00055 | Payment: 29.05.2024 | Delivery: Italien');

  -- [242/484] Untitled (RE-00071)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0242', 'SB-IMP-0242', 'Untitled', 'Glass', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 7750.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00071 | Payment: 24.05.2024 | Delivery: Marbella, Spanien | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-13', 7750.0, 'EUR', 10, 0.0, 6975.0, 'paid', 'Bexio RE-00071 | Payment: 24.05.2024 | Delivery: Marbella, Spanien | Materials: Glass');

  -- [243/484] Untitled (RE-00070)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0243', 'SB-IMP-0243', 'Untitled', 'Glass', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12400.0, 'EUR', 'sold', v_gal_7, 'sculpture', 'untitled_portrait', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_7, '2024-05-10', 12400.0, 'EUR', 0, 0.0, 6200.0, 'paid', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass');

  -- [244/484] Untitled (Lion) (RE-00070)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0244', 'SB-IMP-0244', 'Untitled (Lion)', 'Glass', 2024, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 35.0, 20400.0, 'EUR', 'sold', v_gal_7, 'sculpture', 'untitled_portrait', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_7, '2024-05-10', 20400.0, 'EUR', 0, 0.0, 10200.0, 'paid', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass');

  -- [245/484] Untitled (Lion) (RE-00070)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0245', 'SB-IMP-0245', 'Untitled (Lion)', 'Glass', 2024, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 35.0, 20400.0, 'EUR', 'sold', v_gal_7, 'sculpture', 'untitled_portrait', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_7, '2024-05-10', 20400.0, 'EUR', 0, 0.0, 10200.0, 'paid', 'Bexio RE-00070 | Payment: 14.05.2024 | Materials: Glass');

  -- [246/484] Fondation Ghiannada (RE-00069)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0246', 'SB-IMP-0246', 'Fondation Ghiannada', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 23212.627669452184, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00069 | Payment: 08.05.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-05-08', 23212.627669452184, 'CHF', 0, 0.0, 11606.313834726092, 'paid', 'Bexio RE-00069 | Payment: 08.05.2024 | Delivery: Schweiz');

  -- [247/484] Werkverkauf (RE-00068)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0247', 'SB-IMP-0247', 'Werkverkauf', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 14856.081708449397, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00068 | Payment: 25.09.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-05-08', 14856.081708449397, 'CHF', 0, 0.0, 7428.040854224699, 'paid', 'Bexio RE-00068 | Payment: 25.09.2024 | Delivery: Schweiz');

  -- [248/484] Untitled (RE-00067)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0248', 'SB-IMP-0248', 'Untitled', 'Glass', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 48000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00067 | Payment: 08.05.2024 | Delivery: Dubai, Vereinigte Arabische Emirate | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2024-05-08', 48000.0, 'EUR', 0, 0.0, 24000.0, 'paid', 'Bexio RE-00067 | Payment: 08.05.2024 | Delivery: Dubai, Vereinigte Arabische Emirate | Materials: Glass');

  -- [249/484] Untitled (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0249', 'SB-IMP-0249', 'Untitled', 'Glass', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 85000.0, 'USD', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00066 | Payment: 08.05.2024 | Delivery: Almaty, Kazachstan | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-05-08', 85000.0, 'USD', 0, 0.0, 42500.0, 'paid', 'Bexio RE-00066 | Payment: 08.05.2024 | Delivery: Almaty, Kazachstan | Materials: Glass');

  -- [250/484] Untitled (Tower) (RE-00065)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0250', 'SB-IMP-0250', 'Untitled (Tower)', 'Glass, Wood and Aluminum', 2024, 150.0, 50.0, 15.0, 'cm', 150.0, 50.0, 15.0, 400.0, 50000.0, 'EUR', 'sold', v_gal_5, 'sculpture', 'untitled_portrait', 'Bexio RE-00065 | Payment: 23.07.2024 | Delivery: Switzerland | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-04-30', 50000.0, 'EUR', 0, 0.0, 25000.0, 'paid', 'Bexio RE-00065 | Payment: 23.07.2024 | Delivery: Switzerland | Materials: Glass, Wood and Aluminum');

  -- [251/484] Werkverkäufe - West Chelsea Contemporary (RE-00063)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0251', 'SB-IMP-0251', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 17500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00063 | Payment: 29.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-04-29', 17500.0, 'USD', 0, 0.0, 8750.0, 'paid', 'Bexio RE-00063 | Payment: 29.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [252/484] Untitled (Lion) (RE-00062)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0252', 'SB-IMP-0252', 'Untitled (Lion)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 29500.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00062 | Payment: 29.04.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-29', 29500.0, 'USD', 0, 0.0, 14750.0, 'paid', 'Bexio RE-00062 | Payment: 29.04.2024');

  -- [253/484] Werkverkauf (RE-00061)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0253', 'SB-IMP-0253', 'Werkverkauf', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 16248.839368616527, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00061 | Payment: 29.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-29', 16248.839368616527, 'CHF', 0, 0.0, 8124.419684308264, 'paid', 'Bexio RE-00061 | Payment: 29.04.2024 | Delivery: Schweiz');

  -- [254/484] Werkverkauf (#1) (RE-00060)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0254', 'SB-IMP-0254', 'Werkverkauf (#1)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13927.57660167131, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00060 | Payment: 29.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-25', 13927.57660167131, 'CHF', 0, 0.0, 6963.788300835655, 'paid', 'Bexio RE-00060 | Payment: 29.04.2024 | Delivery: Schweiz');

  -- [255/484] Werkverkauf (#2) (RE-00060)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0255', 'SB-IMP-0255', 'Werkverkauf (#2)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13927.57660167131, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00060 | Payment: 29.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-25', 13927.57660167131, 'CHF', 0, 0.0, 6963.788300835655, 'paid', 'Bexio RE-00060 | Payment: 29.04.2024 | Delivery: Schweiz');

  -- [256/484] Untitled (RE-00059)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0256', 'SB-IMP-0256', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00059 | Payment: 06.06.2024 | Delivery: Portugal')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-24', 12000.0, 'CHF', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00059 | Payment: 06.06.2024 | Delivery: Portugal');

  -- [257/484] Untitled (RE-00059)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0257', 'SB-IMP-0257', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00059 | Payment: 06.06.2024 | Delivery: Portugal')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-24', 12000.0, 'CHF', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00059 | Payment: 06.06.2024 | Delivery: Portugal');

  -- [258/484] Untitled (Mirror) (RE-00058)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0258', 'SB-IMP-0258', 'Untitled (Mirror)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13500.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00058 | Payment: 23.04.2024 | Delivery: USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-23', 13500.0, 'USD', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00058 | Payment: 23.04.2024 | Delivery: USA');

  -- [259/484] Untitled (RE-00058)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0259', 'SB-IMP-0259', 'Untitled', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 22500.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00058 | Payment: 23.04.2024 | Delivery: USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-04-23', 22500.0, 'USD', 0, 0.0, 11250.0, 'paid', 'Bexio RE-00058 | Payment: 23.04.2024 | Delivery: USA');

  -- [260/484] Untitled (RE-00057)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0260', 'SB-IMP-0260', 'Untitled', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10250.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-04-10', 10250.0, 'EUR', 0, 0.0, 5125.0, 'paid', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [261/484] Untitled (#2) (RE-00057)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0261', 'SB-IMP-0261', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10250.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-04-10', 10250.0, 'EUR', 0, 0.0, 5125.0, 'paid', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [262/484] Untitled (#3) (RE-00057)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0262', 'SB-IMP-0262', 'Untitled (#3)', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10250.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-04-10', 10250.0, 'EUR', 0, 0.0, 5125.0, 'paid', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [263/484] Untitled (RE-00057)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0263', 'SB-IMP-0263', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 16250.0, 'EUR', 'sold', v_gal_11, 'painting', 'untitled_portrait', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2024-04-10', 16250.0, 'EUR', 0, 0.0, 8125.0, 'paid', 'Bexio RE-00057 | Payment: 29.04.2024 | Delivery: Madrid, Spain | Materials: Glass, Wood and Aluminum');

  -- [264/484] Untitled (RE-00056)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0264', 'SB-IMP-0264', 'Untitled', 'Glass', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00056 | Payment: 08.05.2024 | Delivery: Spanien | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-04-10', 9000.0, 'EUR', 0, 0.0, 4500.0, 'paid', 'Bexio RE-00056 | Payment: 08.05.2024 | Delivery: Spanien | Materials: Glass');

  -- [265/484] Untitled (RE-00054)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0265', 'SB-IMP-0265', 'Untitled', 'Glass, Wood and Aluminum', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 23000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00054 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-04-09', 23000.0, 'EUR', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00054 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [266/484] Untitled (RE-00053)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0266', 'SB-IMP-0266', 'Untitled', 'Glass, Wood and Aluminum', 2024, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, 5.0, 6500.0, 'USD', 'sold', v_gal_4, 'painting', 'untitled_portrait', 'Bexio RE-00053 | Payment: 29.04.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2024-04-08', 6500.0, 'USD', 75, 0.0, 1625.0, 'paid', 'Bexio RE-00053 | Payment: 29.04.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum');

  -- [267/484] Untitled (RE-00053)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0267', 'SB-IMP-0267', 'Untitled', 'Glass, Wood and Aluminum', 2024, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11000.0, 'USD', 'sold', v_gal_4, 'painting', 'untitled_portrait', 'Bexio RE-00053 | Payment: 29.04.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2024-04-08', 11000.0, 'USD', 75, 0.0, 2750.0, 'paid', 'Bexio RE-00053 | Payment: 29.04.2024 | Delivery: Thailand | Materials: Glass, Wood and Aluminum');

  -- [268/484] Production Costs for Edition — Le Corbusier (RE-00052)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0268', 'SB-IMP-0268', 'Production Costs for Edition — Le Corbusier', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 7814.0, 'EUR', 'sold', v_gal_21, 'sculpture', NULL, 'Bexio RE-00052 | Payment: 15.05.2024')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_21, '2024-04-08', 7814.0, 'EUR', 0, 0.0, 3907.0, 'paid', 'Bexio RE-00052 | Payment: 15.05.2024');

  -- [269/484] Fragile (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0269', 'SB-IMP-0269', 'Fragile', NULL, 2023, 30.0, 30.0, 5.0, 'cm', 30.0, 30.0, 5.0, NULL, 894.22, 'CHF', 'sold', v_gal_3, 'sculpture', NULL, 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 894.22, 'CHF', 50, 0.0, 447.11, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [270/484] Fragile (#2) (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0270', 'SB-IMP-0270', 'Fragile (#2)', NULL, 2023, 30.0, 30.0, 5.0, 'cm', 30.0, 30.0, 5.0, NULL, 894.22, 'CHF', 'sold', v_gal_3, 'sculpture', NULL, 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 894.22, 'CHF', 50, 0.0, 447.11, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [271/484] Fragile (#3) (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0271', 'SB-IMP-0271', 'Fragile (#3)', NULL, 2023, 30.0, 30.0, 5.0, 'cm', 30.0, 30.0, 5.0, NULL, 894.22, 'CHF', 'sold', v_gal_3, 'sculpture', NULL, 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 894.22, 'CHF', 50, 0.0, 447.11, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [272/484] Fragile (#4) (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0272', 'SB-IMP-0272', 'Fragile (#4)', NULL, 2023, 30.0, 30.0, 5.0, 'cm', 30.0, 30.0, 5.0, NULL, 894.22, 'CHF', 'sold', v_gal_3, 'sculpture', NULL, 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 894.22, 'CHF', 50, 0.0, 447.11, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [273/484] Untitled (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0273', 'SB-IMP-0273', 'Untitled', NULL, 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9713.23, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 9713.23, 'CHF', 50, 0.0, 4856.61, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [274/484] Untitled (Spiegel, rund) (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0274', 'SB-IMP-0274', 'Untitled (Spiegel, rund)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 16651.25, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2024-04-08', 16651.25, 'CHF', 50, 0.0, 8325.62, 'paid', 'Bexio RE-00051 | Payment: 24.04.2024 | Delivery: Schweiz');

  -- [275/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00050)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0275', 'SB-IMP-0275', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00050 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-04-05', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00050 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [276/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00050)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0276', 'SB-IMP-0276', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00050 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-04-05', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00050 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [277/484] Werkverkäufe - West Chelsea Contemporary (RE-00049)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0277', 'SB-IMP-0277', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00049 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-04-05', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00049 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [278/484] Werkverkäufe - West Chelsea Contemporary (RE-00048)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0278', 'SB-IMP-0278', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 17500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00048 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-04-05', 17500.0, 'USD', 0, 0.0, 8750.0, 'paid', 'Bexio RE-00048 | Payment: 05.04.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [279/484] Untitled (RE-00045)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0279', 'SB-IMP-0279', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00045 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-04-03', 14500.0, 'EUR', 0, 0.0, 7250.0, 'paid', 'Bexio RE-00045 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [280/484] Werkverkäufe - Hürlimann (#1) (RE-00044)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0280', 'SB-IMP-0280', 'Werkverkäufe - Hürlimann (#1)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13927.57660167131, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00044 | Payment: 26.03.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-03-26', 13927.57660167131, 'CHF', 0, 0.0, 6963.788300835655, 'paid', 'Bexio RE-00044 | Payment: 26.03.2024 | Delivery: Schweiz');

  -- [281/484] Werkverkäufe - Hürlimann (#2) (RE-00044)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0281', 'SB-IMP-0281', 'Werkverkäufe - Hürlimann (#2)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 13927.57660167131, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00044 | Payment: 26.03.2024 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-03-26', 13927.57660167131, 'CHF', 0, 0.0, 6963.788300835655, 'paid', 'Bexio RE-00044 | Payment: 26.03.2024 | Delivery: Schweiz');

  -- [282/484] Ausstellung Matthäuskirche (RE-00043)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0282', 'SB-IMP-0282', 'Ausstellung Matthäuskirche', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 9250.693802035154, 'CHF', 'sold', v_gal_9, 'sculpture', NULL, 'Bexio RE-00043 | Payment: 29.04.2024 | Exhibition: «ganz zerbrochen – zerbrochen ganz»')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_9, '2024-03-22', 9250.693802035154, 'CHF', 0, 0.0, 4625.346901017577, 'paid', 'Bexio RE-00043 | Payment: 29.04.2024 | Exhibition: «ganz zerbrochen – zerbrochen ganz»');

  -- [283/484] Untitled (Personal Commission) (RE-00038)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0283', 'SB-IMP-0283', 'Untitled (Personal Commission)', 'Glass, Wood and Aluminum', 2024, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 60000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00038 | Payment: 25.09.2024 | Delivery: Dubai, UAE | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2024-03-20', 60000.0, 'EUR', 0, 0.0, 30000.0, 'paid', 'Bexio RE-00038 | Payment: 25.09.2024 | Delivery: Dubai, UAE | Materials: Glass, Wood and Aluminum');

  -- [284/484] Untitled (Newton) (RE-00042)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0284', 'SB-IMP-0284', 'Untitled (Newton)', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 15500.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00042 | Payment: 23.07.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2024-03-15', 15500.0, 'EUR', 0, 0.0, 7750.0, 'paid', 'Bexio RE-00042 | Payment: 23.07.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [285/484] Fragile (Edition) (RE-00041)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0285', 'SB-IMP-0285', 'Fragile (Edition)', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 34000, 'EUR', 'sold', v_gal_20, 'sculpture', NULL, 'Bexio RE-00041 | Payment: 06.03.2024 | Exhibition: Spacejunk Grenoble | Delivery: France')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_20, '2024-03-06', 34000, 'EUR', 50, 0.0, 9066.65, 'paid', 'Bexio RE-00041 | Payment: 06.03.2024 | Exhibition: Spacejunk Grenoble | Delivery: France');

  -- [286/484] Untitled (Personal Commission) (RE-00040)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0286', 'SB-IMP-0286', 'Untitled (Personal Commission)', 'Glass', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 35600.0, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00040 | Payment: 01.03.2024 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-02-29', 35600.0, 'CHF', 0, 0.0, 17800.0, 'paid', 'Bexio RE-00040 | Payment: 01.03.2024 | Materials: Glass');

  -- [287/484] Untitled (RE-00039)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0287', 'SB-IMP-0287', 'Untitled', 'Glass, Wood and Aluminum', 2024, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 16000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00039 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2024-02-22', 16000.0, 'EUR', 0, 0.0, 8000.0, 'paid', 'Bexio RE-00039 | Payment: 23.07.2024 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [288/484] Werkverkäufe - West Chelsea Contemporary (RE-00037)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0288', 'SB-IMP-0288', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00037 | Payment: 11.02.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-02-11', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00037 | Payment: 11.02.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [289/484] Laurent Marthaler - Art Palm-Beach (RE-00036)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0289', 'SB-IMP-0289', 'Laurent Marthaler - Art Palm-Beach', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 70000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00036 | Payment: 11.02.2024 | Delivery: USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2024-02-11', 70000.0, 'USD', 50, 50.0, 35000.0, 'paid', 'Bexio RE-00036 | Payment: 11.02.2024 | Delivery: USA');

  -- [290/484] Werkverkäufe - West Chelsea Contemporary (RE-00034)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0290', 'SB-IMP-0290', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2024, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00034 | Payment: 10.01.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2024-01-10', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00034 | Payment: 10.01.2024 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [291/484] Untitled (Personal Commission) (RE-00009)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0291', 'SB-IMP-0291', 'Untitled (Personal Commission)', 'Glass', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 40050.0, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00009 | Payment: 23.01.2024 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2024-01-10', 40050.0, 'CHF', 0, 0.0, 20025.0, 'paid', 'Bexio RE-00009 | Payment: 23.01.2024 | Materials: Glass');

  -- [292/484] Werkverkäufe - Fabien Castanier Gallery (RE-00033)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0292', 'SB-IMP-0292', 'Werkverkäufe - Fabien Castanier Gallery', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 35100.0, 'USD', 'sold', v_gal_10, 'sculpture', NULL, 'Bexio RE-00033 | Payment: 29.12.2023 | Exhibition: Echoes | Delivery: Miami FL, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_10, '2023-12-29', 35100.0, 'USD', 0, 0.0, 17550.0, 'paid', 'Bexio RE-00033 | Payment: 29.12.2023 | Exhibition: Echoes | Delivery: Miami FL, USA');

  -- [293/484] Werkverkäufe - Art Miami (RE-00032)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0293', 'SB-IMP-0293', 'Werkverkäufe - Art Miami', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 130000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00032 | Payment: 29.12.2023 | Delivery: USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-12-29', 130000.0, 'USD', 0, 0.0, 65000.0, 'paid', 'Bexio RE-00032 | Payment: 29.12.2023 | Delivery: USA');

  -- [294/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0294', 'SB-IMP-0294', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15766.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00031 | Payment: 28.12.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-12-28', 15766.0, 'USD', 0, 0.0, 7883.0, 'paid', 'Bexio RE-00031 | Payment: 28.12.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [295/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0295', 'SB-IMP-0295', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15766.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00031 | Payment: 28.12.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-12-28', 15766.0, 'USD', 0, 0.0, 7883.0, 'paid', 'Bexio RE-00031 | Payment: 28.12.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [296/484] Untitled (RE-00030)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0296', 'SB-IMP-0296', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 23000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00030 | Payment: 18.12.2023 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-12-18', 23000.0, 'EUR', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00030 | Payment: 18.12.2023 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [297/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00029)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0297', 'SB-IMP-0297', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00029 | Payment: 28.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-28', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00029 | Payment: 28.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [298/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00029)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0298', 'SB-IMP-0298', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 27500.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00029 | Payment: 28.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-28', 27500.0, 'USD', 0, 0.0, 13750.0, 'paid', 'Bexio RE-00029 | Payment: 28.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [299/484] Skull Cube (RE-00028)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0299', 'SB-IMP-0299', 'Skull Cube', 'Glass', 2023, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, 135.0, 35500.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00028 | Payment: 28.11.2023 | Delivery: Spanien | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-11-22', 35500.0, 'EUR', 50, 0.0, 17750.0, 'paid', 'Bexio RE-00028 | Payment: 28.11.2023 | Delivery: Spanien | Materials: Glass');

  -- [300/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00027)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0300', 'SB-IMP-0300', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 23833.333333333332, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 23833.333333333332, 'USD', 0, 0.0, 11916.666666666666, 'paid', 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [301/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00027)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0301', 'SB-IMP-0301', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 23833.333333333332, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 23833.333333333332, 'USD', 0, 0.0, 11916.666666666666, 'paid', 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [302/484] Werkverkäufe - West Chelsea Contemporary (#3) (RE-00027)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0302', 'SB-IMP-0302', 'Werkverkäufe - West Chelsea Contemporary (#3)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 23833.333333333332, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 23833.333333333332, 'USD', 0, 0.0, 11916.666666666666, 'paid', 'Bexio RE-00027 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [303/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00026)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0303', 'SB-IMP-0303', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 15000.0, 'USD', 0, 0.0, 7500.0, 'paid', 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [304/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00026)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0304', 'SB-IMP-0304', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 15000.0, 'USD', 0, 0.0, 7500.0, 'paid', 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [305/484] Werkverkäufe - West Chelsea Contemporary (#3) (RE-00026)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0305', 'SB-IMP-0305', 'Werkverkäufe - West Chelsea Contemporary (#3)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 15000.0, 'USD', 0, 0.0, 7500.0, 'paid', 'Bexio RE-00026 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [306/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00025)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0306', 'SB-IMP-0306', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 22000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00025 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 22000.0, 'USD', 0, 0.0, 11000.0, 'paid', 'Bexio RE-00025 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [307/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00025)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0307', 'SB-IMP-0307', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 22000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00025 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 22000.0, 'USD', 0, 0.0, 11000.0, 'paid', 'Bexio RE-00025 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [308/484] Werkverkäufe - West Chelsea Contemporary (#1) (RE-00024)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0308', 'SB-IMP-0308', 'Werkverkäufe - West Chelsea Contemporary (#1)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 18000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 18000.0, 'USD', 0, 0.0, 9000.0, 'paid', 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [309/484] Werkverkäufe - West Chelsea Contemporary (#2) (RE-00024)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0309', 'SB-IMP-0309', 'Werkverkäufe - West Chelsea Contemporary (#2)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 18000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 18000.0, 'USD', 0, 0.0, 9000.0, 'paid', 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [310/484] Werkverkäufe - West Chelsea Contemporary (#3) (RE-00024)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0310', 'SB-IMP-0310', 'Werkverkäufe - West Chelsea Contemporary (#3)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 18000.0, 'USD', 'sold', v_gal_23, 'sculpture', NULL, 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_23, '2023-11-22', 18000.0, 'USD', 0, 0.0, 9000.0, 'paid', 'Bexio RE-00024 | Payment: 22.11.2023 | Exhibition: Beauty in Destruction | Delivery: Austin TX, USA');

  -- [311/484] Untitled (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0311', 'SB-IMP-0311', 'Untitled', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-11-21', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [312/484] Untitled (#2) (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0312', 'SB-IMP-0312', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-11-21', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [313/484] Untitled (#3) (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0313', 'SB-IMP-0313', 'Untitled (#3)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-11-21', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [314/484] Untitled (#4) (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0314', 'SB-IMP-0314', 'Untitled (#4)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-11-21', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [315/484] Untitled (#5) (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0315', 'SB-IMP-0315', 'Untitled (#5)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'untitled_portrait', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-11-21', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00023 | Payment: 06.12.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [316/484] Untitled (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0316', 'SB-IMP-0316', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 24000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 24000.0, 'EUR', 0, 0.0, 12000.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [317/484] Untitled (#2) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0317', 'SB-IMP-0317', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 24000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 24000.0, 'EUR', 0, 0.0, 12000.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [318/484] Untitled (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0318', 'SB-IMP-0318', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 21000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 21000.0, 'EUR', 0, 0.0, 10500.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [319/484] Untitled (#2) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0319', 'SB-IMP-0319', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 21000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 21000.0, 'EUR', 0, 0.0, 10500.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [320/484] Untitled (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0320', 'SB-IMP-0320', 'Untitled', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [321/484] Untitled (#2) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0321', 'SB-IMP-0321', 'Untitled (#2)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [322/484] Untitled (#3) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0322', 'SB-IMP-0322', 'Untitled (#3)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [323/484] Untitled (#4) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0323', 'SB-IMP-0323', 'Untitled (#4)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [324/484] Untitled (#5) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0324', 'SB-IMP-0324', 'Untitled (#5)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [325/484] Untitled (#6) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0325', 'SB-IMP-0325', 'Untitled (#6)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [326/484] Untitled (#7) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0326', 'SB-IMP-0326', 'Untitled (#7)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [327/484] Untitled (#8) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0327', 'SB-IMP-0327', 'Untitled (#8)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [328/484] Untitled (#9) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0328', 'SB-IMP-0328', 'Untitled (#9)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [329/484] Untitled (#10) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0329', 'SB-IMP-0329', 'Untitled (#10)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 13500.0, 'EUR', 0, 0.0, 6750.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [330/484] Untitled (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0330', 'SB-IMP-0330', 'Untitled', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 14000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 14000.0, 'EUR', 0, 0.0, 7000.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [331/484] Untitled (Skull Cube) (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0331', 'SB-IMP-0331', 'Untitled (Skull Cube)', 'Glass', 2023, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 35000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-11-08', 35000.0, 'EUR', 0, 0.0, 17500.0, 'paid', 'Bexio RE-00020 | Payment: 22.11.2023 | Exhibition: Icone Artgallery, Touquet-Paris-Plage | Delivery: France | Materials: Glass');

  -- [332/484] Untitled (Skull Portrait) (RE-00016)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0332', 'SB-IMP-0332', 'Untitled (Skull Portrait)', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 22500.0, 'EUR', 'sold', v_gal_0, 'painting', 'skull', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-10-26', 22500.0, 'EUR', 0, 0.0, 11250.0, 'paid', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [333/484] Untitled (RE-00016)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0333', 'SB-IMP-0333', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150, 150, 15, 'cm', 150, 150, 15, 90.0, 22500.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-10-26', 22500.0, 'EUR', 0, 0.0, 11250.0, 'paid', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [334/484] Untitled (RE-00016)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0334', 'SB-IMP-0334', 'Untitled', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 13000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-10-26', 13000.0, 'EUR', 0, 0.0, 6500.0, 'paid', 'Bexio RE-00016 | Payment: 08.11.2023 | Exhibition: La Villa Calvi, Corsica | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [335/484] Untitled (Mirror I) (RE-00018)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0335', 'SB-IMP-0335', 'Untitled (Mirror I)', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12534.82, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-10-20', 12534.82, 'CHF', 50, 0.0, 6267.41, 'paid', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz');

  -- [336/484] Untitled (Face I) (RE-00018)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0336', 'SB-IMP-0336', 'Untitled (Face I)', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13927.58, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-10-20', 13927.58, 'CHF', 50, 0.0, 6963.79, 'paid', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz');

  -- [337/484] Untitled (Face V) (RE-00018)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0337', 'SB-IMP-0337', 'Untitled (Face V)', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12534.82, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-10-20', 12534.82, 'CHF', 50, 0.0, 6267.41, 'paid', 'Bexio RE-00018 | Payment: 22.11.2023 | Delivery: Schweiz');

  -- [338/484] Untitled (RE-00017)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0338', 'SB-IMP-0338', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 35.0, 23000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00017 | Payment: 25.10.2023 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-09-28', 23000.0, 'EUR', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00017 | Payment: 25.10.2023 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [339/484] Untitled (RE-00017)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0339', 'SB-IMP-0339', 'Untitled', 'Glass, Wood and Aluminum', 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 35.0, 23000.0, 'EUR', 'sold', v_gal_0, 'painting', 'untitled_portrait', 'Bexio RE-00017 | Payment: 25.10.2023 | Delivery: France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-09-28', 23000.0, 'EUR', 0, 0.0, 11500.0, 'paid', 'Bexio RE-00017 | Payment: 25.10.2023 | Delivery: France | Materials: Glass, Wood and Aluminum');

  -- [340/484] Untitled (Tower I) (RE-00015)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0340', 'SB-IMP-0340', 'Untitled (Tower I)', NULL, 2022, 50.0, 30.0, 12.0, 'cm', 50.0, 30.0, 12.0, NULL, 22284.12, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00015 | Payment: 09.11.2023 | Delivery: Schweiz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-09-27', 22284.12, 'CHF', 50, 0.0, 11142.06, 'paid', 'Bexio RE-00015 | Payment: 09.11.2023 | Delivery: Schweiz');

  -- [341/484] Untitled (Lion) (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0341', 'SB-IMP-0341', 'Untitled (Lion)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 8000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-26', 8000.0, 'EUR', 0, 0.0, 4000.0, 'paid', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum');

  -- [342/484] Untitled (Lion #2) (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0342', 'SB-IMP-0342', 'Untitled (Lion #2)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 8000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-26', 8000.0, 'EUR', 0, 0.0, 4000.0, 'paid', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum');

  -- [343/484] Untitled (Dobbermann) (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0343', 'SB-IMP-0343', 'Untitled (Dobbermann)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 8000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-26', 8000.0, 'EUR', 0, 0.0, 4000.0, 'paid', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum');

  -- [344/484] Untitled (Scorpion) (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0344', 'SB-IMP-0344', 'Untitled (Scorpion)', 'Glass, Wood and Aluminum', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 6000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-26', 6000.0, 'EUR', 0, 0.0, 3000.0, 'paid', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum');

  -- [345/484] Untitled (Lion #3) (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0345', 'SB-IMP-0345', 'Untitled (Lion #3)', 'Glass, Wood and Aluminum', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 6000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-26', 6000.0, 'EUR', 0, 0.0, 3000.0, 'paid', 'Bexio RE-00013 | Payment: 08.11.2023 | Delivery: Belgium | Materials: Glass, Wood and Aluminum');

  -- [346/484] Projekt Bruichladdich, London, UK (RE-00012)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0346', 'SB-IMP-0346', 'Projekt Bruichladdich, London, UK', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 40000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00012 | Payment: 26.09.2023 | Delivery: London, UK')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-09-18', 40000.0, 'USD', 0, 0.0, 20000.0, 'paid', 'Bexio RE-00012 | Payment: 26.09.2023 | Delivery: London, UK');

  -- [347/484] Untitled (Skull) (RE-00010)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0347', 'SB-IMP-0347', 'Untitled (Skull)', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 12000.0, 'EUR', 'sold', v_gal_5, 'painting', 'skull', 'Bexio RE-00010 | Payment: 15.03.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_5, '2023-09-18', 12000.0, 'EUR', 0, 0.0, 6000.0, 'paid', 'Bexio RE-00010 | Payment: 15.03.2024 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [348/484] Untitled (RE-00008)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0348', 'SB-IMP-0348', 'Untitled', 'Glass', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 6499.54, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00008 | Payment: 25.09.2023 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-09-07', 6499.54, 'CHF', 0, 0.0, 3249.77, 'paid', 'Bexio RE-00008 | Payment: 25.09.2023 | Materials: Glass');

  -- [349/484] Untitled (RE-00007)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0349', 'SB-IMP-0349', 'Untitled', 'Glass', 2023, 35.0, 30.0, 10.0, 'cm', 35.0, 30.0, 10.0, 35.0, 13927.58, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00007 | Payment: 25.09.2023 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-09-07', 13927.58, 'CHF', 0, 0.0, 6963.79, 'paid', 'Bexio RE-00007 | Payment: 25.09.2023 | Materials: Glass');

  -- [350/484] Untitled (RE-00003)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0350', 'SB-IMP-0350', 'Untitled', 'Glass, Wood and Aluminum', 2023, 100.0, 100.0, 10.0, 'cm', 100.0, 100.0, 10.0, 35.0, 24000.0, 'EUR', 'sold', v_gal_8, 'painting', 'untitled_portrait', 'Bexio RE-00003 | Payment: 09.11.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-09-07', 24000.0, 'EUR', 0, 0.0, 12000.0, 'paid', 'Bexio RE-00003 | Payment: 09.11.2023 | Delivery: Italy | Materials: Glass, Wood and Aluminum');

  -- [351/484] Artwork Sale (RE-00002)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0351', 'SB-IMP-0351', 'Artwork Sale', 'Glass, Wood and Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00002 | Payment: 26.09.2023 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-09-07', 14000.0, 'EUR', 0, 0.0, 7000.0, 'paid', 'Bexio RE-00002 | Payment: 26.09.2023 | Delivery: Paris, France | Materials: Glass, Wood and Aluminum');

  -- [352/484] Sisecam Edition (45 numbers) (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0352', 'SB-IMP-0352', 'Sisecam Edition (45 numbers)', 'Glass', 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 540000, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 26.09.2023 | Exhibition: Sisecam Istanbul | Delivery: Istanbul, Turkey | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-09-01', 540000, 'USD', 0, 0.0, 270000, 'paid', 'Bexio RE-00001 | Payment: 26.09.2023 | Exhibition: Sisecam Istanbul | Delivery: Istanbul, Turkey | Materials: Glass');

  -- [353/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0353', 'SB-IMP-0353', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 15000.0, 'USD', 40, 0.0, 7500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [354/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0354', 'SB-IMP-0354', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 15000.0, 'USD', 40, 0.0, 7500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [355/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0355', 'SB-IMP-0355', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 15000.0, 'USD', 40, 0.0, 7500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [356/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0356', 'SB-IMP-0356', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 15000.0, 'USD', 40, 0.0, 7500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [357/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0357', 'SB-IMP-0357', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 25000.0, 'USD', 40, 0.0, 12500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [358/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0358', 'SB-IMP-0358', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 25000.0, 'USD', 40, 0.0, 12500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [359/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0359', 'SB-IMP-0359', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 25000.0, 'USD', 40, 0.0, 12500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [360/484] Werkverkäufe - West Chelsea Contemporary (RE-00001)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0360', 'SB-IMP-0360', 'Werkverkäufe - West Chelsea Contemporary', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00001 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-06', 25000.0, 'USD', 40, 0.0, 12500.0, 'paid', 'Bexio RE-00001 | Payment: 27.10.2022');

  -- [361/484] Atatürk (RE-00002)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0361', 'SB-IMP-0361', 'Atatürk', NULL, 2022, 200.0, 200.0, NULL, 'cm', 200.0, 200.0, NULL, NULL, 50000.0, 'EUR', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00002 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-24', 50000.0, 'EUR', 50, 0.0, 25000.0, 'paid', 'Bexio RE-00002 | Payment: 27.10.2022');

  -- [362/484] Kollaboration mit Pierre-Alain Münger (RE-00003)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0362', 'SB-IMP-0362', 'Kollaboration mit Pierre-Alain Münger', NULL, 2022, 50.0, 100.0, NULL, 'cm', 50.0, 100.0, NULL, NULL, 24000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00003 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-24', 24000.0, 'USD', 50, 0.0, 12000.0, 'paid', 'Bexio RE-00003 | Payment: 27.10.2022');

  -- [363/484] Spezialmass (RE-00004)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0363', 'SB-IMP-0363', 'Spezialmass', NULL, 2022, 125.0, 125.0, NULL, 'cm', 125.0, 125.0, NULL, NULL, 20000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00004 | Payment: 07.11.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-24', 20000.0, 'USD', 50, 0.0, 10000.0, 'paid', 'Bexio RE-00004 | Payment: 07.11.2022');

  -- [364/484] Salvator Mundi (RE-00005)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0364', 'SB-IMP-0364', 'Salvator Mundi', NULL, 2022, 150.0, 100.0, 15.0, 'cm', 150.0, 100.0, 15.0, 100.0, 25000.0, 'EUR', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00005 | Payment: 07.11.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-24', 25000.0, 'EUR', 50, 0.0, 12500.0, 'paid', 'Bexio RE-00005 | Payment: 07.11.2022');

  -- [365/484] Galerie Zürich (RE-00006)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0365', 'SB-IMP-0365', 'Galerie Zürich', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00006 | Payment: 07.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-10-24', 12000.0, 'CHF', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00006 | Payment: 07.12.2022');

  -- [366/484] PortrHate (RE-00007)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0366', 'SB-IMP-0366', 'PortrHate', NULL, 2022, 200.0, 200.0, NULL, 'cm', 200.0, 200.0, NULL, NULL, 30000.0, 'EUR', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00007 | Payment: 15.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-03-10', 30000.0, 'EUR', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00007 | Payment: 15.03.2023');

  -- [367/484] Live Performance - St-art Strasbourg (RE-00008)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0367', 'SB-IMP-0367', 'Live Performance - St-art Strasbourg', NULL, 2022, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, NULL, 22500.0, 'EUR', 'sold', v_gal_18, 'sculpture', NULL, 'Bexio RE-00008 | Payment: 14.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 22500.0, 'EUR', 50, 0.0, 11250.0, 'paid', 'Bexio RE-00008 | Payment: 14.12.2022');

  -- [368/484] Untitled (RE-00010)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0368', 'SB-IMP-0368', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00010 | Payment: 07.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2022-10-24', 14000.0, 'CHF', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00010 | Payment: 07.12.2022');

  -- [369/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0369', 'SB-IMP-0369', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [370/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0370', 'SB-IMP-0370', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [371/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0371', 'SB-IMP-0371', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [372/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0372', 'SB-IMP-0372', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [373/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0373', 'SB-IMP-0373', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [374/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0374', 'SB-IMP-0374', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [375/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0375', 'SB-IMP-0375', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [376/484] Untitled (RE-00011)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0376', 'SB-IMP-0376', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00011 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-22', 12000.0, 'EUR', 50, 0.0, 4800.0, 'paid', 'Bexio RE-00011 | Payment: 09.12.2022');

  -- [377/484] Untitled (RE-00012)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0377', 'SB-IMP-0377', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00012 | Payment: 27.10.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2022-10-26', 15000.0, 'USD', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00012 | Payment: 27.10.2022');

  -- [378/484] Kunst Zürich (RE-00013)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0378', 'SB-IMP-0378', 'Kunst Zürich', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'CHF', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00013 | Payment: 20.11.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-11-02', 15000.0, 'CHF', 50, 20.0, 6000.0, 'paid', 'Bexio RE-00013 | Payment: 20.11.2022');

  -- [379/484] NOA Collection (RE-00014)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0379', 'SB-IMP-0379', 'NOA Collection', 'Holz', 2019, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 3750.0, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00014 | Payment: 07.12.2022 | Materials: Holz')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-11-09', 3750.0, 'CHF', 50, 0.0, 1875.0, 'paid', 'Bexio RE-00014 | Payment: 07.12.2022 | Materials: Holz');

  -- [380/484] Table #1/10 (RE-00018)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0380', 'SB-IMP-0380', 'Table #1/10', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 6000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00018 | Payment: 14.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-01-02', 6000.0, 'EUR', 50, 0.0, 3000.0, 'paid', 'Bexio RE-00018 | Payment: 14.03.2023');

  -- [381/484] Table #1 (RE-00019)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0381', 'SB-IMP-0381', 'Table #1', NULL, 2022, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 39000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00019 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-11-15', 39000.0, 'EUR', 95, 0.0, 1950.0, 'paid', 'Bexio RE-00019 | Payment: 09.12.2022');

  -- [382/484] Untitled (RE-00020)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0382', 'SB-IMP-0382', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00020 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2022-11-24', 8000.0, 'CHF', 50, 0.0, 4000.0, 'paid', 'Bexio RE-00020 | Payment: 02.02.2023');

  -- [383/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0383', 'SB-IMP-0383', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [384/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0384', 'SB-IMP-0384', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [385/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0385', 'SB-IMP-0385', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [386/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0386', 'SB-IMP-0386', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [387/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0387', 'SB-IMP-0387', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 8500.0, 'EUR', 50, 0.0, 4250.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [388/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0388', 'SB-IMP-0388', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 8500.0, 'EUR', 50, 0.0, 4250.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [389/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0389', 'SB-IMP-0389', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 8500.0, 'EUR', 50, 0.0, 4250.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [390/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0390', 'SB-IMP-0390', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 8500.0, 'EUR', 50, 0.0, 4250.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [391/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0391', 'SB-IMP-0391', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 5250.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 5250.0, 'EUR', 50, 0.0, 2625.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [392/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0392', 'SB-IMP-0392', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 5250.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 5250.0, 'EUR', 50, 0.0, 2625.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [393/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0393', 'SB-IMP-0393', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 5250.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 5250.0, 'EUR', 50, 0.0, 2625.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [394/484] Untitled (RE-00022)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0394', 'SB-IMP-0394', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 5250.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00022 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 5250.0, 'EUR', 50, 0.0, 2625.0, 'paid', 'Bexio RE-00022 | Payment: 09.12.2022');

  -- [395/484] Untitled (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0395', 'SB-IMP-0395', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00023 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00023 | Payment: 02.02.2023');

  -- [396/484] Untitled (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0396', 'SB-IMP-0396', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00023 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00023 | Payment: 02.02.2023');

  -- [397/484] Untitled (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0397', 'SB-IMP-0397', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 8500.0, 'EUR', 'sold', v_gal_18, 'sculpture', 'untitled_portrait', 'Bexio RE-00023 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 8500.0, 'EUR', 50, 0.0, 4250.0, 'paid', 'Bexio RE-00023 | Payment: 02.02.2023');

  -- [398/484] Cube (RE-00023)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0398', 'SB-IMP-0398', 'Cube', NULL, 2022, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, NULL, 22500.0, 'EUR', 'sold', v_gal_18, 'sculpture', NULL, 'Bexio RE-00023 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_18, '2022-12-02', 22500.0, 'EUR', 50, 0.0, 11250.0, 'paid', 'Bexio RE-00023 | Payment: 02.02.2023');

  -- [399/484] Untitled (RE-00024)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0399', 'SB-IMP-0399', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00024 | Payment: 09.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-07', 15000.0, 'EUR', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00024 | Payment: 09.12.2022');

  -- [400/484] Untitled (RE-00025)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0400', 'SB-IMP-0400', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 6000.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00025 | Payment: 13.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2022-12-07', 6000.0, 'USD', 50, 0.0, 3000.0, 'paid', 'Bexio RE-00025 | Payment: 13.12.2022');

  -- [401/484] Untitled (RE-00026)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0401', 'SB-IMP-0401', 'Untitled', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00026 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2022-12-08', 9000.0, 'CHF', 50, 0.0, 4500.0, 'paid', 'Bexio RE-00026 | Payment: 02.02.2023');

  -- [402/484] Art Miami - Werkverkäufe (RE-00027)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0402', 'SB-IMP-0402', 'Art Miami - Werkverkäufe', NULL, 2022, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 287600.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00027 | Payment: 14.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-12-13', 287600.0, 'USD', 50, 0.0, 143800.0, 'paid', 'Bexio RE-00027 | Payment: 14.12.2022');

  -- [403/484] Untitled (RE-00028)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0403', 'SB-IMP-0403', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00028 | Payment: 14.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-12-14', 15000.0, 'CHF', 50, 20.0, 6000.0, 'paid', 'Bexio RE-00028 | Payment: 14.12.2022');

  -- [404/484] Untitled (RE-00029)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0404', 'SB-IMP-0404', 'Untitled', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'EUR', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00029 | Payment: 14.12.2022')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2022-12-14', 25000.0, 'EUR', 50, 20.0, 10000.0, 'paid', 'Bexio RE-00029 | Payment: 14.12.2022');

  -- [405/484] Face VI (RE-00030)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0405', 'SB-IMP-0405', 'Face VI', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15500.0, 'CHF', 'sold', v_gal_3, 'sculpture', NULL, 'Bexio RE-00030 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2022-12-20', 15500.0, 'CHF', 50, 0.0, 7750.0, 'paid', 'Bexio RE-00030 | Payment: 02.02.2023');

  -- [406/484] Untitled (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0406', 'SB-IMP-0406', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00031 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-20', 15000.0, 'EUR', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00031 | Payment: 02.02.2023');

  -- [407/484] Untitled (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0407', 'SB-IMP-0407', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00031 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-20', 15000.0, 'EUR', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00031 | Payment: 02.02.2023');

  -- [408/484] Untitled (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0408', 'SB-IMP-0408', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00031 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-20', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00031 | Payment: 02.02.2023');

  -- [409/484] Untitled (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0409', 'SB-IMP-0409', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13500.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00031 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-20', 13500.0, 'EUR', 50, 0.0, 6750.0, 'paid', 'Bexio RE-00031 | Payment: 02.02.2023');

  -- [410/484] Skull Cube (RE-00031)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0410', 'SB-IMP-0410', 'Skull Cube', NULL, 2022, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 30000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00031 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2022-12-20', 30000.0, 'EUR', 50, 0.0, 15000.0, 'paid', 'Bexio RE-00031 | Payment: 02.02.2023');

  -- [411/484] Agence DS - Dezember (RE-00032)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0411', 'SB-IMP-0411', 'Agence DS - Dezember', NULL, 2022, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 38750.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00032 | Payment: 05.01.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2022-12-20', 38750.0, 'EUR', 50, 0.0, 19375.0, 'paid', 'Bexio RE-00032 | Payment: 05.01.2023');

  -- [412/484] Artwalk Honorar 2022 (RE-00033)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0412', 'SB-IMP-0412', 'Artwalk Honorar 2022', NULL, 2022, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 1200.0, 'CHF', 'sold', v_gal_9, 'sculpture', NULL, 'Bexio RE-00033 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_9, '2023-01-13', 1200.0, 'CHF', 50, 0.0, 600.0, 'paid', 'Bexio RE-00033 | Payment: 02.02.2023');

  -- [413/484] Untitled (RE-00034)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0413', 'SB-IMP-0413', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00034 | Payment: 02.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-01', 13000.0, 'CHF', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00034 | Payment: 02.02.2023');

  -- [414/484] Untitled (RE-00035)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0414', '502', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15000.0, 'CHF', 'sold', v_gal_22, 'sculpture', 'untitled_portrait', 'Bexio RE-00035 | Payment: 14.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_22, '2023-02-02', 15000.0, 'CHF', 40, 0.0, 9000.0, 'paid', 'Bexio RE-00035 | Payment: 14.03.2023');

  -- [415/484] Carte Blanche (RE-00036)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0415', 'SB-IMP-0415', 'Carte Blanche', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 400.0, 'CHF', 'sold', v_gal_9, 'sculpture', NULL, 'Bexio RE-00036 | Payment: 14.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_9, '2023-02-02', 400.0, 'CHF', 50, 0.0, 200.0, 'paid', 'Bexio RE-00036 | Payment: 14.03.2023');

  -- [416/484] Untiled (RE-00037)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0416', 'SB-IMP-0416', 'Untiled', NULL, 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 25000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00037 | Payment: 15.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-15', 25000.0, 'USD', 50, 0.0, 12500.0, 'paid', 'Bexio RE-00037 | Payment: 15.02.2023');

  -- [417/484] Skull Cube (RE-00038)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0417', 'SB-IMP-0417', 'Skull Cube', NULL, 2023, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 37985.0, 'USD', 'sold', v_gal_16, 'sculpture', 'skull', 'Bexio RE-00038 | Payment: 15.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-15', 37985.0, 'USD', 50, 0.0, 18992.5, 'paid', 'Bexio RE-00038 | Payment: 15.02.2023');

  -- [418/484] Untitled (RE-00039)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0418', 'AU22-SBR0019 / Untitled', 'Untitled', NULL, 2022, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16500.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00039 | Payment: 16.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2023-02-15', 16500.0, 'USD', 50, 0.0, 8250.0, 'paid', 'Bexio RE-00039 | Payment: 16.02.2023');

  -- [419/484] Untitled (RE-00040)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0419', 'SB-IMP-0419', 'Untitled', NULL, 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 22000.0, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00040 | Payment: 23.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-02-23', 22000.0, 'CHF', 50, 0.0, 11000.0, 'paid', 'Bexio RE-00040 | Payment: 23.02.2023');

  -- [420/484] Werkverkäufe Art Wynnwood (RE-00041)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0420', 'SB-IMP-0420', 'Werkverkäufe Art Wynnwood', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 58000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00041 | Payment: 27.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-27', 58000.0, 'USD', 50, 0.0, 29000.0, 'paid', 'Bexio RE-00041 | Payment: 27.02.2023');

  -- [421/484] Werk im Auftrag (RE-00042)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0421', 'SB-IMP-0421', 'Werk im Auftrag', NULL, 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 75000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00042 | Payment: 27.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-27', 75000.0, 'USD', 50, 0.0, 37500.0, 'paid', 'Bexio RE-00042 | Payment: 27.02.2023');

  -- [422/484] Netflix (Sonic) (RE-00043)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0422', 'SB-IMP-0422', 'Netflix (Sonic)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 50000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00043 | Payment: 27.02.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-02-27', 50000.0, 'USD', 50, 0.0, 25000.0, 'paid', 'Bexio RE-00043 | Payment: 27.02.2023');

  -- [423/484] Untitled (RE-00046)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0423', 'SB-IMP-0423', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15555.56, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00046 | Payment: 03.04.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-03-08', 15555.56, 'CHF', 50, 10.0, 7000.0, 'paid', 'Bexio RE-00046 | Payment: 03.04.2023');

  -- [424/484] La Villa Calvi (Package) (RE-00047)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0424', 'SB-IMP-0424', 'La Villa Calvi (Package)', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 95000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00047 | Payment: 16.06.2023 | Split payment')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-03-13', 95000.0, 'EUR', 50, 0.0, 47500.0, 'paid', 'Bexio RE-00047 | Payment: 16.06.2023 | Split payment');

  -- [425/484] Untitled (Skull Portrait) (RE-00048)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0425', 'SB-IMP-0425', 'Untitled (Skull Portrait)', NULL, 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 46000.0, 'EUR', 'sold', v_gal_19, 'sculpture', 'skull', 'Bexio RE-00048 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-03-14', 46000.0, 'EUR', 50, 0.0, 23000.0, 'paid', 'Bexio RE-00048 | Payment: 16.06.2023');

  -- [426/484] Untitled (RE-00049)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0426', 'SB-IMP-0426', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13200.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00049 | Payment: 30.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-03-14', 13200.0, 'EUR', 50, 0.0, 6600.0, 'paid', 'Bexio RE-00049 | Payment: 30.03.2023');

  -- [427/484] Ausstellung - Museo del Vetro - Rate 1 (RE-00050)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0427', 'SB-IMP-0427', 'Ausstellung - Museo del Vetro - Rate 1', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 81975.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00050 | Payment: 05.01.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-01-05', 81975.0, 'EUR', 50, 0.0, 40987.5, 'paid', 'Bexio RE-00050 | Payment: 05.01.2023');

  -- [428/484] Ausstellung - Museo del Vetro - Rate 2 (RE-00051)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0428', 'SB-IMP-0428', 'Ausstellung - Museo del Vetro - Rate 2', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 60975.0, 'EUR', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00051 | Payment: 30.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-05-08', 60975.0, 'EUR', 50, 0.0, 30487.5, 'paid', 'Bexio RE-00051 | Payment: 30.06.2023');

  -- [429/484] Untitled (RE-00052)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0429', 'SB-IMP-0429', 'Untitled', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 33000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00052 | Payment: 15.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-03-15', 33000.0, 'CHF', 50, 0.0, 16500.0, 'paid', 'Bexio RE-00052 | Payment: 15.03.2023');

  -- [430/484] Untitled (RE-00053)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0430', 'SB-IMP-0430', 'Untitled', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 22000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00053 | Payment: 15.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-03-15', 22000.0, 'CHF', 50, 0.0, 11000.0, 'paid', 'Bexio RE-00053 | Payment: 15.03.2023');

  -- [431/484] Untitled (RE-00054)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0431', 'AU22-SBR0003 / Untitled', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 6500.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00054 | Payment: 30.03.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2023-03-22', 6500.0, 'USD', 50, 0.0, 3250.0, 'paid', 'Bexio RE-00054 | Payment: 30.03.2023');

  -- [432/484] Untitled (RE-00055)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0432', 'SB-IMP-0432', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00055 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-03-30', 14000.0, 'EUR', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00055 | Payment: 10.05.2023');

  -- [433/484] Untitled (RE-00056)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0433', 'SB-IMP-0433', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15500.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00056 | Payment: 01.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-04-03', 15500.0, 'CHF', 50, 0.0, 7750.0, 'paid', 'Bexio RE-00056 | Payment: 01.05.2023');

  -- [434/484] Skull (RE-00059)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0434', 'SB-IMP-0434', 'Skull', NULL, 2023, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, NULL, 21000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'skull', 'Bexio RE-00059 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-04-18', 21000.0, 'EUR', 50, 0.0, 10500.0, 'paid', 'Bexio RE-00059 | Payment: 10.05.2023');

  -- [435/484] Untitled (RE-00060)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0435', 'SB-IMP-0435', 'Untitled', NULL, 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 21000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00060 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-04-20', 21000.0, 'EUR', 50, 0.0, 10500.0, 'paid', 'Bexio RE-00060 | Payment: 10.05.2023');

  -- [436/484] Untitled (RE-00061)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0436', 'SB-IMP-0436', 'Untitled', NULL, 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 9000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00061 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-04-20', 9000.0, 'EUR', 50, 0.0, 4500.0, 'paid', 'Bexio RE-00061 | Payment: 10.05.2023');

  -- [437/484] Untitled (RE-00062)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0437', 'SB-IMP-0437', 'Untitled', NULL, 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00062 | Payment: 25.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-04-20', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00062 | Payment: 25.05.2023');

  -- [438/484] Untitled (RE-00063)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0438', 'SB-IMP-0438', 'Untitled', 'Glass, Wood, Aluminum', 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 27500.0, 'USD', 'sold', v_gal_11, 'sculpture', 'untitled_portrait', 'Bexio RE-00063 | Payment: 18.05.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2023-04-25', 27500.0, 'USD', 50, 0.0, 13750.0, 'paid', 'Bexio RE-00063 | Payment: 18.05.2023 | Materials: Glass, Wood, Aluminum');

  -- [439/484] Reflected Identities - Sold Mirrors (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0439', 'SB-IMP-0439', 'Reflected Identities - Sold Mirrors', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00066 | Payment: 24.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-10', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00066 | Payment: 24.05.2023');

  -- [440/484] Reflected Identities - Sold Mirrors (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0440', 'SB-IMP-0440', 'Reflected Identities - Sold Mirrors', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00066 | Payment: 24.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-10', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00066 | Payment: 24.05.2023');

  -- [441/484] Reflected Identities - Sold Mirrors (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0441', 'SB-IMP-0441', 'Reflected Identities - Sold Mirrors', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00066 | Payment: 24.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-10', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00066 | Payment: 24.05.2023');

  -- [442/484] Reflected Identities - Sold Mirrors (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0442', 'SB-IMP-0442', 'Reflected Identities - Sold Mirrors', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00066 | Payment: 24.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-10', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00066 | Payment: 24.05.2023');

  -- [443/484] Reflected Identities - Sold Mirrors (RE-00066)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0443', 'SB-IMP-0443', 'Reflected Identities - Sold Mirrors', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 10000.0, 'EUR', 'sold', v_gal_0, 'sculpture', NULL, 'Bexio RE-00066 | Payment: 24.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-10', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00066 | Payment: 24.05.2023');

  -- [444/484] Untitled (RE-00068)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0444', 'SB-IMP-0444', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 15555.56, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00068 | Payment: 22.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-05-02', 15555.56, 'CHF', 50, 10.0, 7000.0, 'paid', 'Bexio RE-00068 | Payment: 22.06.2023');

  -- [445/484] Untitled (RE-00069)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0445', 'SB-IMP-0445', 'Untitled', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00069 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-10', 15000.0, 'CHF', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00069 | Payment: 10.05.2023');

  -- [446/484] Untitled (RE-00069)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0446', 'SB-IMP-0446', 'Untitled', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 15000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00069 | Payment: 10.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-10', 15000.0, 'CHF', 50, 0.0, 7500.0, 'paid', 'Bexio RE-00069 | Payment: 10.05.2023');

  -- [447/484] Gallotti e Radice - Material 2023 (RE-00070)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0447', 'SB-IMP-0447', 'Gallotti e Radice - Material 2023', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 3000.0, 'CHF', 'sold', v_gal_19, 'sculpture', NULL, 'Bexio RE-00070 | Payment: 18.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-05-16', 3000.0, 'CHF', 50, 0.0, 1500.0, 'paid', 'Bexio RE-00070 | Payment: 18.05.2023');

  -- [448/484] Untitled (RE-00071)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0448', 'SB-IMP-0448', 'Untitled', NULL, 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10000.0, 'CHF', 'sold', v_gal_19, 'sculpture', 'untitled_portrait', 'Bexio RE-00071 | Payment: 25.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_19, '2023-05-16', 10000.0, 'CHF', 50, 20.0, 4000.0, 'paid', 'Bexio RE-00071 | Payment: 25.05.2023');

  -- [449/484] Cube (RE-00072)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0449', 'SB-IMP-0449', 'Cube', 'Glass', 2023, 30.0, 26.0, 30.0, 'cm', 30.0, 26.0, 30.0, NULL, 43000.0, 'EUR', 'sold', v_gal_8, 'sculpture', NULL, 'Bexio RE-00072 | Payment: 22.06.2023 | Materials: Glass')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-04-27', 43000.0, 'EUR', 50, 0.0, 21500.0, 'paid', 'Bexio RE-00072 | Payment: 22.06.2023 | Materials: Glass');

  -- [450/484] Untitled (RE-00073)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0450', 'SB-IMP-0450', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 24000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00073 | Payment: 19.05.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-05-04', 24000.0, 'EUR', 50, 0.0, 12000.0, 'paid', 'Bexio RE-00073 | Payment: 19.05.2023 | Materials: Glass, Wood, Aluminum');

  -- [451/484] Untitled (RE-00073)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0451', 'SB-IMP-0451', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 24000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00073 | Payment: 19.05.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-05-04', 24000.0, 'EUR', 50, 0.0, 12000.0, 'paid', 'Bexio RE-00073 | Payment: 19.05.2023 | Materials: Glass, Wood, Aluminum');

  -- [452/484] Werkverkäufe Palm-Beach Art Fair (RE-00074)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0452', 'SB-IMP-0452', 'Werkverkäufe Palm-Beach Art Fair', NULL, 2023, NULL, NULL, NULL, 'cm', NULL, NULL, NULL, NULL, 40000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00074 | Payment: 17.04.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-25', 40000.0, 'USD', 50, 0.0, 20000.0, 'paid', 'Bexio RE-00074 | Payment: 17.04.2023');

  -- [453/484] Untitled (RE-00075)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0453', 'SB-IMP-0453', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 50000.0, 'CHF', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00075 | Payment: 25.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-25', 50000.0, 'CHF', 50, 0.0, 25000.0, 'paid', 'Bexio RE-00075 | Payment: 25.05.2023');

  -- [454/484] Untitled (RE-00077)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0454', 'SB-IMP-0454', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14000.0, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00077 | Payment: 21.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-25', 14000.0, 'USD', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00077 | Payment: 21.07.2023');

  -- [455/484] Untitled (RE-00078)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0455', 'AU22-SBR0023 / Untitled', 'Untitled', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 27500.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00078 | Payment: 13.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2023-07-06', 27500.0, 'USD', 50, 0.0, 13750.0, 'paid', 'Bexio RE-00078 | Payment: 13.07.2023');

  -- [456/484] Untitled (RE-00078)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0456', 'AU22-SBR0002 / Untitled', 'Untitled', NULL, 2022, 50.0, 50.0, NULL, 'cm', 50.0, 50.0, NULL, NULL, 6500.0, 'USD', 'sold', v_gal_4, 'sculpture', 'untitled_portrait', 'Bexio RE-00078 | Payment: 13.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2023-07-06', 6500.0, 'USD', 50, 0.0, 3250.0, 'paid', 'Bexio RE-00078 | Payment: 13.07.2023');

  -- [457/484] Untitled (Skull Cube) (RE-00078)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0457', 'AU22-SBR0027 / Untitled', 'Untitled (Skull Cube)', NULL, 2022, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 38500.0, 'USD', 'sold', v_gal_4, 'sculpture', 'skull', 'Bexio RE-00078 | Payment: 13.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_4, '2023-07-06', 38500.0, 'USD', 50, 0.0, 19250.0, 'paid', 'Bexio RE-00078 | Payment: 13.07.2023');

  -- [458/484] Untitled (RE-00079)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0458', 'SB-IMP-0458', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16500.0, 'USD', 'sold', v_gal_11, 'sculpture', 'untitled_portrait', 'Bexio RE-00079 | Payment: 13.07.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_11, '2023-05-25', 16500.0, 'USD', 50, 0.0, 8250.0, 'paid', 'Bexio RE-00079 | Payment: 13.07.2023 | Materials: Glass, Wood, Aluminum');

  -- [459/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0459', 'SB-IMP-0459', 'Untitled', 'Glass, Wood, Aluminum', 2023, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 27500.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 27500.0, 'USD', 50, 0.0, 13750.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [460/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0460', 'SB-IMP-0460', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16500.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 16500.0, 'USD', 50, 0.0, 8250.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [461/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0461', 'SB-IMP-0461', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16500.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 16500.0, 'USD', 50, 0.0, 8250.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [462/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0462', 'SB-IMP-0462', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 16500.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 16500.0, 'USD', 50, 0.0, 8250.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [463/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0463', 'SB-IMP-0463', 'Untitled', 'Glass, Wood, Aluminum', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11000.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 11000.0, 'USD', 50, 0.0, 5500.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [464/484] Untitled (RE-00080)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0464', 'SB-IMP-0464', 'Untitled', 'Glass, Wood, Aluminum', 2023, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 11000.0, 'USD', 'sold', v_gal_14, 'sculpture', 'untitled_portrait', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_14, '2023-06-22', 11000.0, 'USD', 50, 0.0, 5500.0, 'paid', 'Bexio RE-00080 | Payment: 20.09.2023 | Materials: Glass, Wood, Aluminum');

  -- [465/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0465', 'SB-IMP-0465', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [466/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0466', 'SB-IMP-0466', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [467/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0467', 'SB-IMP-0467', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [468/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0468', 'SB-IMP-0468', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [469/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0469', 'SB-IMP-0469', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [470/484] Untitled (RE-00081)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0470', 'SB-IMP-0470', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00081 | Payment: 06.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00081 | Payment: 06.06.2023');

  -- [471/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0471', 'SB-IMP-0471', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [472/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0472', 'SB-IMP-0472', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [473/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0473', 'SB-IMP-0473', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [474/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0474', 'SB-IMP-0474', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [475/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0475', 'SB-IMP-0475', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [476/484] Untitled (RE-00082)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0476', 'SB-IMP-0476', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 13000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00082 | Payment: 16.06.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-05-31', 13000.0, 'EUR', 50, 0.0, 6500.0, 'paid', 'Bexio RE-00082 | Payment: 16.06.2023');

  -- [477/484] West Chelsea Contemporary - Eiger, Mönch, ... (RE-00083)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0477', 'SB-IMP-0477', 'West Chelsea Contemporary - Eiger, Mönch, ...', NULL, 2023, 400.0, 200.0, NULL, 'cm', 400.0, 200.0, NULL, NULL, 75000.0, 'USD', 'sold', v_gal_16, 'sculpture', NULL, 'Bexio RE-00083 | Payment: 31.05.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-05-31', 75000.0, 'USD', 40, 0.0, 37500.0, 'paid', 'Bexio RE-00083 | Payment: 31.05.2023');

  -- [478/484] Untitled (RE-00084)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0478', 'SB-IMP-0478', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 14000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00084 | Payment: 12.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-06-16', 14000.0, 'EUR', 50, 0.0, 7000.0, 'paid', 'Bexio RE-00084 | Payment: 12.07.2023');

  -- [479/484] Untitled (RE-00086)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0479', 'SB-IMP-0479', 'Untitled', 'Glass, Wood, Aluminum', 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 10000.0, 'EUR', 'sold', v_gal_8, 'sculpture', 'untitled_portrait', 'Bexio RE-00086 | Payment: 06.07.2023 | Materials: Glass, Wood, Aluminum')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_8, '2023-06-28', 10000.0, 'EUR', 50, 0.0, 5000.0, 'paid', 'Bexio RE-00086 | Payment: 06.07.2023 | Materials: Glass, Wood, Aluminum');

  -- [480/484] Untitled (RE-00087)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0480', 'SB-IMP-0480', 'Untitled', NULL, 2023, 100, 100, 10, 'cm', 100, 100, 10, 44.0, 12000.0, 'EUR', 'sold', v_gal_0, 'sculpture', 'untitled_portrait', 'Bexio RE-00087 | Payment: 12.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_0, '2023-06-29', 12000.0, 'EUR', 50, 0.0, 6000.0, 'paid', 'Bexio RE-00087 | Payment: 12.07.2023');

  -- [481/484] Untitled (Face II) (RE-00088)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0481', 'SB-IMP-0481', 'Untitled (Face II)', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00088 | Payment: 27.09.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-06-30', 10000.0, 'CHF', 50, 10.0, 4500.0, 'paid', 'Bexio RE-00088 | Payment: 27.09.2023');

  -- [482/484] Untitled (1632) (RE-00088)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0482', 'SB-IMP-0482', 'Untitled (1632)', NULL, 2022, 75.0, 75.0, NULL, 'cm', 75.0, 75.0, NULL, 15.0, 10000.0, 'CHF', 'sold', v_gal_3, 'sculpture', 'untitled_portrait', 'Bexio RE-00088 | Payment: 27.09.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-06-30', 10000.0, 'CHF', 50, 10.0, 4500.0, 'paid', 'Bexio RE-00088 | Payment: 27.09.2023');

  -- [483/484] Skull Cube (RE-00088)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0483', 'SB-IMP-0483', 'Skull Cube', NULL, 2023, 40.0, 36.0, 40.0, 'cm', 40.0, 36.0, 40.0, NULL, 38888.89, 'CHF', 'sold', v_gal_3, 'sculpture', 'skull', 'Bexio RE-00088 | Payment: 27.09.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_3, '2023-06-30', 38888.89, 'CHF', 50, 10.0, 17500.0, 'paid', 'Bexio RE-00088 | Payment: 27.09.2023');

  -- [484/484] Untitled (RE-00093)
  INSERT INTO artworks (user_id, inventory_number, reference_code, title, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, weight, price, currency, status, gallery_id, category, series, notes)
  VALUES (v_user_id, 'IMP-0484', 'SB-IMP-0484', 'Untitled', NULL, 2022, 150.0, 150.0, 15.0, 'cm', 150.0, 150.0, 15.0, 100.0, 13177.1, 'USD', 'sold', v_gal_16, 'sculpture', 'untitled_portrait', 'Bexio RE-00093 | Payment: 12.07.2023')
  RETURNING id INTO v_art_id;

  INSERT INTO sales (user_id, artwork_id, gallery_id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, notes)
  VALUES (v_user_id, v_art_id, v_gal_16, '2023-07-12', 13177.1, 'USD', 50, 0.0, 6588.55, 'paid', 'Bexio RE-00093 | Payment: 12.07.2023');

  RAISE NOTICE 'Import complete: 484 artworks + 484 sales created';
END $$;