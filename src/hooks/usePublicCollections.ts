import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { PublicCollectionRow, PublicCollectionInsert, PublicCollectionUpdate } from '../types/database';

export function usePublicCollections() {
  const [collections, setCollections] = useState<PublicCollectionRow[]>([]);
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
        .from('public_collections')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');
      if (fetchError) throw fetchError;
      setCollections((data as PublicCollectionRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch collections';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createCollection = useCallback(async (data: PublicCollectionInsert): Promise<PublicCollectionRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('public_collections')
        .insert({ ...data, user_id: session.user.id } as never)
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Collection added', variant: 'success' });
      await fetch();
      return created as PublicCollectionRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create collection';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateCollection = useCallback(async (id: string, data: PublicCollectionUpdate): Promise<PublicCollectionRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('public_collections')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Collection updated', variant: 'success' });
      await fetch();
      return updated as PublicCollectionRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update collection';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('public_collections').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Collection deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete collection';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { collections, loading, error, refetch: fetch, createCollection, updateCollection, deleteCollection };
}
