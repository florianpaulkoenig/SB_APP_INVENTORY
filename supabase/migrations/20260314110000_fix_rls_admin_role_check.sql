-- ---------------------------------------------------------------------------
-- Fix HIGH #2: Dynamic RLS policies missing admin role check
-- Fix HIGH #3: artwork_images fragile implicit RLS chaining
-- ---------------------------------------------------------------------------

-- ============================================================================
-- H2: Add get_user_role() = 'admin' to all dynamic-loop-generated policies
-- These 30 tables previously only checked user_id ownership without verifying
-- the user actually has the admin role.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN VALUES ('artwork_movements'), ('contacts'), ('interactions'), ('deals'), ('tasks'),
    ('sales'), ('invoices'), ('invoice_items'), ('deliveries'), ('delivery_items'),
    ('packing_lists'), ('packing_list_items'), ('production_orders'), ('production_order_items'),
    ('certificates'), ('document_sequences'), ('share_links'), ('viewing_rooms'), ('email_log'),
    ('condition_reports'), ('insurance_records'), ('valuations'), ('exhibitions'), ('exhibition_artworks'),
    ('loans'), ('expenses'), ('price_history'), ('wish_list_items'),
    ('activity_log'), ('reminders')
  LOOP
    -- Drop the old policy without role check
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access %1$s" ON %1$s', tbl);
    -- Create new policy with admin role check
    EXECUTE format(
      'CREATE POLICY "Admin full access %1$s" ON %1$s FOR ALL TO authenticated USING (get_user_role() = ''admin'' AND user_id = (select auth.uid()))',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- H3: Replace fragile artwork_images guest policy with explicit checks
-- Instead of relying on implicit RLS chaining through artworks table,
-- use explicit gallery_id and sales contact_id checks.
-- ============================================================================

DROP POLICY IF EXISTS "Guest can view artwork images" ON artwork_images;
DROP POLICY IF EXISTS "Gallery can view artwork images" ON artwork_images;
DROP POLICY IF EXISTS "Collector can view own artwork images" ON artwork_images;

CREATE POLICY "Gallery can view artwork images" ON artwork_images
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gallery'
    AND artwork_id IN (
      SELECT id FROM artworks WHERE gallery_id = get_user_gallery_id()
    )
  );

CREATE POLICY "Collector can view own artwork images" ON artwork_images
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'collector'
    AND artwork_id IN (
      SELECT artwork_id FROM sales WHERE contact_id = get_user_contact_id()
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
