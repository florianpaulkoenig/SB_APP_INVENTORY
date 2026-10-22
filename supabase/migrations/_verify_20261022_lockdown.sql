-- ============================================================================
-- Verification for 20261022100000_internal_only_lockdown.sql — 2026-10-22
-- Read-only. Run in the Supabase SQL editor AFTER the migration (run each
-- statement / block separately so every result set is visible).
-- Not a migration: the leading underscore keeps the CLI from picking it up.
-- ============================================================================


-- (a) Policies open to anon/public or still mentioning gallery/collector.
--     EXPECTED: no row with anon in roles. Acceptable rows:
--       * roles = {public} whose qual contains an admin check (older policies
--         created without TO authenticated, e.g. "Admins manage all expense
--         payments", admin_all_valuations, "Admin full access to artists");
--       * admin-checked policies whose qual mentions gallery_forwarding_orders
--         or gallery_id (gallery_forwarding_items, exhibition_galleries, ...).
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE 'anon' = ANY(roles) OR 'public' = ANY(roles)
   OR qual ILIKE '%gallery%' OR qual ILIKE '%collector%' OR qual = 'true'
ORDER BY 2, 3;


-- (a2) The real red flags: {public}/anon policies WITHOUT any admin check.
--      EXPECTED: 0 rows.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  AND COALESCE(qual, '') NOT ILIKE '%admin%'
  AND COALESCE(with_check, '') NOT ILIKE '%admin%'
ORDER BY 2, 3;


-- (b) Function privileges in schema public.
--     EXPECTED: anon_exec = false on EVERY row; auth_exec = true at least for
--     get_user_role and generate_document_number.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef                                 AS security_definer,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
ORDER BY 1, 2;


-- (b2) Dropped RPCs really gone. EXPECTED: every column NULL.
SELECT to_regprocedure('public.get_share_link_by_token(text)')           AS share_link_get,
       to_regprocedure('public.increment_share_link_download(text)')     AS share_link_inc,
       to_regprocedure('public.get_viewing_room_by_slug(text)')          AS vr_by_slug,
       to_regprocedure('public.verify_viewing_room_password(text,text)') AS vr_pw,
       to_regprocedure('public.record_viewing_room_view(uuid,text)')     AS vr_view,
       to_regprocedure('public.check_rate_limit(uuid,text,integer)')     AS rate_limit,
       to_regprocedure('public.cleanup_old_rate_limits()')               AS rate_cleanup,
       to_regprocedure('public.check_viewing_room_view_rate_limit()')    AS vr_rate_trg;


-- (b3) Default privileges for future functions.
--      EXPECTED: for schema public / objtype 'f' the ACL no longer lists
--      anon=X/... (authenticated and service_role may remain).
SELECT pg_get_userbyid(d.defaclrole) AS owner_role,
       n.nspname                     AS schema,
       d.defaclobjtype               AS objtype,
       d.defaclacl                   AS acl
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE d.defaclobjtype = 'f'
ORDER BY 1, 2;


-- (c) Cron jobs. pg_cron may not be installed, in which case the cron schema
--     does not exist and a direct query would error. Step 1 checks the
--     extension; step 2 prints the jobs as NOTICEs (Messages tab) if present.
--     EXPECTED: no pg_cron row, or 0 jobs.
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

DO $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron not installed — no scheduled jobs';
    RETURN;
  END IF;
  FOR r IN EXECUTE 'SELECT jobid, jobname, schedule, command FROM cron.job' LOOP
    n := n + 1;
    RAISE NOTICE 'cron job % [%] % : %', r.jobid, r.jobname, r.schedule, r.command;
  END LOOP;
  RAISE NOTICE '% cron job(s) found', n;
END $$;

-- If (c) listed pg_cron, run this one by hand to see the jobs as a result set:
-- SELECT jobid, jobname, schedule, command FROM cron.job;


-- (d) Buckets. EXPECTED: public = false for every bucket
--     (only artwork-images and media-files are used by the app).
SELECT id, name, public FROM storage.buckets ORDER BY id;


-- (e) Roles. EXPECTED: a single row  admin | <n>  and the check
--     constraint  CHECK ((role = 'admin'::text)) ; default 'admin'.
SELECT role, count(*) FROM public.user_profiles GROUP BY role;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass AND contype = 'c'
ORDER BY 1;

SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'role';

-- auth users that have NO profile row any more (left over from deleted
-- gallery/collector profiles). EXPECTED: 0 rows; otherwise delete them in
-- Dashboard → Authentication → Users.
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at;


-- (f) Dropped tables. EXPECTED: every column NULL.
SELECT to_regclass('public.viewing_room_views')        AS viewing_room_views,
       to_regclass('public.viewing_rooms')             AS viewing_rooms,
       to_regclass('public.share_links')               AS share_links,
       to_regclass('public.news_read_status')          AS news_read_status,
       to_regclass('public.news_posts')                AS news_posts,
       to_regclass('public.sale_requests')             AS sale_requests,
       to_regclass('public.gallery_access_tiers')      AS gallery_access_tiers,
       to_regclass('public.edge_function_rate_limits') AS edge_function_rate_limits,
       to_regclass('public.ai_rate_limits')            AS ai_rate_limits;

-- Tables that must still exist. EXPECTED: no NULL.
SELECT to_regclass('public.public_collections')          AS public_collections,
       to_regclass('public.ai_insights')                 AS ai_insights,
       to_regclass('public.ai_conversations')            AS ai_conversations,
       to_regclass('public.ai_insight_feedback')         AS ai_insight_feedback,
       to_regclass('public.auction_alerts')              AS auction_alerts,
       to_regclass('public.partner_score_snapshots')     AS partner_score_snapshots,
       to_regclass('public.enquiries')                   AS enquiries,
       to_regclass('public.email_log')                   AS email_log,
       to_regclass('public.media_files')                 AS media_files,
       to_regclass('public.cv_entries')                  AS cv_entries,
       to_regclass('public.gallery_forwarding_orders')   AS gallery_forwarding_orders,
       to_regclass('public.gallery_forwarding_items')    AS gallery_forwarding_items,
       to_regclass('public.production_order_documents')  AS production_order_documents;


-- (g) Storage policies. EXPECTED exactly these 8, all roles = {authenticated}:
--     Admin can delete artwork images | Admin can delete media files
--     Admin can read artwork images   | Admin can read media files
--     Admin can update artwork images | Admin can update media files
--     Admin can upload artwork images | Admin can upload media files
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY 1;


-- (h) Replacement policies from section 4 are in place.
--     EXPECTED: 8 rows, each with get_user_role() = 'admin' in qual.
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'Admin manages own catalogues',
    'Admin manages own ai_insights',
    'Admin manages own ai_conversations',
    'Admin manages own ai_insight_feedback',
    'anonymous_collectors_admin_policy',
    'partner_score_snapshots_admin_policy',
    'reporting_reminders_admin_policy',
    'career_milestones_admin_policy'
  )
ORDER BY 1, 2;


-- (i) Trigger trg_prevent_role_self_update must still exist. EXPECTED: 1 row.
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.user_profiles'::regclass AND tgname = 'trg_prevent_role_self_update';
