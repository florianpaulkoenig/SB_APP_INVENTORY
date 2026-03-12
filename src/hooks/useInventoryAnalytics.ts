// ---------------------------------------------------------------------------
// useInventoryAnalytics -- Inventory Health Dashboard data
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ArtworkStatus } from '../types/database';
import { countByStatus, computeAgingBuckets, pressureRatio } from '../lib/analytics/inventory';
import type { StatusCounts, AgingBucket } from '../lib/analytics/inventory';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventoryAnalyticsData {
  total: number;
  statusCounts: StatusCounts;
  pressureRatio: number;
  agingBuckets: AgingBucket[];
  sellThroughRate: number;
  avgDaysOnMarket: number | null;
  categoryDistribution: { category: string; count: number }[];
  seriesDistribution: { series: string; count: number; sold: number }[];
  sizeDistribution: { size: string; count: number }[];
  monthlyProduction: { month: string; count: number }[];
  inventoryFunnel: { stage: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInventoryAnalytics() {
  const [data, setData] = useState<InventoryAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [artworksRes, salesRes] = await Promise.all([
        supabase
          .from('artworks')
          .select('id, status, category, series, created_at, consigned_since'),
        supabase
          .from('sales')
          .select('id, artwork_id, sale_date'),
      ]);

      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;

      const artworks = artworksRes.data ?? [];
      const sales = salesRes.data ?? [];

      const total = artworks.length;
      const statusC = countByStatus(artworks as { status: ArtworkStatus }[]);
      const agingBuckets = computeAgingBuckets(
        artworks as { created_at: string; status: ArtworkStatus }[],
      );

      // Monthly sales average for pressure ratio
      const saleDates = sales.map((s) => s.sale_date).filter(Boolean) as string[];
      let monthlySalesAvg = 0;
      if (saleDates.length > 0) {
        const months = new Set(saleDates.map((d) => d.slice(0, 7)));
        monthlySalesAvg = saleDates.length / Math.max(months.size, 1);
      }
      const pr = pressureRatio(statusC.available, monthlySalesAvg);

      // Sell-through rate
      const soldCount = artworks.filter((a) => a.status === 'sold').length;
      const sellThroughRate = total > 0 ? (soldCount / total) * 100 : 0;

      // Average days on market for unsold works
      const now = new Date();
      const unsold = artworks.filter(
        (a) => a.status !== 'sold' && a.status !== 'archived' && a.status !== 'destroyed',
      );
      let totalDays = 0;
      let dayCount = 0;
      for (const a of unsold) {
        const start = a.consigned_since || a.created_at;
        if (start) {
          totalDays += (now.getTime() - new Date(start).getTime()) / 86400000;
          dayCount++;
        }
      }
      const avgDaysOnMarket = dayCount > 0 ? Math.round(totalDays / dayCount) : null;

      // Category distribution
      const catMap = new Map<string, number>();
      for (const a of artworks) {
        const c = (a.category as string) || 'Uncategorized';
        catMap.set(c, (catMap.get(c) ?? 0) + 1);
      }
      const categoryDistribution = [...catMap.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Series distribution (with sold count)
      const serMap = new Map<string, { count: number; sold: number }>();
      const soldArtworkIds = new Set(sales.map((s) => s.artwork_id));
      for (const a of artworks) {
        const s = (a.series as string) || 'Other';
        const ex = serMap.get(s) ?? { count: 0, sold: 0 };
        ex.count += 1;
        if (soldArtworkIds.has(a.id) || a.status === 'sold') ex.sold += 1;
        serMap.set(s, ex);
      }
      const seriesDistribution = [...serMap.entries()]
        .map(([series, v]) => ({ series, count: v.count, sold: v.sold }))
        .sort((a, b) => b.count - a.count);

      // Size distribution (placeholder until size_category column is added)
      const sizeDistribution: { size: string; count: number }[] = [{ size: 'unspecified', count: total }];

      // Monthly production (by created_at)
      const monthMap = new Map<string, number>();
      for (const a of artworks) {
        if (!a.created_at) continue;
        const m = (a.created_at as string).slice(0, 7);
        monthMap.set(m, (monthMap.get(m) ?? 0) + 1);
      }
      const monthlyProduction = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // Inventory funnel
      const inventoryFunnel = [
        { stage: 'Total', count: total },
        { stage: 'Available', count: statusC.available },
        { stage: 'On Consignment', count: statusC.on_consignment },
        { stage: 'Reserved', count: statusC.reserved },
        { stage: 'Sold', count: soldCount },
      ];

      setData({
        total,
        statusCounts: statusC,
        pressureRatio: pr === Infinity ? -1 : Math.round(pr * 10) / 10,
        agingBuckets,
        sellThroughRate,
        avgDaysOnMarket,
        categoryDistribution,
        seriesDistribution,
        sizeDistribution,
        monthlyProduction,
        inventoryFunnel,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory analytics';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
