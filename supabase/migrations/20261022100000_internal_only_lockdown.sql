-- ============================================================================
-- Internal-only lockdown — 2026-10-22
--
-- PURPOSE
--   The app is now internal-only (admin users only). This migration removes
--   every database surface that existed for the public / gallery / collector
--   features that have been deleted from the frontend and from
--   supabase/functions/:
--     * share links, viewing rooms, public collections (anon access),
--     * gallery / collector portal policies,
--     * email + edge-function rate limiting,
--     * anon-callable RPC functions,
--     * non-admin user roles.
--
-- HOW TO RUN
--   Paste the whole file into the Supabase SQL editor and run it as ONE
--   script (the CLI has no DB password). It is idempotent: every step is
--   guarded with IF EXISTS / to_regclass / to_regprocedure / CREATE OR
--   REPLACE, so re-running it is safe.
--
-- ALSO CONTAINS
--   The two migrations that were committed but never applied to prod:
--     * 20260702100000_fix_production_order_documents_rls.sql  (section 5)
--     * 20260703100000_revoke_anon_artwork_images_read.sql      (section 1)
--
-- AFTERWARDS
--   Run supabase/migrations/_verify_20261022_lockdown.sql (same queries are
--   repeated as a comment block at the end of this file).
-- ============================================================================


-- ============================================================================
-- 1. STORAGE (storage.objects)
--    Buckets used by the app: artwork-images, media-files (verified in src/).
--    Remove anon + any-authenticated reads and the gallery upload path;
--    reads become admin-only. Admin INSERT/UPDATE/DELETE policies from
--    20260315100000 are left untouched.
-- ============================================================================

-- 20260703100000 (never applied): anon bucket-wide read on artwork-images
DROP POLICY IF EXISTS "Anon can read artwork images"          ON storage.objects;
-- any authenticated role could read both buckets
DROP POLICY IF EXISTS "Authenticated can read artwork images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read media files"    ON storage.objects;
-- gallery submission flow is gone
DROP POLICY IF EXISTS "Gallery can upload media files"        ON storage.objects;

-- Admin-only SELECT (needed for createSignedUrl / list / download in the app)
DROP POLICY IF EXISTS "Admin can read artwork images" ON storage.objects;
CREATE POLICY "Admin can read artwork images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artwork-images' AND public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin can read media files" ON storage.objects;
CREATE POLICY "Admin can read media files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media-files' AND public.get_user_role() = 'admin');


-- ============================================================================
-- 2. ANON TABLE POLICIES
--    viewing_rooms is dropped in section 8; its policies are dropped here
--    only so the table is already closed should the DROP TABLE ever be
--    skipped. public_collections STAYS (internal feature) — anon read goes,
--    admin policy is ensured.
-- ============================================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('viewing_rooms',      'Public can view public viewing rooms'),
    ('viewing_rooms',      'Public can view published viewing rooms'),
    ('public_collections', 'Anyone can view published collections')
  ) AS t(tbl, pol)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    END IF;
  END LOOP;
END $$;

-- public_collections: make sure the admin policy from 20260313170000 exists
DO $$
BEGIN
  IF to_regclass('public.public_collections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'public_collections'
         AND policyname = 'Admin manage own public_collections'
     )
  THEN
    -- the loose pre-admin policy, if it is still around
    DROP POLICY IF EXISTS "Users manage own public_collections" ON public.public_collections;
    CREATE POLICY "Admin manage own public_collections" ON public.public_collections
      FOR ALL TO authenticated
      USING (public.get_user_role() = 'admin' AND user_id = (select auth.uid()))
      WITH CHECK (public.get_user_role() = 'admin' AND user_id = (select auth.uid()));
  END IF;
END $$;


-- ============================================================================
-- 3. GALLERY / COLLECTOR POLICIES
--    Every policy that grants role 'gallery' or 'collector' (or any
--    authenticated user) read/insert access. Tables that are dropped in
--    section 8 (sale_requests, news_posts) are included for completeness and
--    guarded with to_regclass.
-- ============================================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- schema.sql
    ('galleries',          'Gallery user can view own gallery'),
    ('artworks',           'Gallery sees consigned artworks'),
    ('artworks',           'Collector sees purchased artworks'),
    ('artwork_images',     'Gallery can view consigned artwork images'),      -- 20260313140000
    ('artwork_images',     'Collector can view purchased artwork images'),    -- 20260313140000
    ('artwork_images',     'Gallery can view artwork images'),                -- schema + 20260314110000
    ('artwork_images',     'Collector can view own artwork images'),          -- schema + 20260314110000
    ('artwork_images',     'Guest can view artwork images'),                  -- pre-audit name, dropped in 20260313140000
    ('deliveries',         'Gallery sees own deliveries'),
    ('sales',              'Gallery sees own sales'),
    ('certificates',       'Collector sees own certificates'),
    ('sale_requests',      'Gallery can insert own sale_requests'),
    ('sale_requests',      'Gallery can view own sale_requests'),
    ('media_files',        'Gallery can view published media_files'),
    ('media_files',        'Gallery can insert media_files'),
    ('news_posts',         'Gallery can view published news'),
    ('artwork_provenance', 'Gallery can read provenance for their artworks'), -- 20260526110000
    ('cv_entries',         'Anyone can view cv_entries'),
    -- 20260528190000: own-row policy without role check
    ('noa_liquidity_expense_payments', 'Users manage own expense payments')
  ) AS t(tbl, pol)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    END IF;
  END LOOP;
END $$;

-- cv_entries / media_files: ensure an admin ALL policy exists (schema.sql names)
DO $$
BEGIN
  IF to_regclass('public.cv_entries') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cv_entries'
      AND policyname = 'Admin full access to cv_entries'
  ) THEN
    CREATE POLICY "Admin full access to cv_entries" ON public.cv_entries
      FOR ALL TO authenticated
      USING (public.get_user_role() = 'admin')
      WITH CHECK (public.get_user_role() = 'admin');
  END IF;

  IF to_regclass('public.media_files') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_files'
      AND policyname = 'Admin full access to media_files'
  ) THEN
    CREATE POLICY "Admin full access to media_files" ON public.media_files
      FOR ALL TO authenticated
      USING (public.get_user_role() = 'admin')
      WITH CHECK (public.get_user_role() = 'admin');
  END IF;
END $$;

-- noa_liquidity_expense_payments: ensure the admin policy (20260908100000
-- version, user_profiles.user_id = auth.uid()) exists now that the own-row
-- policy is gone.
DO $$
BEGIN
  IF to_regclass('public.noa_liquidity_expense_payments') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'noa_liquidity_expense_payments'
      AND policyname = 'Admins manage all expense payments'
  ) THEN
    CREATE POLICY "Admins manage all expense payments"
      ON public.noa_liquidity_expense_payments
      FOR ALL TO authenticated
      USING ((SELECT role FROM public.user_profiles WHERE user_id = (select auth.uid())) = 'admin')
      WITH CHECK ((SELECT role FROM public.user_profiles WHERE user_id = (select auth.uid())) = 'admin');
  END IF;
END $$;


-- ============================================================================
-- 4. OWN-ROW POLICIES WITHOUT ROLE CHECK  →  admin-checked replacements
--    user_id = auth.uid() alone is no longer enough; every row owner must
--    also be an admin. None of these tables has a separate admin policy in
--    the repo, so a replacement is created for each.
--    (gallery_access_tiers_user_policy is not touched: table dropped in 8.)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  p TEXT;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('catalogues',              'Admin manages own catalogues',
       ARRAY['Users can manage own catalogues']),                                  -- 20260313180000
    ('ai_insights',             'Admin manages own ai_insights',
       ARRAY['Users see own insights']),                                           -- 002
    ('ai_conversations',        'Admin manages own ai_conversations',
       ARRAY['Users see own conversations', 'Users can delete own conversations']),-- 002 + 003
    ('ai_insight_feedback',     'Admin manages own ai_insight_feedback',
       ARRAY['Users can insert own feedback', 'Users can read own feedback',
             'Users can update own feedback', 'Service role full access on feedback']), -- 003
    ('anonymous_collectors',    'anonymous_collectors_admin_policy',
       ARRAY['anonymous_collectors_user_policy']),                                 -- 001
    ('partner_score_snapshots', 'partner_score_snapshots_admin_policy',
       ARRAY['partner_score_snapshots_user_policy']),                              -- 001
    ('reporting_reminders',     'reporting_reminders_admin_policy',
       ARRAY['reporting_reminders_user_policy']),                                  -- 001
    ('career_milestones',       'career_milestones_admin_policy',
       ARRAY['career_milestones_user_policy'])                                     -- 001
  ) AS t(tbl, new_pol, old_pols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      CONTINUE;
    END IF;

    FOREACH p IN ARRAY r.old_pols LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, r.tbl);
    END LOOP;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.new_pol, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (user_id = (select auth.uid()) AND public.get_user_role() = ''admin'') '
      'WITH CHECK (user_id = (select auth.uid()) AND public.get_user_role() = ''admin'')',
      r.new_pol, r.tbl
    );
  END LOOP;
END $$;


-- ============================================================================
-- 5. production_order_documents  (= 20260702100000, never applied)
--    Original policy (20260518110000) compared user_profiles.id to auth.uid()
--    — never true, so the feature was fail-closed for everyone.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.production_order_documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS "admin_all_production_order_documents" ON public.production_order_documents;
    CREATE POLICY "admin_all_production_order_documents"
      ON public.production_order_documents FOR ALL TO authenticated
      USING (public.get_user_role() = 'admin')
      WITH CHECK (public.get_user_role() = 'admin');
  END IF;
END $$;


-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- 6a. Drop every anon-callable / edge-function-only RPC.
--     Signatures verified in 20260313150000, 20260313160000, 20260314120000.
DROP FUNCTION IF EXISTS public.get_share_link_by_token(text);
DROP FUNCTION IF EXISTS public.increment_share_link_download(text);
DROP FUNCTION IF EXISTS public.get_viewing_room_by_slug(text);
DROP FUNCTION IF EXISTS public.verify_viewing_room_password(text, text);
DROP FUNCTION IF EXISTS public.record_viewing_room_view(uuid, text);
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, integer);
DROP FUNCTION IF EXISTS public.cleanup_old_rate_limits();
-- trigger function; CASCADE removes trg_viewing_room_view_rate_limit
DROP FUNCTION IF EXISTS public.check_viewing_room_view_rate_limit() CASCADE;

-- 6b. Revoke EXECUTE from PUBLIC + anon on the helper functions that stay.
DO $$
DECLARE sig TEXT;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.generate_document_number(uuid, text)',
    'public.get_user_role()',
    'public.get_user_gallery_id()',
    'public.get_user_contact_id()'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', sig);
    END IF;
  END LOOP;
END $$;

-- 6c. Belt and braces: no function in schema public is callable by anon.
--     Supabase's default privileges granted EXECUTE to anon on every function
--     created in public (trigger functions, ref-code helpers, ...). Nothing
--     anon-facing remains, so revoke across the board. authenticated and
--     service_role keep their explicit grants. Functions owned by another
--     role (extension objects) are skipped instead of aborting the script.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON ROUTINE %s FROM PUBLIC, anon', r.sig);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'skipped (not owner): %', r.sig;
    END;
  END LOOP;
END $$;

-- 6d. generate_document_number — same signature/body as 20260313160000,
--     caller must be the authenticated admin it generates for.
--     (IS DISTINCT FROM so a NULL role — no profile row — is also rejected.)
CREATE OR REPLACE FUNCTION public.generate_document_number(p_user_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
BEGIN
  IF auth.uid() IS NULL
     OR p_user_id IS DISTINCT FROM auth.uid()
     OR public.get_user_role() IS DISTINCT FROM 'admin'
  THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  INSERT INTO document_sequences (user_id, prefix, year, last_number)
  VALUES (p_user_id, p_prefix, v_year, 1)
  ON CONFLICT (user_id, prefix, year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;
  RETURN p_prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREATE OR REPLACE keeps existing ACLs; make the app-facing grants explicit
-- so the admin UI cannot be locked out by 6b/6c.
GRANT EXECUTE ON FUNCTION public.generate_document_number(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role()                      TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.generate_document_number(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role()                      FROM PUBLIC, anon;

-- 6e. Future functions: no implicit EXECUTE for PUBLIC / anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;


-- ============================================================================
-- 7. ROLES — admin is the only role
--    Trigger trg_prevent_role_self_update (20260313160000) stays in place.
--    NOTE: this removes the profile rows only; matching auth.users rows (if
--    any non-admin ever existed) must be deleted in Dashboard → Authentication.
--    A user without a profile row gets get_user_role() = NULL → no access.
-- ============================================================================

DELETE FROM public.user_profiles WHERE role <> 'admin';

ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'admin';

DO $$
DECLARE r RECORD;
BEGIN
  -- drop every CHECK constraint on user_profiles that mentions "role"
  -- (schema.sql created it inline → auto-named user_profiles_role_check)
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t     ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_role_check CHECK (role = 'admin');
END $$;


-- ============================================================================
-- 8. DROP TABLES of removed features
--    Not dropped (still used internally): public_collections, ai_insights,
--    ai_conversations, ai_insight_feedback, price_intelligence_reports,
--    auction_alerts, partner_score_snapshots, enquiries, email_log,
--    media_files, cv_entries, gallery_forwarding_*.
-- ============================================================================

DROP TABLE IF EXISTS public.viewing_room_views        CASCADE;
DROP TABLE IF EXISTS public.viewing_rooms             CASCADE;
DROP TABLE IF EXISTS public.share_links               CASCADE;
DROP TABLE IF EXISTS public.news_read_status          CASCADE;
DROP TABLE IF EXISTS public.news_posts                CASCADE;
DROP TABLE IF EXISTS public.sale_requests             CASCADE;
DROP TABLE IF EXISTS public.gallery_access_tiers      CASCADE;
DROP TABLE IF EXISTS public.edge_function_rate_limits CASCADE;
DROP TABLE IF EXISTS public.ai_rate_limits            CASCADE;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- 9. VERIFICATION (copy of supabase/migrations/_verify_20261022_lockdown.sql)
--    Run these separately after the migration; each is read-only.
-- ============================================================================
--
-- -- (a) Policies open to anon/public or still mentioning gallery/collector.
-- --     EXPECTED: no anon rows. Acceptable rows:
-- --       * roles = {public} whose qual contains an admin check
-- --         (older policies created without TO authenticated, e.g.
-- --          "Admins manage all expense payments", admin_all_valuations);
-- --       * qual mentioning gallery_forwarding_orders / gallery_id on
-- --         admin-checked policies (gallery_forwarding_items, exhibition_galleries, ...).
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE 'anon' = ANY(roles) OR 'public' = ANY(roles)
--    OR qual ILIKE '%gallery%' OR qual ILIKE '%collector%' OR qual = 'true'
-- ORDER BY 2, 3;
--
-- -- (a2) The real red flags: {public}/anon policies WITHOUT an admin check.
-- --      EXPECTED: 0 rows.
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname IN ('public', 'storage')
--   AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
--   AND COALESCE(qual, '') NOT ILIKE '%admin%'
--   AND COALESCE(with_check, '') NOT ILIKE '%admin%'
-- ORDER BY 2, 3;
--
-- -- (b) Function privileges. EXPECTED: anon_exec = false on every row.
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.prosecdef                                 AS security_definer,
--        has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
-- ORDER BY 1, 2;
--
-- -- (b2) Dropped RPCs really gone. EXPECTED: every column NULL.
-- SELECT to_regprocedure('public.get_share_link_by_token(text)')         AS share_link_get,
--        to_regprocedure('public.increment_share_link_download(text)')   AS share_link_inc,
--        to_regprocedure('public.get_viewing_room_by_slug(text)')        AS vr_by_slug,
--        to_regprocedure('public.verify_viewing_room_password(text,text)') AS vr_pw,
--        to_regprocedure('public.record_viewing_room_view(uuid,text)')   AS vr_view,
--        to_regprocedure('public.check_rate_limit(uuid,text,integer)')   AS rate_limit,
--        to_regprocedure('public.cleanup_old_rate_limits()')             AS rate_cleanup,
--        to_regprocedure('public.check_viewing_room_view_rate_limit()')  AS vr_rate_trg;
--
-- -- (c) Cron jobs. EXPECTED: no pg_cron row (nothing scheduled); if pg_cron
-- --     IS listed, run:  SELECT jobid, jobname, schedule, command FROM cron.job;
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
-- DO $$
-- DECLARE r RECORD; n INT := 0;
-- BEGIN
--   IF to_regclass('cron.job') IS NULL THEN
--     RAISE NOTICE 'pg_cron not installed — no scheduled jobs';
--     RETURN;
--   END IF;
--   FOR r IN EXECUTE 'SELECT jobid, jobname, schedule, command FROM cron.job' LOOP
--     n := n + 1;
--     RAISE NOTICE 'cron job % [%] % : %', r.jobid, r.jobname, r.schedule, r.command;
--   END LOOP;
--   RAISE NOTICE '% cron job(s) found', n;
-- END $$;
--
-- -- (d) Buckets. EXPECTED: public = false for every bucket.
-- SELECT id, name, public FROM storage.buckets ORDER BY id;
--
-- -- (e) Roles. EXPECTED: a single row: admin | <n>.
-- SELECT role, count(*) FROM public.user_profiles GROUP BY role;
-- SELECT pg_get_constraintdef(oid) AS role_check
-- FROM pg_constraint WHERE conname = 'user_profiles_role_check';
--
-- -- (f) Dropped tables. EXPECTED: every column NULL.
-- SELECT to_regclass('public.viewing_room_views')        AS viewing_room_views,
--        to_regclass('public.viewing_rooms')             AS viewing_rooms,
--        to_regclass('public.share_links')               AS share_links,
--        to_regclass('public.news_read_status')          AS news_read_status,
--        to_regclass('public.news_posts')                AS news_posts,
--        to_regclass('public.sale_requests')             AS sale_requests,
--        to_regclass('public.gallery_access_tiers')      AS gallery_access_tiers,
--        to_regclass('public.edge_function_rate_limits') AS edge_function_rate_limits,
--        to_regclass('public.ai_rate_limits')            AS ai_rate_limits;
--
-- -- (g) Storage policies. EXPECTED (exactly these 8, all TO authenticated):
-- --     Admin can delete artwork images | Admin can delete media files
-- --     Admin can read artwork images   | Admin can read media files
-- --     Admin can update artwork images | Admin can update media files
-- --     Admin can upload artwork images | Admin can upload media files
-- SELECT policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY 1;
