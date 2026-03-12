// ---------------------------------------------------------------------------
// useDemandVelocity -- Demand Velocity Dashboard data (Dashboard 5)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { computeVelocity, avgVelocity, fastestSelling, slowestSelling } from '../lib/analytics/velocity';
import type { VelocityResult } from '../lib/analytics/velocity';

export interface DemandVelocityData {
  allResults: VelocityResult[];
  avgDays: number | null;
  fastest: VelocityResult[];
  slowest: VelocityResult[];
  velocityBySeries: { series: string; avgDays: number; count: number }[];
  velocityByGallery: { gallery: string; avgDays: number; count: number }[];
  distribution: { bucket: string; count: number }[];
}

export function useDemandVelocity() {
  const [data, setData] = useState<DemandVelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: salesData, error } = await supabase
        .from('sales')
        .select('id, artwork_id, sale_date, artworks(title, released_at, consigned_since, series), galleries(name)')
        .not('sale_date', 'is', null);

      if (error) throw error;
      const sales = salesData ?? [];

      // Build velocity results
      const velocityInput = sales.map((s) => {
        const art = s.artworks as { title: string; released_at: string | null; consigned_since: string | null; series: string | null } | null;
        return {
          artwork_id: s.artwork_id,
          title: art?.title ?? 'Untitled',
          sale_date: s.sale_date,
          released_at: art?.released_at ?? null,
          consigned_since: art?.consigned_since ?? null,
        };
      });

      const results = computeVelocity(velocityInput);
      const avg = avgVelocity(results);
      const fast = fastestSelling(results, 10);
      const slow = slowestSelling(results, 10);

      // Velocity by series
      const seriesMap = new Map<string, { totalDays: number; count: number }>();
      for (const s of sales) {
        const art = s.artworks as { title: string; released_at: string | null; consigned_since: string | null; series: string | null } | null;
        const series = art?.series || 'Other';
        const start = art?.released_at || art?.consigned_since;
        if (!start || !s.sale_date) continue;
        const days = Math.max(0, (new Date(s.sale_date).getTime() - new Date(start).getTime()) / 86400000);
        const ex = seriesMap.get(series) ?? { totalDays: 0, count: 0 };
        ex.totalDays += days;
        ex.count += 1;
        seriesMap.set(series, ex);
      }
      const velocityBySeries = [...seriesMap.entries()]
        .map(([series, v]) => ({ series, avgDays: Math.round(v.totalDays / v.count), count: v.count }))
        .sort((a, b) => a.avgDays - b.avgDays);

      // Velocity by gallery
      const galleryMap = new Map<string, { totalDays: number; count: number }>();
      for (const s of sales) {
        const art = s.artworks as { title: string; released_at: string | null; consigned_since: string | null; series: string | null } | null;
        const gal = s.galleries as { name: string } | null;
        const galleryName = gal?.name || 'Direct';
        const start = art?.released_at || art?.consigned_since;
        if (!start || !s.sale_date) continue;
        const days = Math.max(0, (new Date(s.sale_date).getTime() - new Date(start).getTime()) / 86400000);
        const ex = galleryMap.get(galleryName) ?? { totalDays: 0, count: 0 };
        ex.totalDays += days;
        ex.count += 1;
        galleryMap.set(galleryName, ex);
      }
      const velocityByGallery = [...galleryMap.entries()]
        .map(([gallery, v]) => ({ gallery, avgDays: Math.round(v.totalDays / v.count), count: v.count }))
        .sort((a, b) => a.avgDays - b.avgDays);

      // Distribution histogram
      const buckets = [
        { label: '< 7d', min: 0, max: 7 },
        { label: '7-30d', min: 7, max: 30 },
        { label: '30-90d', min: 30, max: 90 },
        { label: '90-180d', min: 90, max: 180 },
        { label: '180-365d', min: 180, max: 365 },
        { label: '> 1yr', min: 365, max: Infinity },
      ];
      const distribution = buckets.map((b) => ({
        bucket: b.label,
        count: results.filter((r) => r.daysToSale >= b.min && r.daysToSale < b.max).length,
      }));

      setData({ allResults: results, avgDays: avg, fastest: fast, slowest: slow, velocityBySeries, velocityByGallery, distribution });
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to load velocity data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
