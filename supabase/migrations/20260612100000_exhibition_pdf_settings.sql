-- Add pdf_settings JSONB column to exhibitions for persisting per-exhibition
-- dossier PDF configuration (language, section titles, created-by line).
ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS pdf_settings JSONB;
