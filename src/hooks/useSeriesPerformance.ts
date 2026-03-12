// ---------------------------------------------------------------------------
// useSeriesPerformance -- Series Performance Dashboard data (Dashboard 6)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export interface SeriesRow {
  series: string;
  totalProduced: number;
  totalSold: number;
  sellThrough: number;
  totalRevenue: number;
  avgPrice: number;
  avgDaysToSale: number | null;
}

export interface SeriesPerformanceData {
  series: SeriesRow[];
  totalSeries: number;
  bestSellThrough: string | null;
  highestRevenue: string | null;
}

export function useSeriesPerformance() {
  const [data, setData] = useState<SeriesPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [artworksRes, salesRes] = await Promise.all([
        supabase.from('artworks').select('id, series, status, released_at, consigned_since, created_at'),
        supabase.from('sales').select('id, artwork_id, sale_price, sale_date, artworks(series, released_at, consigned_since)'),
      ]);

      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;

      const artworks = artworksRes.data ?? [];
      const sales = salesRes.data ?? [];

      // Group artworks by series
      const seriesMap = new Map<string, {
        produced: number; sold: number; revenue: number; daysSum: number; daysCount: number;
      }>();

      const ensure = (s: string) => {
        if (!seriesMap.has(s)) seriesMap.set(s, { produced: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0 });
        return seriesMap.get(s)!;
      };

      for (const a of artworks) {
        const s = (a.series as string) || 'Other';
        ensure(s).produced += 1;
      }

      for (const sale of sales) {
        const art = sale.artworks as { series: string | null; released_at: string | null; consigned_since: string | null } | null;
        const s = art?.series || 'Other';
        const d = ensure(s);
        d.sold += 1;
        d.revenue += Number(sale.sale_price) || 0;

        const start = art?.released_at || art?.consigned_since;
        if (start && sale.sale_date) {
          const days = Math.max(0, (new Date(sale.sale_date).getTime() - new Date(start).getTime()) / 86400000);
          d.daysSum += days;
          d.daysCount += 1;
        }
      }

      const rows: SeriesRow[] = [...seriesMap.entries()].map(([series, d]) => ({
        series,
        totalProduced: d.produced,
        totalSold: d.sold,
        sellThrough: d.produced > 0 ? Math.round((d.sold / d.produced) * 1000) / 10 : 0,
        totalRevenue: d.revenue,
        avgPrice: d.sold > 0 ? Math.round(d.revenue / d.sold) : 0,
        avgDaysToSale: d.daysCount > 0 ? Math.round(d.daysSum / d.daysCount) : null,
      }));

      rows.sort((a, b) => b.totalRevenue - a.totalRevenue);

      const bestST = [...rows].filter((r) => r.totalProduced >= 2).sort((a, b) => b.sellThrough - a.sellThrough)[0];
      const bestRev = rows[0];

      setData({
        series: rows,
        totalSeries: rows.length,
        bestSellThrough: bestST?.series ?? null,
        highestRevenue: bestRev?.series ?? null,
      });
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to load series data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
