-- Each production order item gets its own immutable reference code
-- (format NOA-SB-2026-K7M2, same as artworks). The code is assigned when the
-- item is created and carried over to the artwork on conversion, so a piece
-- keeps one reference for its whole life — without creating the artwork
-- record before it is actually produced.

ALTER TABLE production_order_items ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- Unique across items (partial: legacy rows may be NULL until backfilled)
CREATE UNIQUE INDEX IF NOT EXISTS production_order_items_reference_code_key
  ON production_order_items (reference_code)
  WHERE reference_code IS NOT NULL;

-- Backfill existing items with generated codes that collide neither with
-- artworks.reference_code nor with other items
DO $$
DECLARE
  item RECORD;
  letters CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- no I, O
  digits  CONSTANT TEXT := '23456789';                  -- no 0, 1
  candidate TEXT;
  item_year TEXT;
BEGIN
  FOR item IN
    SELECT id, created_at FROM production_order_items WHERE reference_code IS NULL
  LOOP
    item_year := to_char(item.created_at, 'YYYY');
    LOOP
      candidate := 'NOA-SB-' || item_year || '-'
        || substr(letters, 1 + floor(random() * 24)::int, 1)
        || substr(digits,  1 + floor(random() * 8)::int, 1)
        || substr(letters, 1 + floor(random() * 24)::int, 1)
        || substr(digits,  1 + floor(random() * 8)::int, 1);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM artworks WHERE reference_code = candidate)
        AND NOT EXISTS (SELECT 1 FROM production_order_items WHERE reference_code = candidate);
    END LOOP;
    UPDATE production_order_items SET reference_code = candidate WHERE id = item.id;
  END LOOP;
END $$;
