// ---------------------------------------------------------------------------
// usePriceLadder -- Price Ladder Dashboard data (Dashboard 11)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { computePriceLadder } from '../lib/analytics/pricing';
import type { PriceLadderTier } from '../lib/analytics/pricing';

export interface PriceLadderData {
  tiers: PriceLadderTier[];
  priceBySize: { size: string; avgPrice: number; count: number }[];
  priceBySeries: { series: string; avgPrice: number; count: number }[];
  priceDistribution: { bucket: string; count: number }[];
  totalPriced: number;
  avgPrice: number;
  medianPrice: number;
}

export function usePriceLadder() {
  const [data, setData] = useState<PriceLadderData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('id, price, currency, series')
        .gt('price', 0);

      if (error) throw error;
      const items = artworks ?? [];

      // All prices (raw, no currency conversion for simplicity)
      const prices = items.map((a) => Number(a.price) || 0).filter((p) => p > 0);
      const sorted = [...prices].sort((a, b) => a - b);

      const tiers = computePriceLadder(prices);
      const totalPriced = prices.length;
      const avgPrice = totalPriced > 0 ? prices.reduce((a, b) => a + b, 0) / totalPriced : 0;
      const medianPrice = totalPriced > 0 ? sorted[Math.floor(totalPriced / 2)] : 0;

      // Price by size (placeholder until size_category column is added)
      const priceBySize: { size: string; avgPrice: number; count: number }[] = [
        { size: 'all', avgPrice: Math.round(avgPrice), count: totalPriced },
      ];

      // Price by series
      const seriesMap = new Map<string, { total: number; count: number }>();
      for (const a of items) {
        const s = (a.series as string) || 'Other';
        const ex = seriesMap.get(s) ?? { total: 0, count: 0 };
        ex.total += Number(a.price) || 0;
        ex.count += 1;
        seriesMap.set(s, ex);
      }
      const priceBySeries = [...seriesMap.entries()]
        .map(([series, v]) => ({ series, avgPrice: Math.round(v.total / v.count), count: v.count }))
        .sort((a, b) => b.avgPrice - a.avgPrice);

      // Price distribution buckets
      const buckets = [
        { label: '< 1K', min: 0, max: 1000 },
        { label: '1-5K', min: 1000, max: 5000 },
        { label: '5-10K', min: 5000, max: 10000 },
        { label: '10-25K', min: 10000, max: 25000 },
        { label: '25-50K', min: 25000, max: 50000 },
        { label: '50K+', min: 50000, max: Infinity },
      ];
      const priceDistribution = buckets.map((b) => ({
        bucket: b.label,
        count: prices.filter((p) => p >= b.min && p < b.max).length,
      }));

      setData({ tiers, priceBySize, priceBySeries, priceDistribution, totalPriced, avgPrice, medianPrice });
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to load price data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
