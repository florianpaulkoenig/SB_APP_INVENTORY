-- Delete test import data
DELETE FROM sales WHERE notes LIKE '%TEST - Bexio RE-00239%';
DELETE FROM artworks WHERE title = 'TEST IMPORT - Skull Cube (DELETE ME)';
