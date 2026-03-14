-- ---------------------------------------------------------------------------
-- Fix CRITICAL: share_links anon SELECT policy allows enumeration
-- Drop the permissive policy that lets any anonymous user list all
-- unexpired share links. Public access is handled via SECURITY DEFINER
-- RPC functions (get_share_link_by_token, increment_share_link_download).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view share links by token" ON share_links;
