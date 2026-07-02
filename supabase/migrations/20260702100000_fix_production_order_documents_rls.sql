-- ---------------------------------------------------------------------------
-- Fix production_order_documents RLS policy.
--
-- The original policy (20260518110000) compared user_profiles.id against
-- auth.uid(), but user_profiles.id is the profile's own primary key, not the
-- auth user id (that is user_profiles.user_id). The comparison never matched,
-- so the policy denied ALL access — including to admins — silently breaking
-- the production-order document attachments feature (fail-closed).
--
-- Replace it with the standard get_user_role() helper used everywhere else.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_all_production_order_documents" ON production_order_documents;

CREATE POLICY "admin_all_production_order_documents"
  ON production_order_documents FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
