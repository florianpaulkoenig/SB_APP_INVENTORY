import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { PriceHistoryRow, PriceHistoryInsert } from '../types/database';

export function usePriceHistory(artworkId: string) {
  const [entries, setEntries] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('price_history')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('effective_date', { ascending: false });
      if (fetchError) throw fetchError;
      setEntries((data as PriceHistoryRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch price history';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEntry = useCallback(async (data: PriceHistoryInsert): Promise<PriceHistoryRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('price_history')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Price history entry added', variant: 'success' });
      await fetch();
      return created as PriceHistoryRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add price history entry';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('price_history').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Price history entry deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete price history entry';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { entries, loading, error, refetch: fetch, addEntry, deleteEntry };
}
