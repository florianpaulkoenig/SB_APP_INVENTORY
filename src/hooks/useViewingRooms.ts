import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ViewingRoomRow, ViewingRoomInsert, ViewingRoomUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Helper – generate a URL-friendly slug from a title
// ---------------------------------------------------------------------------

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// PublicArtwork interface
// ---------------------------------------------------------------------------

export interface PublicArtwork {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: string;
  edition_type: string;
  edition_number: number | null;
  edition_total: number | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// useViewingRooms – List + CRUD (authenticated)
// ---------------------------------------------------------------------------

export function useViewingRooms() {
  const [rooms, setRooms] = useState<ViewingRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ---- Fetch viewing rooms --------------------------------------------------

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('viewing_rooms')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRooms((data as ViewingRoomRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch viewing rooms';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ---- Create viewing room --------------------------------------------------

  const createRoom = useCallback(async (data: ViewingRoomInsert): Promise<ViewingRoomRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }

      const { data: created, error: insertError } = await supabase
        .from('viewing_rooms')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Viewing room created', description: `"${created.title}" has been added.`, variant: 'success' });
      await fetchRooms();

      return created as ViewingRoomRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create viewing room';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetchRooms]);

  // ---- Update viewing room --------------------------------------------------

  const updateRoom = useCallback(async (id: string, data: ViewingRoomUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('viewing_rooms')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({ title: 'Viewing room updated', variant: 'success' });
      await fetchRooms();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update viewing room';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetchRooms]);

  // ---- Delete viewing room --------------------------------------------------

  const deleteRoom = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('viewing_rooms')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({ title: 'Viewing room deleted', variant: 'success' });
      await fetchRooms();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete viewing room';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetchRooms]);

  return { rooms, loading, error, refresh: fetchRooms, createRoom, updateRoom, deleteRoom };
}

// ---------------------------------------------------------------------------
// useViewingRoom – Single room for editing (authenticated)
// ---------------------------------------------------------------------------

export function useViewingRoom(id: string) {
  const [room, setRoom] = useState<ViewingRoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ---- Fetch single viewing room --------------------------------------------

  const fetchRoom = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('viewing_rooms')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setRoom(data as ViewingRoomRow);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch viewing room';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ---- Update viewing room --------------------------------------------------

  const updateRoom = useCallback(async (data: ViewingRoomUpdate): Promise<boolean> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('viewing_rooms')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRoom(updated as ViewingRoomRow);
      toast({ title: 'Viewing room updated', variant: 'success' });

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update viewing room';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [id, toast]);

  // ---- Toggle published -----------------------------------------------------

  const togglePublished = useCallback(async (): Promise<boolean> => {
    if (!room) return false;

    try {
      const newPublished = !room.published;
      const { data: updated, error: updateError } = await supabase
        .from('viewing_rooms')
        .update({ published: newPublished })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRoom(updated as ViewingRoomRow);
      toast({
        title: newPublished ? 'Viewing room published' : 'Viewing room unpublished',
        variant: 'success',
      });

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle published status';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [id, room, toast]);

  return { room, loading, error, updateRoom, togglePublished };
}

// ---------------------------------------------------------------------------
// usePublicViewingRoom – Public room by slug (NO auth)
// ---------------------------------------------------------------------------

export function usePublicViewingRoom(slug: string) {
  const [room, setRoom] = useState<ViewingRoomRow | null>(null);
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch public viewing room by slug ------------------------------------

  const fetchRoom = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('viewing_rooms')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (fetchError) throw fetchError;

      const row = data as ViewingRoomRow;
      setRoom(row);

      // Fetch artworks for this room
      if (row.artwork_ids && row.artwork_ids.length > 0) {
        const { data: artworkData, error: artworkError } = await supabase
          .from('artworks')
          .select('id, title, reference_code, medium, year, height, width, depth, dimension_unit, edition_type, edition_number, edition_total')
          .in('id', row.artwork_ids);

        if (artworkError) throw artworkError;

        // Fetch primary images for these artworks
        const { data: imageData, error: imageError } = await supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .in('artwork_id', row.artwork_ids)
          .eq('is_primary', true);

        if (imageError) throw imageError;

        // Generate signed URLs for images
        const imageMap = new Map<string, string>();

        for (const img of imageData ?? []) {
          const { data: signedData, error: urlError } = await supabase.storage
            .from('artwork-images')
            .createSignedUrl(img.storage_path, 60 * 60); // 60 minutes

          if (!urlError && signedData) {
            imageMap.set(img.artwork_id, signedData.signedUrl);
          }
        }

        // Build PublicArtwork list preserving artwork_ids order
        const artworkMap = new Map<string, any>();
        for (const aw of artworkData ?? []) {
          artworkMap.set(aw.id, aw);
        }

        const publicArtworks: PublicArtwork[] = row.artwork_ids
          .map((aid) => {
            const aw = artworkMap.get(aid);
            if (!aw) return null;
            return {
              id: aw.id,
              title: aw.title,
              reference_code: aw.reference_code,
              medium: aw.medium,
              year: aw.year,
              height: aw.height,
              width: aw.width,
              depth: aw.depth,
              dimension_unit: aw.dimension_unit,
              edition_type: aw.edition_type,
              edition_number: aw.edition_number,
              edition_total: aw.edition_total,
              imageUrl: imageMap.get(aid) ?? null,
            } as PublicArtwork;
          })
          .filter((a): a is PublicArtwork => a !== null);

        setArtworks(publicArtworks);
      } else {
        setArtworks([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch viewing room';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ---- Password check -------------------------------------------------------

  const checkPassword = useCallback(
    (password: string): boolean => {
      if (!room?.password_hash) return true;
      return btoa(password) === room.password_hash;
    },
    [room],
  );

  return { room, artworks, loading, error, checkPassword };
}
