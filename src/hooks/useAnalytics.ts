import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Analytics data types
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  // KPI summary cards
  totalArtworks: number;
  totalSold: number;
  totalRevenue: number;
  totalExpenses: number;
  openInvoicesCount: number;
  openInvoicesTotal: number;
  avgTimeToSell: number | null; // days

  // Sales over time (monthly)
  salesByMonth: { month: string; revenue: number; count: number }[];

  // Revenue by gallery
  revenueByGallery: { gallery: string; revenue: number; count: number }[];

  // Category breakdown (pie chart)
  categoryBreakdown: { category: string; count: number }[];

  // Status overview
  statusOverview: { status: string; count: number }[];

  // Revenue by country
  revenueByCountry: { country: string; revenue: number }[];

  // Recent sales
  recentSales: {
    id: string;
    artwork_title: string;
    sale_price: number;
    currency: string;
    sale_date: string;
    gallery_name: string | null;
    buyer_name: string | null;
  }[];

  // Open invoices
  openInvoices: {
    id: string;
    invoice_number: string;
    total: number;
    currency: string;
    due_date: string | null;
    contact_name: string | null;
  }[];
}

export interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  dateRange: { from: string | null; to: string | null };
  setDateRange: (from: string | null, to: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Return a sortable key like "2026-01" from an ISO date string. */
function yearMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

/** Compute difference in days between two ISO date strings. */
function diffDays(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / msPerDay;
}

// ---------------------------------------------------------------------------
// Hook -- useAnalytics
// ---------------------------------------------------------------------------

export function useAnalytics(): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Set date range helper ------------------------------------------------

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  // ---- Fetch all analytics data ---------------------------------------------

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build queries in parallel ------------------------------------------

      // 1. Artworks: id, status, category, created_at
      const artworksQuery = supabase
        .from('artworks')
        .select('id, status, category, created_at');

      // 2. Sales: with joins to artworks (title, created_at), galleries (name, country), contacts (first_name, last_name)
      let salesQuery = supabase
        .from('sales')
        .select(
          'id, artwork_id, gallery_id, contact_id, sale_date, sale_price, currency, buyer_name, artworks(title, created_at), galleries(name, country), contacts(first_name, last_name)',
        )
        .order('sale_date', { ascending: false });

      // Apply date range filter to sales
      if (dateFrom) {
        salesQuery = salesQuery.gte('sale_date', dateFrom);
      }
      if (dateTo) {
        salesQuery = salesQuery.lte('sale_date', dateTo);
      }

      // 3. Invoices: open invoices (draft, sent, overdue)
      const invoicesQuery = supabase
        .from('invoices')
        .select('id, invoice_number, total, currency, due_date, status, contact_id, contacts(first_name, last_name)')
        .in('status', ['draft', 'sent', 'overdue']);

      // 4. Expenses: amount, expense_date
      let expensesQuery = supabase
        .from('expenses')
        .select('id, amount, expense_date');

      // Apply date range filter to expenses
      if (dateFrom) {
        expensesQuery = expensesQuery.gte('expense_date', dateFrom);
      }
      if (dateTo) {
        expensesQuery = expensesQuery.lte('expense_date', dateTo);
      }

      // Execute all queries in parallel
      const [artworksResult, salesResult, invoicesResult, expensesResult] =
        await Promise.all([
          artworksQuery,
          salesQuery,
          invoicesQuery,
          expensesQuery,
        ]);

      // Check for errors
      if (artworksResult.error) throw artworksResult.error;
      if (salesResult.error) throw salesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const artworks = artworksResult.data ?? [];
      const sales = salesResult.data ?? [];
      const invoices = invoicesResult.data ?? [];
      const expenses = expensesResult.data ?? [];

      // ---- Compute KPIs ---------------------------------------------------

      const totalArtworks = artworks.length;
      const totalSold = artworks.filter((a) => a.status === 'sold').length;
      const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Open invoices KPIs
      const openInvoicesCount = invoices.length;
      const openInvoicesTotal = invoices.reduce(
        (sum, inv) => sum + (Number(inv.total) || 0),
        0,
      );

      // Average time to sell (days) -----------------------------------------
      const sellTimes: number[] = [];
      for (const sale of sales) {
        const artworkData = sale.artworks as { title: string; created_at: string } | null;
        if (sale.sale_date && artworkData?.created_at) {
          const days = diffDays(sale.sale_date, artworkData.created_at);
          sellTimes.push(days);
        }
      }
      const avgTimeToSell =
        sellTimes.length > 0
          ? Math.round(sellTimes.reduce((a, b) => a + b, 0) / sellTimes.length)
          : null;

      // ---- Sales by month -------------------------------------------------

      const monthMap = new Map<string, { revenue: number; count: number }>();
      for (const sale of sales) {
        if (!sale.sale_date) continue;
        const key = yearMonthKey(sale.sale_date);
        const existing = monthMap.get(key) ?? { revenue: 0, count: 0 };
        existing.revenue += Number(sale.sale_price) || 0;
        existing.count += 1;
        monthMap.set(key, existing);
      }
      const salesByMonth = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => {
          const [year, month] = key.split('-');
          const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
          return { month: label, revenue: val.revenue, count: val.count };
        });

      // ---- Revenue by gallery ---------------------------------------------

      const galleryMap = new Map<string, { revenue: number; count: number }>();
      for (const sale of sales) {
        const galleryData = sale.galleries as { name: string; country: string | null } | null;
        const galleryName = galleryData?.name ?? 'Direct Sale';
        const existing = galleryMap.get(galleryName) ?? { revenue: 0, count: 0 };
        existing.revenue += Number(sale.sale_price) || 0;
        existing.count += 1;
        galleryMap.set(galleryName, existing);
      }
      const revenueByGallery = Array.from(galleryMap.entries())
        .map(([gallery, val]) => ({ gallery, revenue: val.revenue, count: val.count }))
        .sort((a, b) => b.revenue - a.revenue);

      // ---- Category breakdown (from artworks) -----------------------------

      const categoryMap = new Map<string, number>();
      for (const artwork of artworks) {
        const cat = artwork.category ?? 'uncategorized';
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
      }
      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // ---- Status overview (from artworks) --------------------------------

      const statusMap = new Map<string, number>();
      for (const artwork of artworks) {
        const st = artwork.status ?? 'unknown';
        statusMap.set(st, (statusMap.get(st) ?? 0) + 1);
      }
      const statusOverview = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // ---- Revenue by country ---------------------------------------------

      const countryMap = new Map<string, number>();
      for (const sale of sales) {
        const galleryData = sale.galleries as { name: string; country: string | null } | null;
        const country = galleryData?.country ?? 'Unknown';
        countryMap.set(country, (countryMap.get(country) ?? 0) + (Number(sale.sale_price) || 0));
      }
      const revenueByCountry = Array.from(countryMap.entries())
        .map(([country, revenue]) => ({ country, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // ---- Recent sales (top 10) ------------------------------------------

      const recentSales = sales.slice(0, 10).map((sale) => {
        const artworkData = sale.artworks as { title: string; created_at: string } | null;
        const galleryData = sale.galleries as { name: string; country: string | null } | null;
        return {
          id: sale.id,
          artwork_title: artworkData?.title ?? 'Untitled',
          sale_price: Number(sale.sale_price) || 0,
          currency: sale.currency,
          sale_date: sale.sale_date,
          gallery_name: galleryData?.name ?? null,
          buyer_name: sale.buyer_name ?? null,
        };
      });

      // ---- Open invoices --------------------------------------------------

      const openInvoices = invoices.map((inv) => {
        const contactData = inv.contacts as { first_name: string; last_name: string } | null;
        const contactName = contactData
          ? `${contactData.first_name} ${contactData.last_name}`.trim()
          : null;
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          total: Number(inv.total) || 0,
          currency: inv.currency,
          due_date: inv.due_date ?? null,
          contact_name: contactName,
        };
      });

      // ---- Set aggregated data --------------------------------------------

      setData({
        totalArtworks,
        totalSold,
        totalRevenue,
        totalExpenses,
        openInvoicesCount,
        openInvoicesTotal,
        avgTimeToSell,
        salesByMonth,
        revenueByGallery,
        categoryBreakdown,
        statusOverview,
        revenueByCountry,
        recentSales,
        openInvoices,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast]);

  // ---- Auto-fetch on mount and when dateRange changes -----------------------

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refresh: fetchAnalytics,
    dateRange: { from: dateFrom, to: dateTo },
    setDateRange,
  };
}
