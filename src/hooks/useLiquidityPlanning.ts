// ---------------------------------------------------------------------------
// useLiquidityPlanning — monthly cash-flow data for NOA vs Simon Berger
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyFlow {
  month: string;       // 'Jan', 'Feb', etc.
  monthIndex: number;  // 0-11
  revenueIn: number;   // confirmed revenue received
  expectedIn: number;  // expected from consignments / pending
  expensesOut: number; // production costs, other expenses
  net: number;         // revenueIn - expensesOut
  cumulative: number;  // running cumulative net
}

export interface LiquidityData {
  months: MonthlyFlow[];
  totalRevenueIn: number;
  totalExpectedIn: number;
  totalExpensesOut: number;
  totalNet: number;
  currentBalance: number; // cumulative at current month
}

export interface UseLiquidityPlanningReturn {
  noaData: LiquidityData | null;
  sbData: LiquidityData | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DEFAULT_COMMISSION_PERCENT = 50; // NOA gets 50% by default

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLiquidityPlanning(year: number): UseLiquidityPlanningReturn {
  const [noaData, setNoaData] = useState<LiquidityData | null>(null);
  const [sbData, setSbData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Run queries in parallel
      const [
        salesResult,
        invoicesResult,
        expensesResult,
        prodOrdersResult,
        galleriesResult,
      ] = await Promise.all([
        // Sales for the year
        supabase
          .from('sales')
          .select('id, sale_price, currency, sale_date, commission_percent, gallery_id, payment_status')
          .gte('sale_date', yearStart)
          .lte('sale_date', yearEnd),
        // Invoices for the year (paid = confirmed revenue)
        supabase
          .from('invoices')
          .select('id, total, currency, issue_date, status, due_date')
          .gte('issue_date', yearStart)
          .lte('issue_date', yearEnd),
        // Expenses for the year
        supabase
          .from('expenses')
          .select('id, amount, expense_date, category')
          .gte('expense_date', yearStart)
          .lte('expense_date', yearEnd),
        // Production orders with costs
        supabase
          .from('production_orders')
          .select('id, price, currency, deadline, status, gallery_id')
          .gte('deadline', yearStart)
          .lte('deadline', yearEnd),
        // Galleries for commission splits
        supabase
          .from('galleries')
          .select('id, commission_rate, commission_gallery, commission_noa, commission_artist'),
      ]);

      if (salesResult.error) throw salesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (prodOrdersResult.error) throw prodOrdersResult.error;

      const sales = salesResult.data ?? [];
      const invoices = invoicesResult.data ?? [];
      const expenses = expensesResult.data ?? [];
      const prodOrders = prodOrdersResult.data ?? [];
      const galleries = galleriesResult.data ?? [];

      // Build gallery commission map
      const gallerySplits: Record<string, { gallery: number; noa: number; artist: number }> = {};
      const galleryCommission: Record<string, number> = {};
      for (const g of galleries) {
        if (g.commission_gallery != null || g.commission_noa != null || g.commission_artist != null) {
          gallerySplits[g.id] = {
            gallery: g.commission_gallery ?? 0,
            noa: g.commission_noa ?? 0,
            artist: g.commission_artist ?? 0,
          };
        }
        if (g.commission_rate != null) {
          galleryCommission[g.id] = g.commission_rate;
        }
      }

      // Helper: get NOA share and SB share for a sale amount (CHF)
      function getEntityShares(chfAmount: number, sale: { commission_percent: number | null; gallery_id: string | null }) {
        // If gallery has a 3-way split defined, use it
        if (sale.gallery_id && gallerySplits[sale.gallery_id]) {
          const split = gallerySplits[sale.gallery_id];
          return {
            noa: chfAmount * (split.noa / 100),
            sb: chfAmount * (split.artist / 100),
          };
        }

        // Use sale-level commission_percent if available
        const commPct = sale.commission_percent
          ?? (sale.gallery_id && galleryCommission[sale.gallery_id] != null
            ? galleryCommission[sale.gallery_id]
            : DEFAULT_COMMISSION_PERCENT);

        const noaShare = chfAmount * (commPct / 100);
        const sbShare = chfAmount - noaShare;
        return { noa: noaShare, sb: sbShare };
      }

      // Initialize monthly buckets
      const noaMonths = MONTH_NAMES.map((m, i) => ({
        month: m, monthIndex: i,
        revenueIn: 0, expectedIn: 0, expensesOut: 0, net: 0, cumulative: 0,
      }));
      const sbMonths = MONTH_NAMES.map((m, i) => ({
        month: m, monthIndex: i,
        revenueIn: 0, expectedIn: 0, expensesOut: 0, net: 0, cumulative: 0,
      }));

      // ---- Process sales ----
      for (const sale of sales) {
        if (!sale.sale_date || sale.sale_price == null) continue;
        const monthIdx = new Date(sale.sale_date).getMonth();
        const chf = toCHF(Number(sale.sale_price) || 0, sale.currency ?? 'EUR');
        const shares = getEntityShares(chf, sale);

        const isPaid = sale.payment_status === 'paid';

        if (isPaid) {
          noaMonths[monthIdx].revenueIn += shares.noa;
          sbMonths[monthIdx].revenueIn += shares.sb;
        } else {
          // Pending / partial → expected
          noaMonths[monthIdx].expectedIn += shares.noa;
          sbMonths[monthIdx].expectedIn += shares.sb;
        }
      }

      // ---- Process invoices (paid = confirmed revenue for NOA) ----
      for (const inv of invoices) {
        if (inv.status !== 'paid' || !inv.issue_date) continue;
        const monthIdx = new Date(inv.issue_date).getMonth();
        const chf = toCHF(Number(inv.total) || 0, inv.currency ?? 'CHF');
        // Invoices are NOA-level revenue (gallery commission invoices)
        noaMonths[monthIdx].revenueIn += chf;
      }

      // ---- Process expenses (100% SB) ----
      for (const exp of expenses) {
        if (!exp.expense_date) continue;
        const monthIdx = new Date(exp.expense_date).getMonth();
        const amt = Number(exp.amount) || 0;
        sbMonths[monthIdx].expensesOut += amt;
      }

      // ---- Process production orders (100% SB expense) ----
      for (const po of prodOrders) {
        if (!po.deadline || po.price == null) continue;
        const monthIdx = new Date(po.deadline).getMonth();
        const chf = toCHF(Number(po.price) || 0, po.currency ?? 'CHF');
        sbMonths[monthIdx].expensesOut += chf;
      }

      // ---- Compute net and cumulative for both entities ----
      function finalize(months: typeof noaMonths): LiquidityData {
        let cumulative = 0;
        const currentMonth = new Date().getMonth();
        let currentBalance = 0;

        for (const m of months) {
          m.net = m.revenueIn - m.expensesOut;
          cumulative += m.net;
          m.cumulative = cumulative;
          if (m.monthIndex <= currentMonth) {
            currentBalance = cumulative;
          }
        }

        return {
          months,
          totalRevenueIn: months.reduce((s, m) => s + m.revenueIn, 0),
          totalExpectedIn: months.reduce((s, m) => s + m.expectedIn, 0),
          totalExpensesOut: months.reduce((s, m) => s + m.expensesOut, 0),
          totalNet: months.reduce((s, m) => s + m.net, 0),
          currentBalance,
        };
      }

      setNoaData(finalize(noaMonths));
      setSbData(finalize(sbMonths));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch liquidity data';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [year, toCHF, toast]);

  useEffect(() => {
    if (ratesReady) fetchData();
  }, [fetchData, ratesReady]);

  return { noaData, sbData, loading, error };
}
