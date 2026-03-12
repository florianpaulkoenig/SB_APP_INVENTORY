import { useState, useEffect, useCallback } from 'react';
import { sanitizeStoragePath } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ArtworkImageRow, ImageType } from '../types/database';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseArtworkImagesReturn {
  images: ArtworkImageRow[];
  loading: boolean;
  uploadImage: (file: File, imageType: ImageType) => Promise<ArtworkImageRow | null>;
  deleteImage: (imageId: string, storagePath: string) => Promise<boolean>;
  setPrimaryImage: (imageId: string) => Promise<boolean>;
  getSignedUrl: (storagePath: string) => Promise<string | null>;
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useArtworkImages(artworkId: string): UseArtworkImagesReturn {
  const [images, setImages] = useState<ArtworkImageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // ---- Fetch images --------------------------------------------------------

  const fetchImages = useCallback(async () => {
    if (!artworkId) {
      setImages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('artwork_images')
        .select('id, artwork_id, user_id, storage_path, file_name, image_type, is_primary, sort_order, created_at')
        .eq('artwork_id', artworkId)
        .order('sort_order', { ascending: true });

      let { data, error: fetchError } = await query;

      // Fallback: if sort_order column doesn't exist yet, retry without it
      if (fetchError && fetchError.message?.includes('sort_order')) {
        const fallback = await supabase
          .from('artwork_images')
          .select('id, artwork_id, user_id, storage_path, file_name, image_type, is_primary, created_at')
          .eq('artwork_id', artworkId)
          .order('created_at', { ascending: true });

        data = fallback.data;
        fetchError = fallback.error;
      }

      if (fetchError) throw fetchError;

      setImages((data as ArtworkImageRow[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch images';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ---- Upload image --------------------------------------------------------

  const uploadImage = useCallback(
    async (file: File, imageType: ImageType): Promise<ArtworkImageRow | null> => {
      // Validate file size and MIME type before uploading
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Error', description: 'File too large. Maximum size is 100MB.', variant: 'error' });
        return null;
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({ title: 'Error', description: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.', variant: 'error' });
        return null;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const userId = session.user.id;
        const safeName = sanitizeStoragePath(file.name);
        const storagePath = `${userId}/${artworkId}/${safeName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('artwork-images')
          .upload(storagePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // Determine sort_order from DB to avoid race conditions with rapid uploads
        const { data: maxRow } = await supabase
          .from('artwork_images')
          .select('sort_order')
          .eq('artwork_id', artworkId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .single();
        const nextSortOrder = maxRow ? maxRow.sort_order + 1 : 0;

        // Determine if this should be the primary image (first image is primary)
        const isPrimary = nextSortOrder === 0;

        // Create DB record
        const { data: created, error: insertError } = await supabase
          .from('artwork_images')
          .insert({
            user_id: userId,
            artwork_id: artworkId,
            storage_path: storagePath,
            file_name: file.name,
            image_type: imageType,
            is_primary: isPrimary,
            sort_order: nextSortOrder,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        toast({ title: 'Image uploaded', description: `"${file.name}" has been added.`, variant: 'success' });

        // Refresh the local list
        await fetchImages();

        return created as ArtworkImageRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to upload image';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [artworkId, fetchImages, toast],
  );

  // ---- Delete image --------------------------------------------------------

  const deleteImage = useCallback(
    async (imageId: string, storagePath: string): Promise<boolean> => {
      try {
        // Remove from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('artwork-images')
          .remove([storagePath]);

        if (storageError) throw storageError;

        // Remove DB record
        const { error: deleteError } = await supabase
          .from('artwork_images')
          .delete()
          .eq('id', imageId);

        if (deleteError) throw deleteError;

        toast({ title: 'Image deleted', variant: 'success' });

        // Refresh the local list
        await fetchImages();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete image';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [fetchImages, toast],
  );

  // ---- Set primary image ---------------------------------------------------

  const setPrimaryImage = useCallback(
    async (imageId: string): Promise<boolean> => {
      try {
        // Set all images for this artwork to non-primary
        const { error: resetError } = await supabase
          .from('artwork_images')
          .update({ is_primary: false })
          .eq('artwork_id', artworkId);

        if (resetError) throw resetError;

        // Set the selected image as primary
        const { error: updateError } = await supabase
          .from('artwork_images')
          .update({ is_primary: true })
          .eq('id', imageId);

        if (updateError) throw updateError;

        toast({ title: 'Primary image updated', variant: 'success' });

        // Refresh the local list
        await fetchImages();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to set primary image';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [artworkId, fetchImages, toast],
  );

  // ---- Get signed URL ------------------------------------------------------

  const getSignedUrl = useCallback(
    async (storagePath: string): Promise<string | null> => {
      try {
        const { data, error: urlError } = await supabase.storage
          .from('artwork-images')
          .createSignedUrl(storagePath, 600); // 10 minutes

        if (urlError) throw urlError;

        return data.signedUrl;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate image URL';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  return {
    images,
    loading,
    uploadImage,
    deleteImage,
    setPrimaryImage,
    getSignedUrl,
    refetch: fetchImages,
  };
}
