-- ============================================================================
-- ARTWORK MUTATIONS LOG
-- ============================================================================
-- Automatic audit trail for artworks: records every change to status,
-- gallery, location, price, estimated value and purchase price — one row per
-- changed field. Written exclusively by a DB trigger, so ALL update paths are
-- covered (edit form, bulk ops, sale flows, gallery forwarding, sale requests,
-- valuations sync trigger, SQL run in the dashboard, ...).
--
-- changed_by is auth.uid() of the acting user; NULL means the change came
-- from a non-user context (service role, another trigger, dashboard SQL).
-- ============================================================================

CREATE TABLE IF NOT EXISTS artwork_mutations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  field TEXT NOT NULL,        -- 'created' | 'status' | 'gallery' | 'location' | 'price' | 'estimated_value' | 'purchase_price'
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artwork_mutations_artwork
  ON artwork_mutations (artwork_id, changed_at DESC);

-- ----------------------------------------------------------------------------
-- RLS: admin read-only. No client write policies — inserts happen only via
-- the SECURITY DEFINER trigger function below.
-- ----------------------------------------------------------------------------

ALTER TABLE artwork_mutations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_artwork_mutations" ON artwork_mutations;
CREATE POLICY "admin_read_artwork_mutations"
  ON artwork_mutations FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- Trigger function
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_artwork_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_old_gallery TEXT;
  v_new_gallery TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (NEW.id, 'created', NULL, NEW.status, v_actor);
    RETURN NEW;
  END IF;

  -- Status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, v_actor);
  END IF;

  -- Gallery (store names so history stays readable after gallery deletion)
  IF NEW.gallery_id IS DISTINCT FROM OLD.gallery_id THEN
    SELECT name INTO v_old_gallery FROM galleries WHERE id = OLD.gallery_id;
    SELECT name INTO v_new_gallery FROM galleries WHERE id = NEW.gallery_id;
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (
      NEW.id, 'gallery',
      COALESCE(v_old_gallery, OLD.gallery_id::text),
      COALESCE(v_new_gallery, NEW.gallery_id::text),
      v_actor
    );
  END IF;

  -- Location
  IF NEW.current_location IS DISTINCT FROM OLD.current_location THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (NEW.id, 'location', OLD.current_location, NEW.current_location, v_actor);
  END IF;

  -- Price (currency change counts as a price change)
  IF NEW.price IS DISTINCT FROM OLD.price OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (
      NEW.id, 'price',
      CASE WHEN OLD.price IS NULL THEN NULL ELSE trim_scale(OLD.price)::text || ' ' || OLD.currency END,
      CASE WHEN NEW.price IS NULL THEN NULL ELSE trim_scale(NEW.price)::text || ' ' || NEW.currency END,
      v_actor
    );
  END IF;

  -- Estimated value (NOA collection; also written by the valuations sync trigger)
  IF NEW.estimated_value IS DISTINCT FROM OLD.estimated_value THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (
      NEW.id, 'estimated_value',
      CASE WHEN OLD.estimated_value IS NULL THEN NULL ELSE trim_scale(OLD.estimated_value)::text || ' CHF' END,
      CASE WHEN NEW.estimated_value IS NULL THEN NULL ELSE trim_scale(NEW.estimated_value)::text || ' CHF' END,
      v_actor
    );
  END IF;

  -- Purchase price
  IF NEW.purchase_price IS DISTINCT FROM OLD.purchase_price
     OR NEW.purchase_currency IS DISTINCT FROM OLD.purchase_currency THEN
    INSERT INTO artwork_mutations (artwork_id, field, old_value, new_value, changed_by)
    VALUES (
      NEW.id, 'purchase_price',
      CASE WHEN OLD.purchase_price IS NULL THEN NULL ELSE trim_scale(OLD.purchase_price)::text || ' ' || COALESCE(OLD.purchase_currency, 'CHF') END,
      CASE WHEN NEW.purchase_price IS NULL THEN NULL ELSE trim_scale(NEW.purchase_price)::text || ' ' || COALESCE(NEW.purchase_currency, 'CHF') END,
      v_actor
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_artwork_mutation ON artworks;
CREATE TRIGGER log_artwork_mutation
  AFTER INSERT OR UPDATE ON artworks
  FOR EACH ROW EXECUTE FUNCTION log_artwork_mutation();
