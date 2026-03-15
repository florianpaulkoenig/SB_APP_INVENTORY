-- ---------------------------------------------------------------------------
-- Fix ai_rate_limits RLS — prevent users from deleting their own rate limits
-- The FOR ALL policy allowed DELETE, enabling rate limit bypass.
-- Replace with separate SELECT/INSERT/UPDATE policies (no DELETE).
-- ---------------------------------------------------------------------------

-- Drop the overly permissive FOR ALL policy
DROP POLICY IF EXISTS "Users see own rate limits" ON ai_rate_limits;

-- Users can read their own rate limits
CREATE POLICY "Users can select own rate limits" ON ai_rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own rate limits (initial creation)
CREATE POLICY "Users can insert own rate limits" ON ai_rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rate limits (increment count)
CREATE POLICY "Users can update own rate limits" ON ai_rate_limits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- No DELETE policy — only service role (edge functions) can delete/reset rate limits

-- Also add admin access policies for newer tables that lack them
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN VALUES ('projects'), ('auction_alerts'), ('enquiries'),
    ('gallery_forwarding_orders'), ('gallery_forwarding_items'), ('cv_entries')
  LOOP
    -- Add admin full access (these tables were created after the initial admin policy loop)
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admin full access %1$s" ON %1$s',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin full access %1$s" ON %1$s FOR ALL TO authenticated USING (get_user_role() = ''admin'')',
      tbl
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
