// ---------------------------------------------------------------------------
// useNOALiquidity — manual income entries, grouped into a 12-month view
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { NOALiquidityIncomeRow } from '../types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MonthBucket {
  year: number;
  month: number; // 0-indexed
  label: string; // e.g. "Juni 2026"
  entries: NOALiquidityIncomeRow[];
}

export interface UseNOALiquidityReturn {
  months: MonthBucket[];
  loading: boolean;
  addIncome: (data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }) => Promise<boolean>;
  deleteIncome: (id: string) => Promise<boolean>;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_LABELS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNOALiquidity(): UseNOALiquidityReturn {
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const { toast } = useToast();

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const today = new Date();
      const windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const windowEnd   = new Date(today.getFullYear(), today.getMonth() + 12, 0);

      const { data, error } = await supabase
        .from('noa_liquidity_income' as never)
        .select('*')
        .gte('expected_date', windowStart.toISOString().slice(0, 10))
        .lte('expected_date', windowEnd.toISOString().slice(0, 10))
        .order('expected_date', { ascending: true });

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'error' });
        setLoading(false);
        return;
      }

      const entries = (data ?? []) as NOALiquidityIncomeRow[];

      // Group into 12 monthly buckets
      const buckets: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return {
          year: d.getFullYear(),
          month: d.getMonth(),
          label: `${MONTH_LABELS_DE[d.getMonth()]} ${d.getFullYear()}`,
          entries: entries.filter((e) => e.expected_date.startsWith(key)),
        };
      });

      setMonths(buckets);
      setLoading(false);
    }

    load();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const addIncome = useCallback(async (data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .insert({
        user_id: session.user.id,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        expected_date: data.expected_date,
        notes: data.notes ?? null,
      } as never);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'error' });
      return false;
    }

    toast({ title: 'Einnahme hinzugefügt', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'error' });
      return false;
    }

    toast({ title: 'Einnahme gelöscht', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  return { months, loading, addIncome, deleteIncome, refetch };
}
