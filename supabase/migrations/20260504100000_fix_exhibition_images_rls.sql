-- ---------------------------------------------------------------------------
-- Fix exhibition_images RLS: restrict read access to admin only.
-- The previous policy allowed any authenticated user (gallery, collector) to
-- read ALL exhibition images via direct Supabase API calls, bypassing the UI
-- role guard. Exhibition images are internal admin-only data.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "authenticated_read_exhibition_images" ON exhibition_images;

CREATE POLICY "admin_read_exhibition_images"
  ON exhibition_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
