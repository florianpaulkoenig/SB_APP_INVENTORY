// ---------------------------------------------------------------------------
// useMediaImpact -- Media Impact Tracker data
// Press coverage correlation with sales lift
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaCoverage {
  milestoneId: string;
  title: string;
  type: string;
  institution: string | null;
  year: number;
  country: string | null;
  salesInFollowing90Days: number;
  revenueInFollowing90Days: number;
  salesLift: number | null;    // % vs 90-day baseline
  impactScore: number;         // 0-100
}

export interface MediaImpactData {
  publications: MediaCoverage[];
  totalPublications: number;
  avgSalesLift: number;
  highestImpact: MediaCoverage | null;
  yearlyPublicationCount: { year: number; count: number }[];
  avgImpactScore: number;
  topCountries: { country: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Count sales and revenue within a date window */
function salesInWindow(
  sales: { sale_date: string | null; sale_price: number | null }[],
  startMs: number,
  days: number,
): { count: number; revenue: number } {
  const endMs = startMs + days * MS_PER_DAY;
  let count = 0;
  let revenue = 0;
  for (const s of sales) {
    if (!s.sale_date) continue;
    const t = new Date(s.sale_date).getTime();
    if (t >= startMs && t < endMs) {
      count++;
      revenue += Number(s.sale_price) || 0;
    }
  }
  return { count, revenue };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMediaImpact() {
  const [data, setData] = useState<MediaImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Fetch publications and sales in parallel
      const [pubRes, salesRes] = await Promise.all([
        supabase
          .from('career_milestones')
          .select('id, year, milestone_type, title, description, institution, city, country, created_at')
          .eq('milestone_type', 'publication'),
        supabase
          .from('sales')
          .select('id, sale_date, sale_price'),
      ]);

      if (pubRes.error) throw pubRes.error;
      if (salesRes.error) throw salesRes.error;

      const publications = pubRes.data ?? [];
      const sales = salesRes.data ?? [];

      // ---------------------------------------------------------------
      // Compute 90-day baseline: average sales count per 90-day window
      // across the entire sales history
      // ---------------------------------------------------------------
      let baseline90Sales = 0;
      if (sales.length > 0) {
        const dates = sales
          .map((s) => s.sale_date ? new Date(s.sale_date).getTime() : null)
          .filter((d): d is number => d != null)
          .sort((a, b) => a - b);

        if (dates.length > 0) {
          const spanMs = dates[dates.length - 1] - dates[0];
          const spanDays = Math.max(spanMs / MS_PER_DAY, 90);
          const windows = spanDays / 90;
          baseline90Sales = dates.length / windows;
        }
      }

      // ---------------------------------------------------------------
      // Build MediaCoverage rows
      // ---------------------------------------------------------------
      const rows: MediaCoverage[] = [];

      for (const pub of publications) {
        // Best approximation of publication date: use created_at if
        // available, otherwise Jan 1 of the milestone year.
        const startMs = pub.created_at
          ? new Date(pub.created_at).getTime()
          : new Date(`${pub.year}-01-01`).getTime();

        const { count: salesCount, revenue } = salesInWindow(sales, startMs, 90);

        // Sales lift vs baseline
        let salesLift: number | null = null;
        if (baseline90Sales > 0) {
          salesLift = Math.round(((salesCount - baseline90Sales) / baseline90Sales) * 100 * 10) / 10;
        }

        // Impact score: 0-100, derived from sales lift + raw sales count
        let impactScore = 0;
        if (salesLift != null && salesLift > 0) {
          impactScore = Math.min(100, Math.round(salesLift * 2));
        } else {
          // Fallback: purely count-based (each sale = 10 points, max 100)
          impactScore = Math.min(100, salesCount * 10);
        }

        rows.push({
          milestoneId: pub.id,
          title: pub.title,
          type: pub.milestone_type ?? 'publication',
          institution: pub.institution,
          year: pub.year,
          country: pub.country,
          salesInFollowing90Days: salesCount,
          revenueInFollowing90Days: revenue,
          salesLift,
          impactScore,
        });
      }

      // Sort by impact score descending
      rows.sort((a, b) => b.impactScore - a.impactScore);

      // ---------------------------------------------------------------
      // Aggregates
      // ---------------------------------------------------------------

      // Yearly publication count
      const yearMap = new Map<number, number>();
      for (const r of rows) {
        yearMap.set(r.year, (yearMap.get(r.year) ?? 0) + 1);
      }
      const yearlyPublicationCount = Array.from(yearMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

      // Top countries
      const countryMap = new Map<string, number>();
      for (const r of rows) {
        const c = r.country ?? 'Unknown';
        countryMap.set(c, (countryMap.get(c) ?? 0) + 1);
      }
      const topCountries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      // Averages
      const lifts = rows.filter((r) => r.salesLift != null);
      const avgSalesLift = lifts.length > 0
        ? Math.round(lifts.reduce((s, r) => s + (r.salesLift ?? 0), 0) / lifts.length * 10) / 10
        : 0;

      const avgImpactScore = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.impactScore, 0) / rows.length)
        : 0;

      setData({
        publications: rows,
        totalPublications: rows.length,
        avgSalesLift,
        highestImpact: rows[0] ?? null,
        yearlyPublicationCount,
        avgImpactScore,
        topCountries,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch media impact data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
