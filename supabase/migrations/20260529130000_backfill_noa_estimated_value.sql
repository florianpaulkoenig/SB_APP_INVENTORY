-- Backfill estimated_value from purchase_price and set estimated_value_date = 2025-12-31
-- for all NOA Collection artworks that have a purchase_price but no estimated_value.
-- Run for ALL NOA artworks as of Jahresabschluss 31.12.2025.
UPDATE artworks
SET
  estimated_value      = purchase_price,
  estimated_value_date = '2025-12-31'
WHERE
  portfolio            = 'noa_collection'
  AND purchase_price   IS NOT NULL
  AND purchase_price   > 0;
