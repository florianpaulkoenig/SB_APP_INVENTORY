// ---------------------------------------------------------------------------
// useCareerTrajectory -- Career Trajectory Dashboard data (Dashboard 12)
// Timeline, milestones, cumulative growth
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MilestoneRow {
  id: string;
  year: number;
  type: string;
  title: string;
  description: string | null;
  institution: string | null;
  city: string | null;
  country: string | null;
}

export interface YearlyGrowth {
  year: number;
  sales: number;
  revenue: number;
  exhibitions: number;
  milestones: number;
  cumulativeRevenue: number;
  cumulativeSales: number;
}

export interface CareerTrajectoryData {
  milestones: MilestoneRow[];
  yearlyGrowth: YearlyGrowth[];
  totalMilestones: number;
  totalExhibitions: number;
  totalSalesCount: number;
  totalRevenue: number;
  yearsActive: number;
  milestonesByType: { type: string; count: number }[];
  milestonesByCountry: { country: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCareerTrajectory() {
  const [data, setData] = useState<CareerTrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [milestonesRes, salesRes, exhibitionsRes] = await Promise.all([
        supabase.from('career_milestones').select('id, year, milestone_type, title, description, institution, city, country'),
        supabase.from('sales').select('id, sale_price, currency, sale_date'),
        supabase.from('exhibitions').select('id, start_date, type'),
      ]);

      if (milestonesRes.error) throw milestonesRes.error;
      if (salesRes.error) throw salesRes.error;
      if (exhibitionsRes.error) throw exhibitionsRes.error;

      const milestones = (milestonesRes.data ?? []).map((m) => ({
        id: m.id,
        year: m.year,
        type: m.milestone_type,
        title: m.title,
        description: m.description,
        institution: m.institution,
        city: m.city,
        country: m.country,
      }));
      const sales = salesRes.data ?? [];
      const exhibitions = exhibitionsRes.data ?? [];

      // Build yearly data
      const yearMap = new Map<number, { sales: number; revenue: number; exhibitions: number; milestones: number }>();

      // Sales by year
      for (const s of sales) {
        if (!s.sale_date) continue;
        const year = new Date(s.sale_date).getFullYear();
        const y = yearMap.get(year) ?? { sales: 0, revenue: 0, exhibitions: 0, milestones: 0 };
        y.sales++;
        y.revenue += Number(s.sale_price) || 0;
        yearMap.set(year, y);
      }

      // Exhibitions by year
      for (const e of exhibitions) {
        if (!e.start_date) continue;
        const year = new Date(e.start_date).getFullYear();
        const y = yearMap.get(year) ?? { sales: 0, revenue: 0, exhibitions: 0, milestones: 0 };
        y.exhibitions++;
        yearMap.set(year, y);
      }

      // Milestones by year
      for (const m of milestones) {
        const y = yearMap.get(m.year) ?? { sales: 0, revenue: 0, exhibitions: 0, milestones: 0 };
        y.milestones++;
        yearMap.set(m.year, y);
      }

      // Build cumulative growth
      let cumRevenue = 0;
      let cumSales = 0;
      const yearlyGrowth: YearlyGrowth[] = Array.from(yearMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, v]) => {
          cumRevenue += v.revenue;
          cumSales += v.sales;
          return {
            year,
            ...v,
            cumulativeRevenue: cumRevenue,
            cumulativeSales: cumSales,
          };
        });

      // Milestones by type
      const typeMap = new Map<string, number>();
      for (const m of milestones) {
        typeMap.set(m.type, (typeMap.get(m.type) ?? 0) + 1);
      }
      const milestonesByType = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Milestones by country
      const countryMap = new Map<string, number>();
      for (const m of milestones) {
        if (m.country) countryMap.set(m.country, (countryMap.get(m.country) ?? 0) + 1);
      }
      const milestonesByCountry = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      const years = yearlyGrowth.map((y) => y.year);
      const yearsActive = years.length > 0 ? years[years.length - 1] - years[0] + 1 : 0;

      setData({
        milestones: milestones.sort((a, b) => b.year - a.year),
        yearlyGrowth,
        totalMilestones: milestones.length,
        totalExhibitions: exhibitions.length,
        totalSalesCount: sales.length,
        totalRevenue: cumRevenue,
        yearsActive,
        milestonesByType,
        milestonesByCountry,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch career trajectory';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
