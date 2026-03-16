// ---------------------------------------------------------------------------
// useGalleryPerformanceAnalytics -- Gallery Performance Dashboard data
// Compares all galleries: sell-through, velocity, revenue, partner score
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';
import {
  computePartnerScore,
  gallerySellThrough,
  reportingCompleteness,
} from '../lib/analytics/gallery';
import type { PartnerScoreFactors } from '../lib/analytics/gallery';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GalleryPerformanceRow {
  id: string;
  name: string;
  country: string | null;
  type: string | null;
  totalAllocated: number;
  soldCount: number;
  sellThrough: number;
  totalRevenue: number;
  avgDaysToSale: number | null;
  reportingCompleteness: number;
  partnerScore: number;
  scoreTrend: 'improving' | 'stable' | 'declining' | null;
  scoreHistory: number[];  // last 6 months scores
  momentum: number | null; // slope over last 6 months
}

export interface GalleryPerformanceData {
  galleries: GalleryPerformanceRow[];
  totalGalleries: number;
  avgSellThrough: number;
  avgPartnerScore: number;
  topPerformer: string | null;
  improvingCount: number;
  decliningCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGalleryPerformanceAnalytics() {
  const [data, setData] = useState<GalleryPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetch = useCallback(async () => {
    if (!ratesReady) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [galleriesRes, artworksRes, salesRes] = await Promise.all([
        supabase.from('galleries').select('id, name, country, type'),
        supabase.from('artworks').select('id, gallery_id, status, consigned_since, created_at'),
        supabase.from('sales').select('id, gallery_id, sale_price, currency, sale_date, reporting_status, artwork_id, artworks(consigned_since)'),
      ]);

      if (galleriesRes.error) throw galleriesRes.error;
      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;

      const galleriesList = galleriesRes.data ?? [];
      const artworks = artworksRes.data ?? [];
      const sales = salesRes.data ?? [];

      // Group by gallery
      const artworksByGallery = new Map<string, typeof artworks>();
      for (const a of artworks) {
        if (!a.gallery_id) continue;
        const arr = artworksByGallery.get(a.gallery_id) ?? [];
        arr.push(a);
        artworksByGallery.set(a.gallery_id, arr);
      }

      const salesByGallery = new Map<string, typeof sales>();
      for (const s of sales) {
        if (!s.gallery_id) continue;
        const arr = salesByGallery.get(s.gallery_id) ?? [];
        arr.push(s);
        salesByGallery.set(s.gallery_id, arr);
      }

      const rows: GalleryPerformanceRow[] = [];

      for (const g of galleriesList) {
        const gArtworks = artworksByGallery.get(g.id) ?? [];
        const gSales = salesByGallery.get(g.id) ?? [];

        if (gArtworks.length === 0 && gSales.length === 0) continue;

        const totalAllocated = gArtworks.length;
        const soldCount = gSales.length;
        const sellThru = gallerySellThrough(soldCount, totalAllocated);

        // Revenue (converted to CHF)
        const totalRevenue = gSales.reduce(
          (sum, s) => sum + toCHF(Number(s.sale_price) || 0, (s.currency as string) ?? 'CHF'),
          0,
        );

        // Avg days to sale
        let totalDays = 0;
        let dayCount = 0;
        for (const s of gSales) {
          const artworkData = s.artworks as { consigned_since: string | null } | null;
          const start = artworkData?.consigned_since;
          if (start && s.sale_date) {
            const days = (new Date(s.sale_date).getTime() - new Date(start).getTime()) / 86400000;
            if (days >= 0) { totalDays += days; dayCount++; }
          }
        }
        const avgDays = dayCount > 0 ? Math.round(totalDays / dayCount) : null;

        // Reporting completeness
        const repComp = reportingCompleteness(
          gSales.map((s) => ({ reporting_status: (s.reporting_status as string) || 'draft' })),
        );

        // Partner score (simplified factors)
        const velocityScore = avgDays != null ? Math.max(0, 100 - avgDays) : 50;
        const conversionScore = sellThru;
        const factors: PartnerScoreFactors = {
          salesVelocity: Math.min(100, velocityScore),
          reportingCompleteness: repComp,
          consistency: soldCount > 0 ? Math.min(100, soldCount * 20) : 0,
          conversionRate: conversionScore,
          timeliness: repComp, // simplified: use reporting completeness as proxy
        };
        const score = computePartnerScore(factors);

        rows.push({
          id: g.id,
          name: g.name,
          country: g.country,
          type: (g as Record<string, unknown>).type as string | null ?? null,
          totalAllocated,
          soldCount,
          sellThrough: Math.round(sellThru * 10) / 10,
          totalRevenue,
          avgDaysToSale: avgDays,
          reportingCompleteness: Math.round(repComp),
          partnerScore: Math.round(score),
          scoreTrend: null,
          scoreHistory: [],
          momentum: null,
        });
      }

      // ---- Score trend from partner_score_snapshots --------------------------
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: snapshots } = await supabase
        .from('partner_score_snapshots')
        .select('gallery_id, score, calculated_at')
        .gte('calculated_at', sixMonthsAgo.toISOString())
        .order('calculated_at', { ascending: true });

      if (snapshots && snapshots.length > 0) {
        // Group snapshots by gallery_id
        const snapshotsByGallery = new Map<string, number[]>();
        for (const snap of snapshots) {
          const arr = snapshotsByGallery.get(snap.gallery_id) ?? [];
          arr.push(snap.score);
          snapshotsByGallery.set(snap.gallery_id, arr);
        }

        for (const row of rows) {
          const history = snapshotsByGallery.get(row.id);
          if (!history || history.length < 2) continue;

          row.scoreHistory = history;
          const months = history.length - 1;
          const slope = (history[history.length - 1] - history[0]) / months;
          row.momentum = Math.round(slope * 100) / 100;
          row.scoreTrend = slope > 2 ? 'improving' : slope < -2 ? 'declining' : 'stable';
        }
      }

      // Sort by partner score descending
      rows.sort((a, b) => b.partnerScore - a.partnerScore);

      const avgST = rows.length > 0
        ? rows.reduce((s, r) => s + r.sellThrough, 0) / rows.length
        : 0;
      const avgPS = rows.length > 0
        ? rows.reduce((s, r) => s + r.partnerScore, 0) / rows.length
        : 0;

      const improvingCount = rows.filter((r) => r.scoreTrend === 'improving').length;
      const decliningCount = rows.filter((r) => r.scoreTrend === 'declining').length;

      setData({
        galleries: rows,
        totalGalleries: rows.length,
        avgSellThrough: Math.round(avgST * 10) / 10,
        avgPartnerScore: Math.round(avgPS),
        topPerformer: rows[0]?.name ?? null,
        improvingCount,
        decliningCount,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch gallery performance';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast, toCHF, ratesReady]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
