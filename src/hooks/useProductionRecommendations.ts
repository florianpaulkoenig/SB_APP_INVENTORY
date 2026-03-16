// ---------------------------------------------------------------------------
// useProductionRecommendations -- Demand-driven production planning
// What to produce, how many, which size, for which gallery
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductionRecommendation {
  series: string;
  sizeCategory: string | null;
  recommendedQuantity: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  targetGallery: string | null;
  targetGalleryId: string | null;
  demandSignals: {
    recentSales: number;
    activeEnquiries: number;
    wishListCount: number;
    currentStock: number;
    galleryRequests: number;
  };
}

export interface ProductionPlanningData {
  recommendations: ProductionRecommendation[];
  seriesHealth: {
    series: string;
    available: number;
    sold6m: number;
    enquiries: number;
    supplyDemandRatio: number;
    status: 'understocked' | 'balanced' | 'overstocked';
  }[];
  totalRecommended: number;
  highPriorityCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProductionRecommendations() {
  const [data, setData] = useState<ProductionPlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

      // Parallel data fetches
      const [artworksRes, salesRes, enquiriesRes, wishListRes, prodOrdersRes, prodItemsRes, galleriesRes] = await Promise.all([
        // 1. Artworks
        supabase.from('artworks').select('id, series, size_category, status, gallery_id'),
        // 2. Sales in last 6 months (join artworks for series/size)
        supabase.from('sales').select('id, artwork_id, sale_date, artworks(series, size_category, gallery_id)').gte('sale_date', sixMonthsAgoStr),
        // 3. Active enquiries
        supabase.from('enquiries').select('id, status, interested_artwork_ids').not('status', 'in', '("archived","spam")'),
        // 4. Wish list items
        supabase.from('wish_list_items').select('id, artwork_id'),
        // 5. Active production orders
        supabase.from('production_orders').select('id, status').in('status', ['draft', 'pending', 'in_production']),
        // 6. Production order items (all -- we filter by order ids below)
        supabase.from('production_order_items').select('id, production_order_id, series, quantity'),
        // 7. Galleries
        supabase.from('galleries').select('id, name'),
      ]);

      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;
      if (enquiriesRes.error) throw enquiriesRes.error;
      if (wishListRes.error) throw wishListRes.error;
      if (prodOrdersRes.error) throw prodOrdersRes.error;
      if (prodItemsRes.error) throw prodItemsRes.error;
      if (galleriesRes.error) throw galleriesRes.error;

      const artworks = artworksRes.data ?? [];
      const sales = salesRes.data ?? [];
      const enquiries = enquiriesRes.data ?? [];
      const wishListItems = wishListRes.data ?? [];
      const prodOrders = prodOrdersRes.data ?? [];
      const prodItems = prodItemsRes.data ?? [];
      const galleries = galleriesRes.data ?? [];

      // Build lookup maps
      const artworkById = new Map(artworks.map((a) => [a.id, a]));
      const galleryById = new Map(galleries.map((g) => [g.id, g.name]));
      const activeOrderIds = new Set(prodOrders.map((o) => o.id));

      // Active production items (only from active orders)
      const activeProdItems = prodItems.filter((pi) => activeOrderIds.has(pi.production_order_id));

      // ---------------------------------------------------------------------------
      // Group data by series
      // ---------------------------------------------------------------------------

      interface SeriesAgg {
        available: number;
        recentSales: number;
        activeEnquiries: number;
        wishListCount: number;
        pendingProduction: number;
        sizeCategories: Map<string | null, number>; // size → available count
        gallerySales: Map<string | null, number>; // galleryId → sales count
      }

      const seriesMap = new Map<string, SeriesAgg>();

      const ensure = (s: string): SeriesAgg => {
        if (!seriesMap.has(s)) {
          seriesMap.set(s, {
            available: 0,
            recentSales: 0,
            activeEnquiries: 0,
            wishListCount: 0,
            pendingProduction: 0,
            sizeCategories: new Map(),
            gallerySales: new Map(),
          });
        }
        return seriesMap.get(s)!;
      };

      // Available artworks
      for (const a of artworks) {
        const series = a.series || 'Unknown';
        const agg = ensure(series);
        if (a.status === 'available') {
          agg.available++;
          const sc = a.size_category || null;
          agg.sizeCategories.set(sc, (agg.sizeCategories.get(sc) ?? 0) + 1);
        }
      }

      // Recent sales
      for (const s of sales) {
        const joined = s.artworks as unknown as { series: string | null; size_category: string | null; gallery_id: string | null } | null;
        const series = joined?.series || 'Unknown';
        const agg = ensure(series);
        agg.recentSales++;
        const galleryId = joined?.gallery_id || null;
        agg.gallerySales.set(galleryId, (agg.gallerySales.get(galleryId) ?? 0) + 1);
      }

      // Active enquiries
      for (const enq of enquiries) {
        const artworkIds: string[] = enq.interested_artwork_ids ?? [];
        const seriesCounted = new Set<string>();
        for (const aid of artworkIds) {
          const artwork = artworkById.get(aid);
          if (artwork) {
            const series = artwork.series || 'Unknown';
            if (!seriesCounted.has(series)) {
              seriesCounted.add(series);
              ensure(series).activeEnquiries++;
            }
          }
        }
      }

      // Wish list items
      for (const wl of wishListItems) {
        const artwork = artworkById.get(wl.artwork_id);
        if (artwork) {
          const series = artwork.series || 'Unknown';
          ensure(series).wishListCount++;
        }
      }

      // Pending production
      for (const pi of activeProdItems) {
        const series = pi.series || 'Unknown';
        ensure(series).pendingProduction += pi.quantity ?? 1;
      }

      // ---------------------------------------------------------------------------
      // Build recommendations and series health
      // ---------------------------------------------------------------------------

      const recommendations: ProductionRecommendation[] = [];
      const seriesHealth: ProductionPlanningData['seriesHealth'] = [];

      for (const [series, agg] of seriesMap.entries()) {
        if (series === 'Unknown') continue;

        const monthlySalesRate = agg.recentSales / 6;
        const supplyDemandRatio = agg.available / (monthlySalesRate || 0.1);
        const demandScore = (agg.recentSales * 3) + (agg.activeEnquiries * 2) + (agg.wishListCount * 1);

        // Series health
        let status: 'understocked' | 'balanced' | 'overstocked' = 'balanced';
        if (supplyDemandRatio < 4) status = 'understocked';
        else if (supplyDemandRatio > 8 && demandScore === 0) status = 'overstocked';

        seriesHealth.push({
          series,
          available: agg.available,
          sold6m: agg.recentSales,
          enquiries: agg.activeEnquiries,
          supplyDemandRatio: Math.round(supplyDemandRatio * 10) / 10,
          status,
        });

        // Determine target gallery (highest sell-through for this series)
        let targetGalleryId: string | null = null;
        let targetGallery: string | null = null;
        let maxGallerySales = 0;
        for (const [gid, count] of agg.gallerySales.entries()) {
          if (gid && count > maxGallerySales) {
            maxGallerySales = count;
            targetGalleryId = gid;
            targetGallery = galleryById.get(gid) ?? null;
          }
        }

        // Determine best size category (the one with least stock relative to demand)
        let bestSize: string | null = null;
        if (agg.sizeCategories.size > 0) {
          let minStock = Infinity;
          for (const [sc, count] of agg.sizeCategories.entries()) {
            if (count < minStock) {
              minStock = count;
              bestSize = sc;
            }
          }
        }

        // Generate recommendation
        const recommendedQuantity = Math.max(1, Math.ceil(monthlySalesRate * 3) - agg.available);

        if (supplyDemandRatio < 2) {
          recommendations.push({
            series,
            sizeCategory: bestSize,
            recommendedQuantity,
            reason: 'Stock critically low, strong demand',
            priority: 'high',
            targetGallery,
            targetGalleryId,
            demandSignals: {
              recentSales: agg.recentSales,
              activeEnquiries: agg.activeEnquiries,
              wishListCount: agg.wishListCount,
              currentStock: agg.available,
              galleryRequests: agg.pendingProduction,
            },
          });
        } else if (supplyDemandRatio < 4) {
          recommendations.push({
            series,
            sizeCategory: bestSize,
            recommendedQuantity,
            reason: 'Approaching low stock levels',
            priority: 'medium',
            targetGallery,
            targetGalleryId,
            demandSignals: {
              recentSales: agg.recentSales,
              activeEnquiries: agg.activeEnquiries,
              wishListCount: agg.wishListCount,
              currentStock: agg.available,
              galleryRequests: agg.pendingProduction,
            },
          });
        } else if (supplyDemandRatio > 8 && demandScore === 0) {
          recommendations.push({
            series,
            sizeCategory: bestSize,
            recommendedQuantity: 0,
            reason: 'Overstocked with no recent demand',
            priority: 'low',
            targetGallery,
            targetGalleryId,
            demandSignals: {
              recentSales: agg.recentSales,
              activeEnquiries: agg.activeEnquiries,
              wishListCount: agg.wishListCount,
              currentStock: agg.available,
              galleryRequests: agg.pendingProduction,
            },
          });
        }
      }

      // Sort: high first, then medium, then low; within same priority by demand score desc
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => {
        const pa = priorityOrder[a.priority];
        const pb = priorityOrder[b.priority];
        if (pa !== pb) return pa - pb;
        const scoreA = (a.demandSignals.recentSales * 3) + (a.demandSignals.activeEnquiries * 2) + (a.demandSignals.wishListCount * 1);
        const scoreB = (b.demandSignals.recentSales * 3) + (b.demandSignals.activeEnquiries * 2) + (b.demandSignals.wishListCount * 1);
        return scoreB - scoreA;
      });

      // Sort series health by status priority
      const statusOrder = { understocked: 0, balanced: 1, overstocked: 2 };
      seriesHealth.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

      setData({
        recommendations,
        seriesHealth,
        totalRecommended: recommendations.reduce((sum, r) => sum + r.recommendedQuantity, 0),
        highPriorityCount: recommendations.filter((r) => r.priority === 'high').length,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch production recommendations';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
