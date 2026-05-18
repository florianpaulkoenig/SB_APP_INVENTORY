-- Gallery agreement: storage path and signed flag
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS agreement_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN NOT NULL DEFAULT FALSE;
