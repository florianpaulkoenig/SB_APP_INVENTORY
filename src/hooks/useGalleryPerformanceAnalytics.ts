// ---------------------------------------------------------------------------
// useGalleryPerformanceAnalytics -- Gallery Performance Dashboard data
// Compares all galleries: sell-through, velocity, revenue, partner score
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
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
  totalAllocated: number;
  soldCount: number;
  sellThrough: number;
  totalRevenue: number;
  avgDaysToSale: number | null;
  reportingCompleteness: number;
  partnerScore: number;
}

export interface GalleryPerformanceData {
  galleries: GalleryPerformanceRow[];
  totalGalleries: number;
  avgSellThrough: number;
  avgPartnerScore: number;
  topPerformer: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGalleryPerformanceAnalytics() {
  const [data, setData] = useState<GalleryPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [galleriesRes, artworksRes, salesRes] = await Promise.all([
        supabase.from('galleries').select('id, name, country'),
        supabase.from('artworks').select('id, gallery_id, status, consigned_since, created_at'),
        supabase.from('sales').select('id, gallery_id, sale_price, currency, sale_date, artwork_id, artworks(consigned_since)'),
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

        // Revenue (raw sum, no currency conversion for simplicity)
        const totalRevenue = gSales.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);

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
          gSales.map(() => ({ reporting_status: 'draft' })),
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
          totalAllocated,
          soldCount,
          sellThrough: Math.round(sellThru * 10) / 10,
          totalRevenue,
          avgDaysToSale: avgDays,
          reportingCompleteness: Math.round(repComp),
          partnerScore: Math.round(score),
        });
      }

      // Sort by partner score descending
      rows.sort((a, b) => b.partnerScore - a.partnerScore);

      const avgST = rows.length > 0
        ? rows.reduce((s, r) => s + r.sellThrough, 0) / rows.length
        : 0;
      const avgPS = rows.length > 0
        ? rows.reduce((s, r) => s + r.partnerScore, 0) / rows.length
        : 0;

      setData({
        galleries: rows,
        totalGalleries: rows.length,
        avgSellThrough: Math.round(avgST * 10) / 10,
        avgPartnerScore: Math.round(avgPS),
        topPerformer: rows[0]?.name ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch gallery performance';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
