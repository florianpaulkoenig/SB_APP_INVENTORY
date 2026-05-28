-- ---------------------------------------------------------------------------
-- Fix exhibition_images RLS: wrong column used in all policies.
-- Previous policies used user_profiles.id = auth.uid() but the correct
-- column mapping Supabase auth UIDs is user_profiles.user_id = auth.uid().
-- This caused all admin INSERT/SELECT to silently fail.
-- ---------------------------------------------------------------------------

-- Drop both existing policies
DROP POLICY IF EXISTS "admin_full_access_exhibition_images" ON exhibition_images;
DROP POLICY IF EXISTS "admin_read_exhibition_images"        ON exhibition_images;

-- Re-create with correct column reference
CREATE POLICY "admin_full_access_exhibition_images"
  ON exhibition_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
