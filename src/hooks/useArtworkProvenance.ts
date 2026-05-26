import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export type ProvenanceOwnerType = 'artist' | 'gallery' | 'collector' | 'institution' | 'other';
export type ProvenanceAcquisitionMethod =
  | 'creation' | 'gallery_sale' | 'auction' | 'private_sale'
  | 'gift' | 'inheritance' | 'other';

export interface ProvenanceEntry {
  id: string;
  artwork_id: string;
  owner_name: string;
  owner_type: ProvenanceOwnerType;
  acquisition_date: string | null;
  acquisition_method: ProvenanceAcquisitionMethod | null;
  notes: string | null;
  sort_order: number;
  confirmed: boolean;
  created_at: string;
}

export interface ProvenanceInsert {
  artwork_id: string;
  owner_name: string;
  owner_type: ProvenanceOwnerType;
  acquisition_date?: string | null;
  acquisition_method?: ProvenanceAcquisitionMethod | null;
  notes?: string | null;
  sort_order?: number;
  confirmed?: boolean;
}

export function useArtworkProvenance(artworkId: string | undefined) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ProvenanceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!artworkId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artwork_provenance')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEntries((data ?? []) as ProvenanceEntry[]);
    } finally {
      setLoading(false);
    }
  }, [artworkId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEntry = useCallback(async (data: Omit<ProvenanceInsert, 'artwork_id'>): Promise<ProvenanceEntry | null> => {
    if (!artworkId) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const nextOrder = entries.length > 0 ? Math.max(...entries.map(e => e.sort_order)) + 1 : 0;

    const { data: created, error } = await supabase
      .from('artwork_provenance')
      .insert({
        user_id: session.user.id,
        artwork_id: artworkId,
        sort_order: nextOrder,
        ...data,
      } as never)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Could not add provenance entry.', variant: 'error' });
      return null;
    }

    await fetch();
    return created as ProvenanceEntry;
  }, [artworkId, entries, fetch, toast]);

  const updateEntry = useCallback(async (id: string, data: Partial<ProvenanceInsert>): Promise<boolean> => {
    const { error } = await supabase
      .from('artwork_provenance')
      .update(data as never)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Could not update entry.', variant: 'error' });
      return false;
    }

    await fetch();
    return true;
  }, [fetch, toast]);

  const confirmEntry = useCallback(async (id: string): Promise<boolean> => {
    return updateEntry(id, { confirmed: true } as never);
  }, [updateEntry]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('artwork_provenance')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Could not delete entry.', variant: 'error' });
      return false;
    }

    await fetch();
    return true;
  }, [fetch, toast]);

  return { entries, loading, refetch: fetch, addEntry, updateEntry, confirmEntry, deleteEntry };
}
