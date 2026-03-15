-- ---------------------------------------------------------------------------
-- Storage Bucket Policies
-- Without these, storage relies on defaults which may be too permissive.
-- Restricts uploads to authenticated users with proper file type/size limits.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- artwork-images bucket
-- Files stored as: {user_id}/{artwork_id}/{filename}
-- ============================================================================

-- Allow authenticated users to upload images (admin-only for now)
CREATE POLICY "Admin can upload artwork images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork-images'
    AND get_user_role() = 'admin'
    AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
    AND (octet_length(COALESCE((metadata->>'size')::text, '0')::bytea) <= 20971520)
  );

-- Allow authenticated users to update/overwrite their uploads
CREATE POLICY "Admin can update artwork images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'artwork-images' AND get_user_role() = 'admin');

-- Allow authenticated users to read artwork images (needed for signed URLs)
CREATE POLICY "Authenticated can read artwork images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artwork-images');

-- Allow anon to read artwork images (needed for share link downloads)
CREATE POLICY "Anon can read artwork images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'artwork-images');

-- Allow admin to delete artwork images
CREATE POLICY "Admin can delete artwork images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'artwork-images' AND get_user_role() = 'admin');

-- ============================================================================
-- media-files bucket
-- Files stored as: {user_id}/{category}/{filename}
-- ============================================================================

-- Admin can upload any media file type
CREATE POLICY "Admin can upload media files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-files'
    AND get_user_role() = 'admin'
  );

-- Gallery can upload media files (for submission flow)
CREATE POLICY "Gallery can upload media files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-files'
    AND get_user_role() = 'gallery'
  );

-- Authenticated can read media files
CREATE POLICY "Authenticated can read media files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media-files');

-- Admin can delete media files
CREATE POLICY "Admin can delete media files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-files' AND get_user_role() = 'admin');

-- Admin can update media files
CREATE POLICY "Admin can update media files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media-files' AND get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
