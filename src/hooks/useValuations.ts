import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ValuationRow, ValuationInsert } from '../types/database';

export function useValuations(artworkId: string) {
  const [valuations, setValuations] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('valuations')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('valuation_date', { ascending: false });
      if (fetchError) throw fetchError;
      setValuations((data as ValuationRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch valuations';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createValuation = useCallback(async (data: ValuationInsert): Promise<ValuationRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('valuations')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Valuation added', variant: 'success' });
      await fetch();
      return created as ValuationRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create valuation';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteValuation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('valuations').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Valuation deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete valuation';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { valuations, loading, error, refetch: fetch, createValuation, deleteValuation };
}
