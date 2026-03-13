DO $$
DECLARE
  v_art_moved INTEGER;
  v_sales_moved INTEGER;
BEGIN
  -- Merge Goldman Global Arts (a3273f1c) INTO Wynwood Walls / GGA Gallery (3a1b167d)
  UPDATE artworks SET gallery_id = '3a1b167d-1f13-4df7-93bb-dcf4f1ef32de'
    WHERE gallery_id = 'a3273f1c-d7bd-4b00-aa80-301b8bfe5815';
  GET DIAGNOSTICS v_art_moved = ROW_COUNT;

  UPDATE sales SET gallery_id = '3a1b167d-1f13-4df7-93bb-dcf4f1ef32de'
    WHERE gallery_id = 'a3273f1c-d7bd-4b00-aa80-301b8bfe5815';
  GET DIAGNOSTICS v_sales_moved = ROW_COUNT;

  DELETE FROM galleries WHERE id = 'a3273f1c-d7bd-4b00-aa80-301b8bfe5815';

  -- Rename to "Wynwood Walls & GGA Gallery"
  UPDATE galleries SET name = 'Wynwood Walls & GGA Gallery'
    WHERE id = '3a1b167d-1f13-4df7-93bb-dcf4f1ef32de';

  RAISE NOTICE 'Merged Goldman Global Arts → Wynwood Walls & GGA Gallery: % artworks, % sales moved', v_art_moved, v_sales_moved;
END $$;
