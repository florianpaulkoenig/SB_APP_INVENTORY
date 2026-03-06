import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ExhibitionRow, ExhibitionInsert, ExhibitionUpdate, ExhibitionArtworkInsert } from '../types/database';

export function useExhibitions() {
  const [exhibitions, setExhibitions] = useState<ExhibitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('exhibitions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: false, nullsFirst: false });
      if (fetchError) throw fetchError;
      setExhibitions((data as ExhibitionRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch exhibitions';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createExhibition = useCallback(async (data: ExhibitionInsert): Promise<ExhibitionRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('exhibitions')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Exhibition added', variant: 'success' });
      await fetch();
      return created as ExhibitionRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create exhibition';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateExhibition = useCallback(async (id: string, data: ExhibitionUpdate): Promise<ExhibitionRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('exhibitions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Exhibition updated', variant: 'success' });
      await fetch();
      return updated as ExhibitionRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update exhibition';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteExhibition = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('exhibitions').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Exhibition deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete exhibition';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { exhibitions, loading, error, refetch: fetch, createExhibition, updateExhibition, deleteExhibition };
}

/* ------------------------------------------------------------------ */
/*  useArtworkExhibitions – exhibitions linked to a specific artwork  */
/* ------------------------------------------------------------------ */

export function useArtworkExhibitions(artworkId: string) {
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('exhibition_artworks')
        .select('*, exhibitions(*)')
        .eq('artwork_id', artworkId);
      if (fetchError) throw fetchError;
      setExhibitions(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artwork exhibitions';
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const linkArtwork = useCallback(async (
    exhibitionId: string | null,
    newExhibitionData?: ExhibitionInsert,
  ): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return false;
      }

      let linkId = exhibitionId;

      // If no exhibitionId, create a new exhibition first
      if (!linkId && newExhibitionData) {
        const { data: created, error: createError } = await supabase
          .from('exhibitions')
          .insert({ ...newExhibitionData, user_id: session.user.id } as never)
          .select('id')
          .single();
        if (createError) throw createError;
        linkId = created.id;
      }

      if (!linkId) {
        toast({ title: 'Error', description: 'No exhibition to link', variant: 'error' });
        return false;
      }

      const { error: insertError } = await supabase
        .from('exhibition_artworks')
        .insert({ artwork_id: artworkId, exhibition_id: linkId, user_id: session.user.id } as never);
      if (insertError) throw insertError;
      toast({ title: 'Artwork linked to exhibition', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link artwork to exhibition';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [artworkId, toast, fetch]);

  const unlinkArtwork = useCallback(async (exhibitionArtworkId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('exhibition_artworks')
        .delete()
        .eq('id', exhibitionArtworkId);
      if (deleteError) throw deleteError;
      toast({ title: 'Artwork unlinked from exhibition', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unlink artwork from exhibition';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { exhibitions, loading, refetch: fetch, linkArtwork, unlinkArtwork };
}
