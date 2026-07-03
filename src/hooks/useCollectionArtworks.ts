// ---------------------------------------------------------------------------
// NOA Inventory -- useCollectionArtworks
// Fetch + manage artworks linked to a public collection.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export interface CollectionArtworkEntry {
  id: string; // artwork_collections.id
  artwork_id: string;
  acquisition_year: number | null;
  notes: string | null;
  created_at: string;
  artwork: {
    title: string;
    reference_code: string;
    year: number | null;
    medium: string | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string | null;
  } | null;
}

export function useCollectionArtworks(collectionId: string | null) {
  const [entries, setEntries] = useState<CollectionArtworkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!collectionId) { setEntries([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artwork_collections')
        .select(`
          id, artwork_id, acquisition_year, notes, created_at,
          artworks(title, reference_code, year, medium, height, width, depth, dimension_unit)
        `)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const mapped: CollectionArtworkEntry[] = ((data ?? []) as unknown as Record<string, never>[]).map((row) => ({
        id: row.id,
        artwork_id: row.artwork_id,
        acquisition_year: row.acquisition_year,
        notes: row.notes,
        created_at: row.created_at,
        artwork: row.artworks ?? null,
      }));
      setEntries(mapped);
    } catch {
      toast({ title: 'Error', description: 'Could not load artworks.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [collectionId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const addArtworks = useCallback(async (
    artworkIds: string[],
    acquisitionYear?: number | null,
  ): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !collectionId) return false;

      // Deduplicate — skip already linked
      const existingIds = new Set(entries.map((e) => e.artwork_id));
      const toAdd = artworkIds.filter((id) => !existingIds.has(id));
      if (toAdd.length === 0) {
        toast({ title: 'Already linked', description: 'All selected artworks are already in this collection.', variant: 'error' });
        return false;
      }

      const rows = toAdd.map((artwork_id) => ({
        artwork_id,
        collection_id: collectionId,
        user_id: session.user.id,
        acquisition_year: acquisitionYear ?? null,
      }));

      const { error } = await supabase.from('artwork_collections').insert(rows as never);
      if (error) throw error;
      toast({ title: `${toAdd.length} artwork${toAdd.length !== 1 ? 's' : ''} added`, variant: 'success' });
      await fetch();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Could not add artworks.', variant: 'error' });
      return false;
    }
  }, [collectionId, entries, toast, fetch]);

  const removeArtwork = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('artwork_collections').delete().eq('id', entryId);
      if (error) throw error;
      toast({ title: 'Artwork removed', variant: 'success' });
      await fetch();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Could not remove artwork.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  const updateEntry = useCallback(async (
    entryId: string,
    data: { acquisition_year?: number | null; notes?: string | null },
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('artwork_collections')
        .update(data as never)
        .eq('id', entryId);
      if (error) throw error;
      await fetch();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Could not update entry.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { entries, loading, refetch: fetch, addArtworks, removeArtwork, updateEntry };
}
