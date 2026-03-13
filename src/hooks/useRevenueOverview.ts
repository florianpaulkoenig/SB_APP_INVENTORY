// ---------------------------------------------------------------------------
// useRevenueOverview -- Year-by-year revenue + gallery ranking with YoY change
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearSummary {
  year: number;
  revenue: number;
  count: number;
  avgPrice: number;
  yoyChange: number | null; // percentage change vs prior year, null for first year
}

export interface GalleryYearRow {
  galleryId: string;
  galleryName: string;
  revenue: number;
  count: number;
  avgPrice: number;
  rank: number;
  priorRank: number | null;
  rankChange: number | null; // positive = improved (lower rank number), negative = declined
}

export interface RevenueOverviewData {
  years: number[];
  yearSummaries: YearSummary[];
  galleryRankingsByYear: Record<number, GalleryYearRow[]>;
  lifetimeRevenue: number;
  bestYear: { year: number; revenue: number } | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRevenueOverview() {
  const [data, setData] = useState<RevenueOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id, gallery_id, sale_date, sale_price, currency, galleries(name)')
        .order('sale_date', { ascending: true });

      if (salesErr) throw salesErr;

      if (!sales || sales.length === 0) {
        setData({
          years: [],
          yearSummaries: [],
          galleryRankingsByYear: {},
          lifetimeRevenue: 0,
          bestYear: null,
        });
        setLoading(false);
        return;
      }

      // ---- Group sales by year -----------------------------------------------

      const byYear = new Map<number, typeof sales>();
      for (const s of sales) {
        if (!s.sale_date) continue;
        const year = new Date(s.sale_date).getFullYear();
        const arr = byYear.get(year) ?? [];
        arr.push(s);
        byYear.set(year, arr);
      }

      const years = Array.from(byYear.keys()).sort((a, b) => a - b);

      // ---- Year summaries with YoY change ------------------------------------

      const yearSummaries: YearSummary[] = [];
      let prevRevenue: number | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];
        const revenue = ySales.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
        const count = ySales.length;
        const avgPrice = count > 0 ? revenue / count : 0;
        const yoyChange = prevRevenue != null && prevRevenue > 0
          ? ((revenue - prevRevenue) / prevRevenue) * 100
          : null;

        yearSummaries.push({ year, revenue, count, avgPrice, yoyChange });
        prevRevenue = revenue;
      }

      // ---- Gallery rankings per year with rank change ------------------------

      const galleryRankingsByYear: Record<number, GalleryYearRow[]> = {};
      let priorRankMap: Map<string, number> | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];

        // Aggregate per gallery
        const galleryMap = new Map<string, { name: string; revenue: number; count: number }>();
        for (const s of ySales) {
          const gid = s.gallery_id ?? 'direct';
          const gData = s.galleries as { name: string } | null;
          const gName = gData?.name ?? 'Direct Sale';
          const existing = galleryMap.get(gid) ?? { name: gName, revenue: 0, count: 0 };
          existing.revenue += Number(s.sale_price) || 0;
          existing.count += 1;
          galleryMap.set(gid, existing);
        }

        // Sort by revenue descending and assign ranks
        const sorted = Array.from(galleryMap.entries())
          .map(([gid, val]) => ({ galleryId: gid, ...val, avgPrice: val.count > 0 ? val.revenue / val.count : 0 }))
          .sort((a, b) => b.revenue - a.revenue);

        const currentRankMap = new Map<string, number>();
        const rows: GalleryYearRow[] = sorted.map((g, i) => {
          const rank = i + 1;
          currentRankMap.set(g.galleryId, rank);
          const priorRank = priorRankMap?.get(g.galleryId) ?? null;
          const rankChange = priorRank != null ? priorRank - rank : null; // positive = improved

          return {
            galleryId: g.galleryId,
            galleryName: g.name,
            revenue: g.revenue,
            count: g.count,
            avgPrice: g.avgPrice,
            rank,
            priorRank,
            rankChange,
          };
        });

        galleryRankingsByYear[year] = rows;
        priorRankMap = currentRankMap;
      }

      // ---- Lifetime totals ---------------------------------------------------

      const lifetimeRevenue = yearSummaries.reduce((sum, y) => sum + y.revenue, 0);
      const bestYear = yearSummaries.length > 0
        ? yearSummaries.reduce((best, y) => y.revenue > best.revenue ? y : best)
        : null;

      setData({
        years,
        yearSummaries,
        galleryRankingsByYear,
        lifetimeRevenue,
        bestYear: bestYear ? { year: bestYear.year, revenue: bestYear.revenue } : null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch revenue data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
