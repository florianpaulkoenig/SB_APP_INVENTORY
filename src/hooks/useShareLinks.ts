import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ShareLinkRow, ShareLinkInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Helper – generate a random share token
// ---------------------------------------------------------------------------

export function generateShareToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// useShareLinks – List + CRUD (authenticated)
// ---------------------------------------------------------------------------

export function useShareLinks() {
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ---- Fetch share links ---------------------------------------------------

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('share_links')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLinks((data as ShareLinkRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch share links';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  // ---- Create share link ---------------------------------------------------

  const createLink = useCallback(async (data: ShareLinkInsert): Promise<ShareLinkRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }

      const { data: created, error: insertError } = await supabase
        .from('share_links')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Share link created', variant: 'success' });
      await fetchLinks();

      return created as ShareLinkRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create share link';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetchLinks]);

  // ---- Delete share link ---------------------------------------------------

  const deleteLink = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('share_links')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({ title: 'Share link deleted', variant: 'success' });
      await fetchLinks();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete share link';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetchLinks]);

  return { links, loading, error, refresh: fetchLinks, createLink, deleteLink };
}

// ---------------------------------------------------------------------------
// useShareLink – Single link by token (public, no auth required)
// ---------------------------------------------------------------------------

export function useShareLink(token: string) {
  const [link, setLink] = useState<ShareLinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // ---- Fetch link by token -------------------------------------------------

  const fetchLink = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('share_links')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError) throw fetchError;

      const row = data as ShareLinkRow;
      setLink(row);

      // Check expiry
      if (row.expiry) {
        setExpired(new Date(row.expiry) < new Date());
      } else {
        setExpired(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch share link';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLink(); }, [fetchLink]);

  // ---- Increment download count --------------------------------------------

  const incrementDownload = useCallback(async (): Promise<boolean> => {
    if (!link) return false;

    try {
      const { error: updateError } = await supabase
        .from('share_links')
        .update({ download_count: link.download_count + 1 })
        .eq('id', link.id);

      if (updateError) throw updateError;

      // Update local state
      setLink((prev) => prev ? { ...prev, download_count: prev.download_count + 1 } : prev);

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to increment download count';
      setError(message);
      return false;
    }
  }, [link]);

  // ---- Get signed URLs for artwork images ----------------------------------

  const getSignedUrls = useCallback(async (): Promise<
    { artworkId: string; artworkTitle: string; imageType: string; fileName: string; url: string }[]
  > => {
    if (!link) return [];

    try {
      const { artwork_ids, image_types } = link;

      // Fetch artwork_images matching the artwork_ids and image_types
      let query = supabase
        .from('artwork_images')
        .select('id, artwork_id, storage_path, file_name, image_type')
        .in('artwork_id', artwork_ids);

      if (image_types.length > 0) {
        query = query.in('image_type', image_types);
      }

      const { data: images, error: imagesError } = await query;
      if (imagesError) throw imagesError;

      if (!images || images.length === 0) return [];

      // Fetch artwork titles for the artwork_ids
      const { data: artworks, error: artworksError } = await supabase
        .from('artworks')
        .select('id, title')
        .in('id', artwork_ids);

      if (artworksError) throw artworksError;

      const titleMap = new Map<string, string>();
      for (const artwork of artworks ?? []) {
        titleMap.set(artwork.id, artwork.title);
      }

      // Generate signed URLs for each image
      const results: { artworkId: string; artworkTitle: string; imageType: string; fileName: string; url: string }[] = [];

      for (const img of images) {
        const { data: signedData, error: urlError } = await supabase.storage
          .from('artwork-images')
          .createSignedUrl(img.storage_path, 600); // 10 minutes

        if (urlError) throw urlError;

        results.push({
          artworkId: img.artwork_id,
          artworkTitle: titleMap.get(img.artwork_id) ?? 'Untitled',
          imageType: img.image_type,
          fileName: img.file_name,
          url: signedData.signedUrl,
        });
      }

      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate signed URLs';
      setError(message);
      return [];
    }
  }, [link]);

  return { link, loading, error, expired, incrementDownload, getSignedUrls };
}
