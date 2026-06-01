import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  PublicationBudgetRow,
  PublicationBudgetInsert,
  PublicationBudgetUpdate,
  PublicationBudgetItemRow,
  PublicationBudgetItemInsert,
  PublicationBudgetItemUpdate,
} from '../types/database';

export function usePublicationBudgets() {
  const [budgets, setBudgets] = useState<PublicationBudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('publication_budgets')
      .select('id, name, description, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); }
    else { setBudgets(data ?? []); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const createBudget = useCallback(async (insert: PublicationBudgetInsert): Promise<PublicationBudgetRow | null> => {
    const { data, error } = await supabase
      .from('publication_budgets')
      .insert(insert as never)
      .select('id, name, description, status, created_at, updated_at')
      .single();
    if (error) { toast(error.message, 'error'); return null; }
    toast('Budget created', 'success');
    setBudgets((prev) => [data, ...prev]);
    return data;
  }, [toast]);

  const updateBudget = useCallback(async (id: string, update: PublicationBudgetUpdate): Promise<boolean> => {
    const { error } = await supabase
      .from('publication_budgets')
      .update({ ...update, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) { toast(error.message, 'error'); return false; }
    toast('Budget updated', 'success');
    setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, ...update } : b));
    return true;
  }, [toast]);

  const deleteBudget = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('publication_budgets').delete().eq('id', id);
    if (error) { toast(error.message, 'error'); return false; }
    toast('Budget deleted', 'success');
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    return true;
  }, [toast]);

  return { budgets, loading, createBudget, updateBudget, deleteBudget, refresh: fetchBudgets };
}

export function usePublicationBudgetItems(budgetId: string) {
  const [items, setItems] = useState<PublicationBudgetItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    if (!budgetId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('publication_budget_items')
      .select('id, budget_id, type, category, description, quantity, unit_price, amount, currency, status, notes, created_at, updated_at')
      .eq('budget_id', budgetId)
      .order('type', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { toast(error.message, 'error'); }
    else { setItems(data ?? []); }
    setLoading(false);
  }, [budgetId, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = useCallback(async (insert: PublicationBudgetItemInsert): Promise<boolean> => {
    const { data, error } = await supabase
      .from('publication_budget_items')
      .insert(insert as never)
      .select('id, budget_id, type, category, description, quantity, unit_price, amount, currency, status, notes, created_at, updated_at')
      .single();
    if (error) { toast(error.message, 'error'); return false; }
    setItems((prev) => [...prev, data]);
    return true;
  }, [toast]);

  const updateItem = useCallback(async (id: string, update: PublicationBudgetItemUpdate): Promise<boolean> => {
    const { error } = await supabase
      .from('publication_budget_items')
      .update({ ...update, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) { toast(error.message, 'error'); return false; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...update } : i));
    return true;
  }, [toast]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('publication_budget_items').delete().eq('id', id);
    if (error) { toast(error.message, 'error'); return false; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    return true;
  }, [toast]);

  return { items, loading, addItem, updateItem, deleteItem, refresh: fetchItems };
}
