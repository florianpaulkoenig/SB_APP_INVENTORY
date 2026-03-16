// ---------------------------------------------------------------------------
// NOA Inventory -- useExhibitionImages hook
// CRUD for images attached to exhibitions / art fairs.
// Follows the same pattern as useArtworkImages.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { sanitizeStoragePath } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExhibitionImageRow {
  id: string;
  user_id: string;
  exhibition_id: string;
  storage_path: string;
  file_name: string;
  caption: string;
  sort_order: number;
  created_at: string;
  /** Transient — resolved at runtime, not stored in DB */
  signedUrl?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExhibitionImages(exhibitionId: string | undefined) {
  const [images, setImages] = useState<ExhibitionImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ---- Fetch images ----------------------------------------------------------

  const fetchImages = useCallback(async () => {
    if (!exhibitionId) { setImages([]); setLoading(false); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exhibition_images')
        .select('*')
        .eq('exhibition_id', exhibitionId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as ExhibitionImageRow[];

      // Resolve signed URLs in parallel
      if (rows.length > 0) {
        const urls = await Promise.all(
          rows.map(async (r) => {
            const { data: urlData } = await supabase.storage
              .from('media-files')
              .createSignedUrl(r.storage_path, 600);
            return urlData?.signedUrl ?? undefined;
          }),
        );
        rows.forEach((r, i) => { r.signedUrl = urls[i]; });
      }

      setImages(rows);
    } catch {
      toast({ title: 'Error', description: 'Failed to load exhibition images.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [exhibitionId, toast]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // ---- Upload image ----------------------------------------------------------

  const uploadImage = useCallback(async (file: File, caption = ''): Promise<ExhibitionImageRow | null> => {
    if (!exhibitionId) return null;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Error', description: 'File too large. Maximum size is 20 MB.', variant: 'error' });
      return null;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: 'Error', description: 'Invalid file type. Only JPEG, PNG, and WebP allowed.', variant: 'error' });
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: 'Error', description: 'Not logged in.', variant: 'error' }); return null; }

      const safeName = sanitizeStoragePath(file.name);
      const storagePath = `exhibition-images/${exhibitionId}/${Date.now()}_${Math.random().toString(36).substring(2)}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      // Determine sort_order
      const { data: maxRow } = await supabase
        .from('exhibition_images')
        .select('sort_order')
        .eq('exhibition_id', exhibitionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      const nextSortOrder = maxRow ? maxRow.sort_order + 1 : 0;

      const { data: created, error: insertError } = await supabase
        .from('exhibition_images')
        .insert({
          user_id: session.user.id,
          exhibition_id: exhibitionId,
          storage_path: storagePath,
          file_name: file.name,
          caption,
          sort_order: nextSortOrder,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Image uploaded', description: `"${file.name}" added.`, variant: 'success' });
      await fetchImages();
      return created as ExhibitionImageRow;
    } catch {
      toast({ title: 'Error', description: 'Failed to upload image.', variant: 'error' });
      return null;
    }
  }, [exhibitionId, fetchImages, toast]);

  // ---- Delete image ----------------------------------------------------------

  const deleteImage = useCallback(async (imageId: string, storagePath: string): Promise<boolean> => {
    try {
      await supabase.storage.from('media-files').remove([storagePath]);

      const { error } = await supabase
        .from('exhibition_images')
        .delete()
        .eq('id', imageId);
      if (error) throw error;

      toast({ title: 'Image deleted', variant: 'success' });
      await fetchImages();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to delete image.', variant: 'error' });
      return false;
    }
  }, [fetchImages, toast]);

  // ---- Update caption --------------------------------------------------------

  const updateCaption = useCallback(async (imageId: string, caption: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('exhibition_images')
        .update({ caption } as never)
        .eq('id', imageId);
      if (error) throw error;

      setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, caption } : img));
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to update caption.', variant: 'error' });
      return false;
    }
  }, [toast]);

  // ---- Fetch all exhibition images (across all exhibitions) ------------------
  // Used by the catalogue builder picker and media library

  const fetchAllExhibitionImages = useCallback(async (): Promise<(ExhibitionImageRow & { exhibition_title: string })[]> => {
    try {
      const { data, error } = await supabase
        .from('exhibition_images')
        .select('*, exhibitions(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        exhibition_title: (r.exhibitions as { title: string } | null)?.title ?? 'Unknown',
      })) as (ExhibitionImageRow & { exhibition_title: string })[];

      // Resolve signed URLs
      if (rows.length > 0) {
        const urls = await Promise.all(
          rows.map(async (r) => {
            const { data: urlData } = await supabase.storage
              .from('media-files')
              .createSignedUrl(r.storage_path, 600);
            return urlData?.signedUrl ?? undefined;
          }),
        );
        rows.forEach((r, i) => { r.signedUrl = urls[i]; });
      }

      return rows;
    } catch {
      return [];
    }
  }, []);

  return {
    images,
    loading,
    uploadImage,
    deleteImage,
    updateCaption,
    fetchAllExhibitionImages,
    refetch: fetchImages,
  };
}
