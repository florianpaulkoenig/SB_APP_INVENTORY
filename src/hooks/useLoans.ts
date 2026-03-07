import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { LoanRow, LoanInsert, LoanUpdate } from '../types/database';

export function useLoans(artworkId: string) {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('loan_start', { ascending: false });
      if (fetchError) throw fetchError;
      setLoans((data as LoanRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch loans';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createLoan = useCallback(async (data: LoanInsert): Promise<LoanRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('loans')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Loan record added', variant: 'success' });
      await fetch();
      return created as LoanRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create loan';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateLoan = useCallback(async (id: string, data: LoanUpdate): Promise<LoanRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('loans')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Loan updated', variant: 'success' });
      await fetch();
      return updated as LoanRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update loan';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteLoan = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('loans').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Loan deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete loan';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { loans, loading, error, refetch: fetch, createLoan, updateLoan, deleteLoan };
}
