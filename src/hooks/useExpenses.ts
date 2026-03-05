import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ExpenseRow, ExpenseInsert, ExpenseUpdate } from '../types/database';

export function useExpenses(artworkId?: string) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
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
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('expense_date', { ascending: false });
      if (artworkId) {
        query = query.eq('artwork_id', artworkId);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setExpenses((data as ExpenseRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch expenses';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }, [expenses]);

  const createExpense = useCallback(async (data: ExpenseInsert): Promise<ExpenseRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('expenses')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Expense added', variant: 'success' });
      await fetch();
      return created as ExpenseRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create expense';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateExpense = useCallback(async (id: string, data: ExpenseUpdate): Promise<ExpenseRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Expense updated', variant: 'success' });
      await fetch();
      return updated as ExpenseRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update expense';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Expense deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete expense';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { expenses, loading, error, totalAmount, refetch: fetch, createExpense, updateExpense, deleteExpense };
}
