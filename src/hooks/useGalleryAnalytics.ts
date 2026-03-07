import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface GallerySalesTimeline {
  month: string;
  revenue: number;
  count: number;
}

export interface GalleryGeoData {
  country: string;
  revenue: number;
  count: number;
}

export interface GalleryTopArtwork {
  artworkId: string;
  title: string;
  revenue: number;
  saleDate: string;
}

export interface GalleryAnalyticsData {
  // KPIs
  consignedCount: number;
  totalRevenue: number;
  commissionEarned: number;
  avgDaysToSale: number;
  soldCount: number;
  // Charts
  salesTimeline: GallerySalesTimeline[];
  geoDistribution: GalleryGeoData[];
  topArtworks: GalleryTopArtwork[];
  // Price performance
  avgSalePrice: number;
  avgDiscountRate: number;
  atListPricePercent: number;
  // Status breakdown
  statusBreakdown: Array<{ status: string; count: number }>;
}

const EMPTY: GalleryAnalyticsData = {
  consignedCount: 0,
  totalRevenue: 0,
  commissionEarned: 0,
  avgDaysToSale: 0,
  soldCount: 0,
  salesTimeline: [],
  geoDistribution: [],
  topArtworks: [],
  avgSalePrice: 0,
  avgDiscountRate: 0,
  atListPricePercent: 0,
  statusBreakdown: [],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGalleryAnalytics(
  galleryId: string | null | undefined,
  toCHF: (amount: number, currency: string) => number,
  ratesReady: boolean,
) {
  const [data, setData] = useState<GalleryAnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<Record<string, unknown[]>>({});

  // Fetch raw data
  const fetchRaw = useCallback(async () => {
    if (!galleryId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [salesRes, artworksRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, artwork_id, sale_date, sale_price, currency, commission_percent, sale_country, sale_city')
        .eq('gallery_id', galleryId),
      supabase
        .from('artworks')
        .select('id, title, status, price, currency, gallery_id, consigned_since, created_at')
        .eq('gallery_id', galleryId),
    ]);

    setRaw({
      sales: salesRes.data || [],
      artworks: artworksRes.data || [],
    });
    setLoading(false);
  }, [galleryId]);

  useEffect(() => {
    fetchRaw();
  }, [fetchRaw]);

  // Compute analytics when rates are ready
  useEffect(() => {
    if (!ratesReady || !raw.sales) return;

    const sales = raw.sales as Array<Record<string, unknown>>;
    const artworks = raw.artworks as Array<Record<string, unknown>>;

    // --- KPIs ---
    const consignedCount = artworks.filter((a) =>
      ['available', 'on_consignment', 'reserved'].includes(a.status as string),
    ).length;
    const soldCount = sales.length;

    let totalRevenue = 0;
    let commissionEarned = 0;

    for (const s of sales) {
      const rev = toCHF(s.sale_price as number, (s.currency as string) || 'EUR');
      totalRevenue += rev;
      if (s.commission_percent) {
        commissionEarned += rev * ((s.commission_percent as number) / 100);
      }
    }

    // Avg days to sale
    let totalDays = 0;
    let daysCount = 0;
    for (const s of sales) {
      const artwork = artworks.find((a) => a.id === s.artwork_id);
      if (artwork && artwork.consigned_since && s.sale_date) {
        const d = Math.abs(
          (new Date(s.sale_date as string).getTime() - new Date(artwork.consigned_since as string).getTime()) /
            86400000,
        );
        totalDays += d;
        daysCount++;
      }
    }

    // --- Sales Timeline ---
    const monthMap = new Map<string, { revenue: number; count: number }>();
    for (const s of sales) {
      const month = (s.sale_date as string).slice(0, 7);
      const rev = toCHF(s.sale_price as number, (s.currency as string) || 'EUR');
      const existing = monthMap.get(month) || { revenue: 0, count: 0 };
      existing.revenue += rev;
      existing.count++;
      monthMap.set(month, existing);
    }
    const salesTimeline = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, ...d }));

    // --- Geo Distribution ---
    const geoMap = new Map<string, { revenue: number; count: number }>();
    for (const s of sales) {
      const country = (s.sale_country as string) || 'Unknown';
      const rev = toCHF(s.sale_price as number, (s.currency as string) || 'EUR');
      const existing = geoMap.get(country) || { revenue: 0, count: 0 };
      existing.revenue += rev;
      existing.count++;
      geoMap.set(country, existing);
    }
    const geoDistribution = [...geoMap.entries()]
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([country, d]) => ({ country, ...d }));

    // --- Top Artworks ---
    const topArtworks = sales
      .map((s) => {
        const artwork = artworks.find((a) => a.id === s.artwork_id);
        return {
          artworkId: s.artwork_id as string,
          title: (artwork?.title as string) || 'Unknown',
          revenue: toCHF(s.sale_price as number, (s.currency as string) || 'EUR'),
          saleDate: s.sale_date as string,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Price Performance ---
    let totalDiscount = 0;
    let discountCount = 0;
    let atListCount = 0;

    for (const s of sales) {
      const artwork = artworks.find((a) => a.id === s.artwork_id);
      if (artwork && artwork.price && (artwork.price as number) > 0) {
        const listCHF = toCHF(artwork.price as number, (artwork.currency as string) || 'EUR');
        const saleCHF = toCHF(s.sale_price as number, (s.currency as string) || 'EUR');
        const discount = 1 - saleCHF / listCHF;
        totalDiscount += discount;
        discountCount++;
        if (discount <= 0.005) atListCount++;
      }
    }

    // --- Status Breakdown ---
    const statusMap = new Map<string, number>();
    for (const a of artworks) {
      const status = a.status as string;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }
    const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

    setData({
      consignedCount,
      totalRevenue,
      commissionEarned,
      avgDaysToSale: daysCount > 0 ? Math.round(totalDays / daysCount) : 0,
      soldCount,
      salesTimeline,
      geoDistribution,
      topArtworks,
      avgSalePrice: soldCount > 0 ? totalRevenue / soldCount : 0,
      avgDiscountRate: discountCount > 0 ? (totalDiscount / discountCount) * 100 : 0,
      atListPricePercent: discountCount > 0 ? (atListCount / discountCount) * 100 : 0,
      statusBreakdown,
    });
  }, [ratesReady, raw, toCHF]);

  return { data, loading, refresh: fetchRaw };
}
