-- ==========================================================================
-- Fix enquiries table schema to match application code
-- ==========================================================================
-- The enquiries table was created with a minimal schema, but the TypeScript
-- types, hooks, edge functions, and UI expect additional columns.
-- This migration adds missing columns and renames mismatched ones.
-- ==========================================================================

-- 1. Add missing columns
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS sender_phone TEXT;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS interest_description TEXT;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS interested_artwork_ids UUID[] DEFAULT '{}';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Add CHECK constraint for priority (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_priority_check'
  ) THEN
    ALTER TABLE enquiries ADD CONSTRAINT enquiries_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- 2. Rename "message" → "body" (code expects "body")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enquiries' AND column_name = 'message'
  ) THEN
    ALTER TABLE enquiries RENAME COLUMN message TO body;
  END IF;
END $$;

-- 3. Rename "contact_id" → "converted_contact_id" (code expects "converted_contact_id")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enquiries' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE enquiries RENAME COLUMN contact_id TO converted_contact_id;
  END IF;
END $$;

-- 4. Update status CHECK constraint ('in_progress' → 'reviewing')
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_status_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_status_check
  CHECK (status IN ('new', 'reviewing', 'converted', 'archived'));

-- 5. Migrate existing 'in_progress' values
UPDATE enquiries SET status = 'reviewing' WHERE status = 'in_progress';
