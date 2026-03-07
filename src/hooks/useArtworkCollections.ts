import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { PublicCollectionInsert } from '../types/database';

export function useArtworkCollections(artworkId: string) {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('artwork_collections')
        .select('*, public_collections(*)')
        .eq('artwork_id', artworkId);
      if (fetchError) throw fetchError;
      setCollections(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artwork collections';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const linkArtwork = useCallback(async (
    collectionId: string | null,
    acquisitionYear?: number | null,
    notes?: string | null,
    newCollectionData?: PublicCollectionInsert,
  ): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return false;
      }

      let linkId = collectionId;

      // If no collectionId, create a new collection first
      if (!linkId && newCollectionData) {
        const { data: created, error: createError } = await supabase
          .from('public_collections')
          .insert({ ...newCollectionData, user_id: session.user.id } as never)
          .select('id')
          .single();
        if (createError) throw createError;
        linkId = created.id;
      }

      if (!linkId) {
        toast({ title: 'Error', description: 'No collection to link', variant: 'error' });
        return false;
      }

      const { error: insertError } = await supabase
        .from('artwork_collections')
        .insert({
          artwork_id: artworkId,
          collection_id: linkId,
          acquisition_year: acquisitionYear ?? null,
          notes: notes ?? null,
          user_id: session.user.id,
        } as never);
      if (insertError) throw insertError;
      toast({ title: 'Artwork linked to collection', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link artwork to collection';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [artworkId, toast, fetch]);

  const unlinkArtwork = useCallback(async (artworkCollectionId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('artwork_collections')
        .delete()
        .eq('id', artworkCollectionId);
      if (deleteError) throw deleteError;
      toast({ title: 'Artwork unlinked from collection', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unlink artwork from collection';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { collections, loading, refetch: fetch, linkArtwork, unlinkArtwork };
}
