// ---------------------------------------------------------------------------
// useSupplyPlanning -- Supply Planning Dashboard data (Dashboard 10)
// Production vs sales, release calendar, supply-demand gap
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlySupplyDemand {
  month: string; // YYYY-MM
  label: string; // "Jan 2024"
  produced: number;
  sold: number;
  gap: number; // produced - sold
}

export interface UpcomingRelease {
  id: string;
  title: string;
  plannedDate: string;
  status: string;
}

export interface SupplyPlanningData {
  monthlyData: MonthlySupplyDemand[];
  totalProduced: number;
  totalSold: number;
  supplyDemandRatio: number;
  avgMonthlyProduction: number;
  avgMonthlySales: number;
  upcomingReleases: UpcomingRelease[];
  statusBreakdown: { status: string; count: number }[];
  seriesProduction: { series: string; produced: number; sold: number }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSupplyPlanning() {
  const [data, setData] = useState<SupplyPlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [artworksRes, salesRes, productionRes] = await Promise.all([
        supabase.from('artworks').select('id, status, series, created_at'),
        supabase.from('sales').select('id, artwork_id, sale_date'),
        supabase.from('production_orders').select('id, title, status, planned_release_date, ordered_date, deadline'),
      ]);

      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;
      if (productionRes.error) throw productionRes.error;

      const artworks = artworksRes.data ?? [];
      const sales = salesRes.data ?? [];
      const orders = productionRes.data ?? [];

      // Monthly production (by artwork created_at) and sales
      const monthlyMap = new Map<string, { produced: number; sold: number }>();

      for (const a of artworks) {
        if (!a.created_at) continue;
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthlyMap.get(key) ?? { produced: 0, sold: 0 };
        m.produced++;
        monthlyMap.set(key, m);
      }

      for (const s of sales) {
        if (!s.sale_date) continue;
        const d = new Date(s.sale_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthlyMap.get(key) ?? { produced: 0, sold: 0 };
        m.sold++;
        monthlyMap.set(key, m);
      }

      const monthlyData: MonthlySupplyDemand[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-24) // Last 24 months
        .map(([month, v]) => {
          const [y, m] = month.split('-');
          const d = new Date(Number(y), Number(m) - 1);
          return {
            month,
            label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            produced: v.produced,
            sold: v.sold,
            gap: v.produced - v.sold,
          };
        });

      // Upcoming releases
      const now = new Date().toISOString().slice(0, 10);
      const upcomingReleases: UpcomingRelease[] = orders
        .filter((o) => o.planned_release_date && o.planned_release_date >= now)
        .sort((a, b) => (a.planned_release_date ?? '').localeCompare(b.planned_release_date ?? ''))
        .slice(0, 20)
        .map((o) => ({
          id: o.id,
          title: o.title,
          plannedDate: o.planned_release_date!,
          status: o.status,
        }));

      // Production order status breakdown
      const statusMap = new Map<string, number>();
      for (const o of orders) {
        statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
      }
      const statusBreakdown = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Series production vs sold
      const seriesMap = new Map<string, { produced: number; sold: number }>();
      const soldArtworkIds = new Set(sales.map((s) => s.artwork_id));
      for (const a of artworks) {
        const series = a.series || 'Unknown';
        const s = seriesMap.get(series) ?? { produced: 0, sold: 0 };
        s.produced++;
        if (soldArtworkIds.has(a.id)) s.sold++;
        seriesMap.set(series, s);
      }
      const seriesProduction = Array.from(seriesMap.entries())
        .map(([series, v]) => ({ series, ...v }))
        .sort((a, b) => b.produced - a.produced)
        .slice(0, 12);

      const totalProduced = artworks.length;
      const totalSold = sales.length;
      const months = monthlyData.length || 1;

      setData({
        monthlyData,
        totalProduced,
        totalSold,
        supplyDemandRatio: totalSold > 0 ? Math.round((totalProduced / totalSold) * 10) / 10 : 0,
        avgMonthlyProduction: Math.round(totalProduced / months),
        avgMonthlySales: Math.round(totalSold / months),
        upcomingReleases,
        statusBreakdown,
        seriesProduction,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch supply planning data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
