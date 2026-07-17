-- ---------------------------------------------------------------------------
-- Secondary artwork title in non-Latin script (Chinese, Arabic, ...).
-- Kept as a separate column so the Latin title and the original-script title
-- are technically separated — UI and PDF exports can then render each line
-- with the correct font (AnzianoPro vs NotoSansSC/NotoSansArabic) instead of
-- mixing scripts inside one string.
-- ---------------------------------------------------------------------------

alter table public.artworks
  add column if not exists title_secondary text;
