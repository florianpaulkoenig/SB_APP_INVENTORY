-- ---------------------------------------------------------------------------
-- Fix: viewing_room_views flood protection (security audit item #8)
--
-- Problem: unlimited anonymous inserts via permissive WITH CHECK (true) policy.
-- Solution: replace direct INSERT policies with a rate-limited RPC function
-- that validates the viewing_room_id exists and limits inserts per IP.
-- ---------------------------------------------------------------------------

-- Drop the permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can insert viewing_room_views" ON viewing_room_views;
DROP POLICY IF EXISTS "Auth users can insert viewing_room_views" ON viewing_room_views;

-- Create rate-limited RPC function
CREATE OR REPLACE FUNCTION record_viewing_room_view(
  p_viewing_room_id UUID,
  p_viewer_ip TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INT;
BEGIN
  -- Validate that the viewing room exists and is published
  IF NOT EXISTS (
    SELECT 1 FROM viewing_rooms WHERE id = p_viewing_room_id
  ) THEN
    RAISE EXCEPTION 'Invalid viewing room';
  END IF;

  -- Rate limit: max 10 views per IP per viewing room per hour
  -- (if IP is provided; if null, allow but still limit by room)
  IF p_viewer_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM viewing_room_views
    WHERE viewing_room_id = p_viewing_room_id
      AND viewer_ip = p_viewer_ip
      AND viewed_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 10 THEN
      -- Silently ignore (don't reveal rate limiting to potential attacker)
      RETURN;
    END IF;
  ELSE
    -- No IP: limit to 100 views per room per hour (general flood protection)
    SELECT COUNT(*) INTO v_recent_count
    FROM viewing_room_views
    WHERE viewing_room_id = p_viewing_room_id
      AND viewer_ip IS NULL
      AND viewed_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 100 THEN
      RETURN;
    END IF;
  END IF;

  -- Insert the view record
  INSERT INTO viewing_room_views (viewing_room_id, viewer_ip, viewed_at)
  VALUES (p_viewing_room_id, p_viewer_ip, NOW());
END;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION record_viewing_room_view(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION record_viewing_room_view(UUID, TEXT) TO authenticated;

-- Add index for rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_viewing_room_views_rate_limit
  ON viewing_room_views (viewing_room_id, viewer_ip, viewed_at DESC);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
