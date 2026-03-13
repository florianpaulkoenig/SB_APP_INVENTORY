-- ---------------------------------------------------------------------------
-- Security Audit Round 3 — March 2026
-- M6: Add admin role checks to 10 permissive tables
-- M7: Fix nullable user_id on ai tables
-- L2: Normalize auth.uid() to (select auth.uid()) for performance
-- ---------------------------------------------------------------------------

-- ============================================================================
-- 1. M6: Add admin role check to tables that allow any authenticated user
--    full CRUD without role verification. These are admin-managed tables.
-- ============================================================================

-- projects
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Admin can manage own projects" ON projects
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- exhibition_production_orders
DROP POLICY IF EXISTS "Users manage own exhibition_production_orders" ON exhibition_production_orders;
CREATE POLICY "Admin manage own exhibition_production_orders" ON exhibition_production_orders
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- project_artworks
DROP POLICY IF EXISTS "Users manage own project_artworks" ON project_artworks;
CREATE POLICY "Admin manage own project_artworks" ON project_artworks
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- project_production_orders
DROP POLICY IF EXISTS "Users manage own project_production_orders" ON project_production_orders;
CREATE POLICY "Admin manage own project_production_orders" ON project_production_orders
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- auction_alerts
DROP POLICY IF EXISTS "Users manage own auction_alerts" ON auction_alerts;
CREATE POLICY "Admin manage own auction_alerts" ON auction_alerts
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- enquiries
DROP POLICY IF EXISTS "Users manage own enquiries" ON enquiries;
CREATE POLICY "Admin manage own enquiries" ON enquiries
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- exhibition_galleries
DROP POLICY IF EXISTS "Users manage own exhibition_galleries" ON exhibition_galleries;
CREATE POLICY "Admin manage own exhibition_galleries" ON exhibition_galleries
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- gallery_forwarding_orders
DROP POLICY IF EXISTS "Users manage own gallery_forwarding_orders" ON gallery_forwarding_orders;
CREATE POLICY "Admin manage own gallery_forwarding_orders" ON gallery_forwarding_orders
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- gallery_forwarding_items (uses parent FK, not user_id directly)
DROP POLICY IF EXISTS "Users manage own gallery_forwarding_items" ON gallery_forwarding_items;
CREATE POLICY "Admin manage own gallery_forwarding_items" ON gallery_forwarding_items
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND forwarding_order_id IN (SELECT id FROM gallery_forwarding_orders WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND forwarding_order_id IN (SELECT id FROM gallery_forwarding_orders WHERE user_id = (select auth.uid()))
  );

-- gallery_team_members
DROP POLICY IF EXISTS "Users manage own gallery_team_members" ON gallery_team_members;
CREATE POLICY "Admin manage own gallery_team_members" ON gallery_team_members
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- public_collections
DROP POLICY IF EXISTS "Users manage own public_collections" ON public_collections;
CREATE POLICY "Admin manage own public_collections" ON public_collections
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND user_id = (select auth.uid()))
  WITH CHECK (get_user_role() = 'admin' AND user_id = (select auth.uid()));

-- ============================================================================
-- 2. M7: ai_insights and ai_conversations — make user_id NOT NULL
--    Set any NULL user_ids to the first admin user, then add NOT NULL.
-- ============================================================================

-- Fix existing NULL values before adding constraint
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT user_id INTO v_admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    UPDATE ai_insights SET user_id = v_admin_id WHERE user_id IS NULL;
    UPDATE ai_conversations SET user_id = v_admin_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Now add NOT NULL constraint (if not already set)
DO $$
BEGIN
  -- ai_insights
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE ai_insights ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- ai_conversations
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE ai_conversations ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. L2: Normalize auth.uid() to (select auth.uid()) for performance
--    on viewing_room_views admin policy
-- ============================================================================

DROP POLICY IF EXISTS "Admin can view viewing_room_views" ON viewing_room_views;
CREATE POLICY "Admin can view viewing_room_views" ON viewing_room_views
  FOR SELECT TO authenticated USING (
    viewing_room_id IN (SELECT id FROM viewing_rooms WHERE user_id = (select auth.uid()))
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
