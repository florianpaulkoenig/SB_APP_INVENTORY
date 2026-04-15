import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useExchangeRates } from './useExchangeRates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaleRecord {
  id: string;
  sale_date: string;
  sale_price: number;
  currency: string;
  artworks?: { title: string; reference_code: string } | null;
  galleries?: { name: string } | null;
}

export interface ArtworkRecord {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  created_at: string;
}

export interface ProductionOrderRecord {
  id: string;
  order_number: string;
  title: string;
  status: string;
  created_at: string;
  gallery_id: string | null;
}

export interface ExpenseRecord {
  amount: number;
  currency: string;
  category: string;
}

export interface MonthlyReportData {
  // Summary
  salesCount: number;
  totalRevenueCHF: number;
  artworksCreatedCount: number;
  artworksEditedCount: number;
  productionOrdersCount: number;
  forwardingOrdersCount: number;
  certificatesCount: number;
  totalExpensesCHF: number;

  // Detail lists
  sales: SaleRecord[];
  artworksCreated: ArtworkRecord[];
  productionOrders: ProductionOrderRecord[];
  expensesByCategory: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMonthlyReport(year: number, month: number) {
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toCHF } = useExchangeRates();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Date range for selected month
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const fromTs = `${from}T00:00:00`;
      const toTs = `${to}T23:59:59`;

      // Parallel queries
      const [salesRes, artworksCreatedRes, artworksEditedRes, productionRes, forwardingRes, certificatesRes, expensesRes] =
        await Promise.all([
          // 1. Sales in date range
          supabase
            .from('sales')
            .select('id, sale_date, sale_price, currency, artworks(title, reference_code), galleries(name)')
            .gte('sale_date', from)
            .lte('sale_date', to)
            .order('sale_date', { ascending: false }),

          // 2. Artworks created in date range
          supabase
            .from('artworks')
            .select('id, title, reference_code, medium, created_at')
            .gte('created_at', fromTs)
            .lte('created_at', toTs)
            .order('created_at', { ascending: false }),

          // 3. Artworks edited (updated_at in range, but not same as created_at)
          supabase
            .from('artworks')
            .select('id, updated_at, created_at')
            .gte('updated_at', fromTs)
            .lte('updated_at', toTs),

          // 4. Production orders created
          supabase
            .from('production_orders')
            .select('id, order_number, title, status, gallery_id, created_at')
            .gte('created_at', fromTs)
            .lte('created_at', toTs)
            .order('created_at', { ascending: false }),

          // 5. Forwarding orders created
          supabase
            .from('gallery_forwarding_orders')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', fromTs)
            .lte('created_at', toTs),

          // 6. Certificates created
          supabase
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', fromTs)
            .lte('created_at', toTs),

          // 7. Expenses in date range
          supabase
            .from('expenses')
            .select('amount, currency, category')
            .gte('expense_date', from)
            .lte('expense_date', to),
        ]);

      const sales = (salesRes.data ?? []) as SaleRecord[];
      const artworksCreated = (artworksCreatedRes.data ?? []) as ArtworkRecord[];
      const artworksEditedRaw = artworksEditedRes.data ?? [];
      const productionOrders = (productionRes.data ?? []) as ProductionOrderRecord[];
      const expenses = (expensesRes.data ?? []) as ExpenseRecord[];

      // Compute edited count: exclude artworks where updated_at ≈ created_at (within 1 min)
      const editedCount = artworksEditedRaw.filter((a) => {
        const created = new Date(a.created_at).getTime();
        const updated = new Date(a.updated_at).getTime();
        return Math.abs(updated - created) > 60000; // more than 1 minute difference
      }).length;

      // Revenue in CHF
      const totalRevenueCHF = sales.reduce(
        (sum, s) => sum + toCHF(s.sale_price, s.currency ?? 'EUR'),
        0,
      );

      // Expenses in CHF by category
      const expensesByCategory: Record<string, number> = {};
      let totalExpensesCHF = 0;
      for (const e of expenses) {
        const amountCHF = toCHF(e.amount, e.currency ?? 'EUR');
        totalExpensesCHF += amountCHF;
        const cat = e.category || 'other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amountCHF;
      }

      setData({
        salesCount: sales.length,
        totalRevenueCHF,
        artworksCreatedCount: artworksCreated.length,
        artworksEditedCount: editedCount,
        productionOrdersCount: productionOrders.length,
        forwardingOrdersCount: forwardingRes.count ?? 0,
        certificatesCount: certificatesRes.count ?? 0,
        totalExpensesCHF,
        sales,
        artworksCreated,
        productionOrders,
        expensesByCategory,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [year, month, toCHF]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, loading, error, refetch: fetchReport };
}
