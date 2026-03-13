-- ---------------------------------------------------------------------------
-- Migration: Task improvements (Tasks 4, 18)
-- 1. Add 'donated' to artwork status check constraint
-- 2. Add 'template' column to viewing_rooms
-- ---------------------------------------------------------------------------

-- Task 4: Add 'donated' to artwork status enum/constraint
-- First drop the existing constraint, then re-add with 'donated' included
DO $$
BEGIN
  -- Try to drop existing constraint (may have different names)
  BEGIN
    ALTER TABLE artworks DROP CONSTRAINT IF EXISTS artworks_status_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE artworks DROP CONSTRAINT IF EXISTS check_artwork_status;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE artworks ADD CONSTRAINT artworks_status_check
  CHECK (status IN (
    'available', 'sold', 'reserved', 'in_production', 'in_transit',
    'on_consignment', 'paid', 'pending_sale', 'archived', 'destroyed', 'donated'
  ));

-- Task 18: Add template column to viewing_rooms
ALTER TABLE viewing_rooms
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'grid';

ALTER TABLE viewing_rooms ADD CONSTRAINT viewing_rooms_template_check
  CHECK (template IN ('grid', 'carousel', 'editorial'));

-- Task 20: Create catalogues table for saved catalogue configurations
CREATE TABLE IF NOT EXISTS catalogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogues_user_id ON catalogues(user_id);

-- RLS for catalogues
ALTER TABLE catalogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own catalogues"
  ON catalogues FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER set_catalogues_updated_at
  BEFORE UPDATE ON catalogues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Task 22: Add entity connection columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES exhibitions(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_gallery_id ON tasks(gallery_id) WHERE gallery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_exhibition_id ON tasks(exhibition_id) WHERE exhibition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_id ON tasks(invoice_id) WHERE invoice_id IS NOT NULL;
