-- Fix gallery assignments for RE-00282, RE-00271, RE-00281

DO $$
DECLARE
  v_gal_noa UUID;
  v_gal_studio UUID;
  v_gal_aurum UUID;
  v_updated INTEGER := 0;
  v_count INTEGER;
BEGIN
  -- Look up galleries
  SELECT id INTO v_gal_noa FROM galleries WHERE name ILIKE '%noa%contemporary%' LIMIT 1;
  SELECT id INTO v_gal_studio FROM galleries WHERE name ILIKE '%studio%simon%berger%' OR name ILIKE '%simon%berger%studio%' LIMIT 1;
  SELECT id INTO v_gal_aurum FROM galleries WHERE name ILIKE '%aurum%' LIMIT 1;

  IF v_gal_noa IS NULL THEN RAISE EXCEPTION 'Gallery "NOA Contemporary" not found'; END IF;
  IF v_gal_aurum IS NULL THEN RAISE EXCEPTION 'Gallery "Aurum Gallery" not found'; END IF;

  -- Create Studio Simon Berger if it doesn't exist
  IF v_gal_studio IS NULL THEN
    INSERT INTO galleries (user_id, name, type, city, country)
    SELECT (SELECT id FROM auth.users LIMIT 1), 'Studio Simon Berger', 'gallery', 'Niederönz', 'Switzerland'
    RETURNING id INTO v_gal_studio;
    RAISE NOTICE 'Created gallery: Studio Simon Berger = %', v_gal_studio;
  END IF;

  -- RE-00282 (IMP-0491, IMP-0492): Fürstentum Liechtenstein → NOA Contemporary
  UPDATE artworks SET gallery_id = v_gal_noa WHERE inventory_number IN ('IMP-0491', 'IMP-0492') AND gallery_id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_updated := v_updated + v_count;
  UPDATE sales SET gallery_id = v_gal_noa WHERE artwork_id IN (SELECT id FROM artworks WHERE inventory_number IN ('IMP-0491', 'IMP-0492')) AND gallery_id IS NULL;

  -- RE-00271 (IMP-0494): Zeus & Poseidon → Studio Simon Berger
  UPDATE artworks SET gallery_id = v_gal_studio WHERE inventory_number = 'IMP-0494' AND gallery_id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_updated := v_updated + v_count;
  UPDATE sales SET gallery_id = v_gal_studio WHERE artwork_id IN (SELECT id FROM artworks WHERE inventory_number = 'IMP-0494') AND gallery_id IS NULL;

  -- RE-00281 (IMP-0495): TRU GOLD/Leon → Aurum Gallery
  UPDATE artworks SET gallery_id = v_gal_aurum WHERE inventory_number = 'IMP-0495';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_updated := v_updated + v_count;
  UPDATE sales SET gallery_id = v_gal_aurum WHERE artwork_id IN (SELECT id FROM artworks WHERE inventory_number = 'IMP-0495');

  RAISE NOTICE 'Updated % artworks + their sales with correct gallery assignments', v_updated;
END $$;
