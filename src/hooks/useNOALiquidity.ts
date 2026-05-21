// ---------------------------------------------------------------------------
// useNOALiquidity — rolling 12-month cash-flow projections for NOA
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';
import type {
  NOALiquiditySettingsRow,
  NOALiquidityExpenseRow,
  NOALiquidityExpenseInsert,
  NOALiquidityIncomeRow,
  NOALiquidityIncomeInsert,
} from '../types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LiquidityIncomeItem {
  id: string;
  type: 'sale' | 'pre_sold' | 'special';
  description: string;
  amount: number; // CHF — NOA share
  expectedDate: string; // ISO date
  artworkTitle?: string;
  galleryName?: string;
}

export interface LiquidityExpenseItem {
  id: string;
  type: 'fixed' | 'one_time';
  description: string;
  amount: number; // CHF
  dueDate?: string | null;
}

export interface MonthProjection {
  year: number;
  month: number; // 0-11
  label: string; // "Mai 2026"
  incomeItems: LiquidityIncomeItem[];
  expenseItems: LiquidityExpenseItem[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  endBalance: number; // projected balance at end of month
}

export interface UseNOALiquidityReturn {
  months: MonthProjection[];
  settings: NOALiquiditySettingsRow | null;
  expenses: NOALiquidityExpenseRow[];
  specialIncome: NOALiquidityIncomeRow[];
  loading: boolean;
  error: string | null;

  saveSettings: (balance: number, balanceDate: string) => Promise<void>;
  addExpense: (data: Omit<NOALiquidityExpenseInsert, 'user_id'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<NOALiquidityExpenseInsert>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSpecialIncome: (data: Omit<NOALiquidityIncomeInsert, 'user_id'>) => Promise<void>;
  updateSpecialIncome: (id: string, data: Partial<NOALiquidityIncomeInsert>) => Promise<void>;
  deleteSpecialIncome: (id: string) => Promise<void>;
  updateSalePaymentDate: (saleId: string, date: string | null) => Promise<void>;
  updateOrderPaymentDate: (orderId: string, date: string | null) => Promise<void>;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_NOA_PCT = 25;

const MONTH_LABELS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNOALiquidity(): UseNOALiquidityReturn {
  const [months, setMonths] = useState<MonthProjection[]>([]);
  const [settings, setSettings] = useState<NOALiquiditySettingsRow | null>(null);
  const [expenses, setExpenses] = useState<NOALiquidityExpenseRow[]>([]);
  const [specialIncome, setSpecialIncome] = useState<NOALiquidityIncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // ---------------------------------------------------------------------------
  // Data fetch + projection computation
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Rolling window: today → 11 months ahead (12 months total)
      const today = new Date();
      const windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const windowEnd = new Date(today.getFullYear(), today.getMonth() + 12, 0); // last day of month+11

      const windowStartStr = windowStart.toISOString().slice(0, 10);
      const windowEndStr = windowEnd.toISOString().slice(0, 10);

      const [
        settingsRes,
        salesRes,
        ordersRes,
        galleriesRes,
        expensesRes,
        incomeRes,
      ] = await Promise.all([
        supabase
          .from('noa_liquidity_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle(),

        // Sales: unpaid/partial with an expected payment date in the window
        supabase
          .from('sales')
          .select('id, sale_price, currency, sale_date, payment_status, payment_expected_date, commission_percent, gallery_id, artworks:artwork_id(title), galleries:gallery_id(name, commission_gallery, commission_noa, commission_artist, commission_rate)')
          .in('payment_status', ['pending', 'partial'])
          .not('payment_expected_date', 'is', null)
          .gte('payment_expected_date', windowStartStr)
          .lte('payment_expected_date', windowEndStr),

        // Pre-sold production orders with expected payment date
        supabase
          .from('production_orders')
          .select('id, title, price, currency, deadline, payment_expected_date, gallery_id, galleries:gallery_id(name, commission_gallery, commission_noa, commission_artist, commission_rate)')
          .eq('status', 'pre_sold')
          .not('payment_expected_date', 'is', null)
          .gte('payment_expected_date', windowStartStr)
          .lte('payment_expected_date', windowEndStr),

        // All galleries for split lookup (fallback)
        supabase
          .from('galleries')
          .select('id, commission_rate, commission_gallery, commission_noa, commission_artist'),

        supabase
          .from('noa_liquidity_expenses')
          .select('*')
          .order('type')
          .order('description'),

        supabase
          .from('noa_liquidity_income')
          .select('*')
          .gte('expected_date', windowStartStr)
          .lte('expected_date', windowEndStr)
          .order('expected_date'),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (salesRes.error) throw salesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (incomeRes.error) throw incomeRes.error;

      type GalleryRow = { id: string; commission_rate: number | null; commission_gallery: number | null; commission_noa: number | null; commission_artist: number | null };
      type GalleryJoin = { name: string; commission_gallery: number | null; commission_noa: number | null; commission_artist: number | null; commission_rate: number | null } | null;
      type SaleRow = { id: string; sale_price: number; currency: string; payment_expected_date: string; commission_percent: number | null; gallery_id: string | null; artworks: { title: string } | null; galleries: GalleryJoin };
      type OrderRow = { id: string; title: string; price: number | null; currency: string; payment_expected_date: string; gallery_id: string | null; galleries: GalleryJoin };

      const settingsData = settingsRes.data as NOALiquiditySettingsRow | null;
      const sales = (salesRes.data ?? []) as unknown as SaleRow[];
      const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
      const allGalleries = (galleriesRes.data ?? []) as unknown as GalleryRow[];
      const expenseRows = (expensesRes.data ?? []) as NOALiquidityExpenseRow[];
      const incomeRows = (incomeRes.data ?? []) as NOALiquidityIncomeRow[];

      setSettings(settingsData);
      setExpenses(expenseRows);
      setSpecialIncome(incomeRows);

      // Build gallery split map
      type GallerySplit = { noa: number; legacy: number | null };
      const gallerySplitMap = new Map<string, GallerySplit>();
      for (const g of allGalleries) {
        if (g.commission_noa != null) {
          gallerySplitMap.set(g.id, { noa: g.commission_noa, legacy: null });
        } else if (g.commission_rate != null) {
          gallerySplitMap.set(g.id, { noa: (100 - g.commission_rate) / 2, legacy: g.commission_rate });
        }
      }

      function noaShare(chfAmount: number, galleryId: string | null, saleCommission: number | null): number {
        if (galleryId) {
          const split = gallerySplitMap.get(galleryId);
          if (split) return chfAmount * (split.noa / 100);
        }
        if (saleCommission != null) {
          return chfAmount * ((100 - saleCommission) / 2 / 100);
        }
        return chfAmount * (DEFAULT_NOA_PCT / 100);
      }

      // ---------------------------------------------------------------------------
      // Build month buckets
      // ---------------------------------------------------------------------------
      type Bucket = {
        incomeItems: LiquidityIncomeItem[];
        expenseItems: LiquidityExpenseItem[];
      };

      const buckets = new Map<string, Bucket>(); // key: "YYYY-MM"
      const monthKeys: string[] = [];

      for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets.set(key, { incomeItems: [], expenseItems: [] });
        monthKeys.push(key);
      }

      function bucketKey(dateStr: string) {
        return dateStr.slice(0, 7); // "YYYY-MM"
      }

      // ---- Sales income ----
      for (const sale of sales) {
        const date = sale.payment_expected_date;
        const key = bucketKey(date);
        if (!buckets.has(key)) continue;

        const chf = toCHF(Number(sale.sale_price) || 0, sale.currency ?? 'EUR');
        const galleryNoa = sale.galleries?.commission_noa ?? null;
        const galleryRate = sale.galleries?.commission_rate ?? null;

        let noaAmt: number;
        if (galleryNoa != null) {
          noaAmt = chf * (galleryNoa / 100);
        } else if (galleryRate != null) {
          noaAmt = chf * ((100 - galleryRate) / 2 / 100);
        } else {
          noaAmt = noaShare(chf, sale.gallery_id, sale.commission_percent);
        }

        buckets.get(key)!.incomeItems.push({
          id: sale.id,
          type: 'sale',
          description: sale.artworks?.title ?? 'Artwork',
          amount: noaAmt,
          expectedDate: date,
          galleryName: sale.galleries?.name ?? undefined,
        });
      }

      // ---- Pre-sold orders income ----
      for (const order of orders) {
        const date = order.payment_expected_date;
        const key = bucketKey(date);
        if (!buckets.has(key)) continue;

        const chf = toCHF(Number(order.price) || 0, order.currency ?? 'CHF');
        const galleryNoa = order.galleries?.commission_noa ?? null;
        const galleryRate = order.galleries?.commission_rate ?? null;

        let noaAmt: number;
        if (galleryNoa != null) {
          noaAmt = chf * (galleryNoa / 100);
        } else if (galleryRate != null) {
          noaAmt = chf * ((100 - galleryRate) / 2 / 100);
        } else {
          noaAmt = chf * (DEFAULT_NOA_PCT / 100);
        }

        buckets.get(key)!.incomeItems.push({
          id: order.id,
          type: 'pre_sold',
          description: order.title,
          amount: noaAmt,
          expectedDate: date,
          galleryName: order.galleries?.name ?? undefined,
        });
      }

      // ---- Special income ----
      for (const inc of incomeRows) {
        const key = bucketKey(inc.expected_date);
        if (!buckets.has(key)) continue;
        buckets.get(key)!.incomeItems.push({
          id: inc.id,
          type: 'special',
          description: inc.description,
          amount: inc.amount,
          expectedDate: inc.expected_date,
        });
      }

      // ---- Expenses ----
      const fixedExpenses = expenseRows.filter((e) => e.type === 'fixed' && e.active);
      const oneTimeExpenses = expenseRows.filter((e) => e.type === 'one_time');

      for (const key of monthKeys) {
        const bucket = buckets.get(key)!;

        // Fixed: apply to every month
        for (const exp of fixedExpenses) {
          bucket.expenseItems.push({
            id: exp.id,
            type: 'fixed',
            description: exp.description,
            amount: exp.amount,
          });
        }

        // One-time: apply only if due_date falls in this month
        for (const exp of oneTimeExpenses) {
          if (exp.due_date && bucketKey(exp.due_date) === key) {
            bucket.expenseItems.push({
              id: exp.id,
              type: 'one_time',
              description: exp.description,
              amount: exp.amount,
              dueDate: exp.due_date,
            });
          }
        }
      }

      // ---------------------------------------------------------------------------
      // Compute projections with running balance
      // ---------------------------------------------------------------------------
      const startBalance = settingsData?.starting_balance ?? 0;
      let runningBalance = startBalance;

      // Adjust running balance: subtract months before starting_balance_date? No —
      // the starting_balance is "current balance as of today", so we project forward from it.

      const projections: MonthProjection[] = monthKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1; // 0-based
        const bucket = buckets.get(key)!;

        const totalIncome = bucket.incomeItems.reduce((s, i) => s + i.amount, 0);
        const totalExpenses = bucket.expenseItems.reduce((s, e) => s + e.amount, 0);
        const net = totalIncome - totalExpenses;
        runningBalance += net;

        return {
          year,
          month,
          label: `${MONTH_LABELS_DE[month]} ${year}`,
          incomeItems: bucket.incomeItems.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate)),
          expenseItems: bucket.expenseItems.sort((a, b) => a.description.localeCompare(b.description)),
          totalIncome,
          totalExpenses,
          net,
          endBalance: runningBalance,
        };
      });

      setMonths(projections);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Liquiditätsdaten';
      setError(message);
      toast({ title: 'Fehler', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toCHF, toast, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ratesReady) fetchData();
  }, [fetchData, ratesReady]);

  // ---------------------------------------------------------------------------
  // CRUD helpers
  // ---------------------------------------------------------------------------

  async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<T | undefined> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { toast({ title: 'Fehler', description: 'Nicht eingeloggt', variant: 'error' }); return; }
    return fn(session.user.id);
  }

  const saveSettings = useCallback(async (balance: number, balanceDate: string) => {
    await withUser(async (userId) => {
      const { error } = await supabase
        .from('noa_liquidity_settings')
        .upsert({ user_id: userId, starting_balance: balance, starting_balance_date: balanceDate, updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: 'Gespeichert', variant: 'success' });
      refetch();
    });
  }, [toast, refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const addExpense = useCallback(async (data: Omit<NOALiquidityExpenseInsert, 'user_id'>) => {
    await withUser(async (userId) => {
      const { error } = await supabase.from('noa_liquidity_expenses').insert({ ...data, user_id: userId } as never);
      if (error) throw error;
      toast({ title: 'Ausgabe hinzugefügt', variant: 'success' });
      refetch();
    });
  }, [toast, refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateExpense = useCallback(async (id: string, data: Partial<NOALiquidityExpenseInsert>) => {
    const { error } = await supabase.from('noa_liquidity_expenses').update({ ...data, updated_at: new Date().toISOString() } as never).eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    toast({ title: 'Ausgabe aktualisiert', variant: 'success' });
    refetch();
  }, [toast, refetch]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('noa_liquidity_expenses').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    toast({ title: 'Ausgabe gelöscht', variant: 'success' });
    refetch();
  }, [toast, refetch]);

  const addSpecialIncome = useCallback(async (data: Omit<NOALiquidityIncomeInsert, 'user_id'>) => {
    await withUser(async (userId) => {
      const { error } = await supabase.from('noa_liquidity_income').insert({ ...data, user_id: userId } as never);
      if (error) throw error;
      toast({ title: 'Einnahme hinzugefügt', variant: 'success' });
      refetch();
    });
  }, [toast, refetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSpecialIncome = useCallback(async (id: string, data: Partial<NOALiquidityIncomeInsert>) => {
    const { error } = await supabase.from('noa_liquidity_income').update({ ...data, updated_at: new Date().toISOString() } as never).eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    toast({ title: 'Einnahme aktualisiert', variant: 'success' });
    refetch();
  }, [toast, refetch]);

  const deleteSpecialIncome = useCallback(async (id: string) => {
    const { error } = await supabase.from('noa_liquidity_income').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    toast({ title: 'Einnahme gelöscht', variant: 'success' });
    refetch();
  }, [toast, refetch]);

  const updateSalePaymentDate = useCallback(async (saleId: string, date: string | null) => {
    const { error } = await supabase.from('sales').update({ payment_expected_date: date } as never).eq('id', saleId);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    refetch();
  }, [toast, refetch]);

  const updateOrderPaymentDate = useCallback(async (orderId: string, date: string | null) => {
    const { error } = await supabase.from('production_orders').update({ payment_expected_date: date } as never).eq('id', orderId);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return; }
    refetch();
  }, [toast, refetch]);

  return {
    months,
    settings,
    expenses,
    specialIncome,
    loading,
    error,
    saveSettings,
    addExpense,
    updateExpense,
    deleteExpense,
    addSpecialIncome,
    updateSpecialIncome,
    deleteSpecialIncome,
    updateSalePaymentDate,
    updateOrderPaymentDate,
    refetch,
  };
}
