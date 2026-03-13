-- ---------------------------------------------------------------------------
-- Security Audit Remaining Fixes — March 2026
-- 1. Replace share_links anon SELECT with secure RPC function
-- 2. Add rate-limiting helper table for edge functions
-- ---------------------------------------------------------------------------

-- ============================================================================
-- 1. CRITICAL: share_links — secure RPC function
--    Instead of allowing anon to SELECT from share_links directly, provide
--    a SECURITY DEFINER function that requires a token parameter and only
--    returns the matching row (if unexpired). This prevents enumeration.
-- ============================================================================

-- Drop the anon SELECT policy entirely — no more direct table access for anon
DROP POLICY IF EXISTS "Anon can view share links only by direct token match" ON share_links;
DROP POLICY IF EXISTS "Public can view share links by token" ON share_links;

-- Create a secure function that looks up a share link by token
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.get_share_link_by_token(p_token TEXT)
RETURNS SETOF share_links
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM share_links
  WHERE token = p_token
    AND (expiry IS NULL OR expiry > NOW())
  LIMIT 1;
$$;

-- Grant anon + authenticated the ability to call this function
GRANT EXECUTE ON FUNCTION public.get_share_link_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_share_link_by_token(TEXT) TO authenticated;

-- Anon needs UPDATE for increment_download_count, but only via RPC
-- Create a secure function for incrementing download count
CREATE OR REPLACE FUNCTION public.increment_share_link_download(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE share_links
  SET download_count = download_count + 1
  WHERE token = p_token
    AND (expiry IS NULL OR expiry > NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_link_download(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_link_download(TEXT) TO authenticated;

-- ============================================================================
-- 2. Rate-limiting table for edge functions
--    Stores request counts per user per function per minute window.
--    Edge functions check this before processing.
-- ============================================================================

CREATE TABLE IF NOT EXISTS edge_function_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON edge_function_rate_limits (user_id, function_name, window_start);

-- RLS: only service role accesses this table (edge functions use service role key)
ALTER TABLE edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM edge_function_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
$$;

-- Rate-check function: returns true if under limit, false if over
-- Also increments counter or inserts new row
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_max_requests INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- 1-minute window (truncate to minute)
  v_window := date_trunc('minute', NOW());

  -- Try to get existing count
  SELECT request_count INTO v_count
  FROM edge_function_rate_limits
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND window_start = v_window;

  IF v_count IS NULL THEN
    -- First request in this window
    INSERT INTO edge_function_rate_limits (user_id, function_name, window_start, request_count)
    VALUES (p_user_id, p_function_name, v_window, 1);
    -- Cleanup old entries occasionally (1% chance)
    IF random() < 0.01 THEN
      PERFORM cleanup_old_rate_limits();
    END IF;
    RETURN TRUE;
  ELSIF v_count >= p_max_requests THEN
    RETURN FALSE;
  ELSE
    UPDATE edge_function_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id
      AND function_name = p_function_name
      AND window_start = v_window;
    RETURN TRUE;
  END IF;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
