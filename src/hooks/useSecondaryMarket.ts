// ---------------------------------------------------------------------------
// Secondary Market Tracking — analyzes primary-to-secondary market performance
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { AuctionAlertRow } from '../types/database';

export interface SecondaryMarketItem {
  auctionAlertId: string;
  artworkTitle: string;
  auctionHouse: string;
  saleDate: string | null;
  hammerPrice: number;
  hammerCurrency: string;
  hammerPriceCHF: number;
  primarySalePrice: number | null;
  primaryCurrency: string | null;
  primarySalePriceCHF: number | null;
  appreciation: number | null;        // % change from primary to secondary
  galleryOfOrigin: string | null;
  yearsSincePrimary: number | null;
}

export interface GallerySecondaryPerformance {
  galleryId: string;
  galleryName: string;
  auctionCount: number;
  avgAppreciation: number;
  totalHammerCHF: number;
}

export interface SecondaryMarketData {
  items: SecondaryMarketItem[];
  galleryPerformance: GallerySecondaryPerformance[];
  avgAppreciation: number;
  totalSecondaryVolume: number;
  matchedCount: number;
  unmatchedCount: number;
  appreciatingCount: number;
  depreciatingCount: number;
}

const EMPTY_DATA: SecondaryMarketData = {
  items: [],
  galleryPerformance: [],
  avgAppreciation: 0,
  totalSecondaryVolume: 0,
  matchedCount: 0,
  unmatchedCount: 0,
  appreciatingCount: 0,
  depreciatingCount: 0,
};

export function useSecondaryMarket(
  allAlerts: AuctionAlertRow[],
  toCHF: (amount: number, currency: string) => number,
) {
  const [salesMap, setSalesMap] = useState<
    Map<string, { sale_price: number; currency: string; sale_date: string; gallery_id: string | null }>
  >(new Map());
  const [galleryNames, setGalleryNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filter sold alerts with matched artwork
  const matchedSoldAlerts = useMemo(
    () => allAlerts.filter((a) => a.result === 'sold' && a.matched_artwork_id),
    [allAlerts],
  );

  // Count unmatched sold alerts
  const unmatchedCount = useMemo(
    () => allAlerts.filter((a) => a.result === 'sold' && !a.matched_artwork_id).length,
    [allAlerts],
  );

  // Fetch primary sales data for matched artworks
  const fetchSalesData = useCallback(async () => {
    if (matchedSoldAlerts.length === 0) {
      setSalesMap(new Map());
      setGalleryNames(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const artworkIds = matchedSoldAlerts
        .map((a) => a.matched_artwork_id)
        .filter((id): id is string => !!id);

      const uniqueIds = [...new Set(artworkIds)];

      // Fetch primary sales for matched artworks
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('artwork_id, sale_price, currency, sale_date, gallery_id')
        .in('artwork_id', uniqueIds)
        .order('sale_date', { ascending: true });

      if (salesError) {
        toast({ title: 'Failed to load primary sales data', variant: 'error' });
        setLoading(false);
        return;
      }

      // Build map: artwork_id -> earliest sale (primary sale)
      const map = new Map<
        string,
        { sale_price: number; currency: string; sale_date: string; gallery_id: string | null }
      >();
      for (const s of sales || []) {
        // Keep earliest sale per artwork (the primary sale)
        if (!map.has(s.artwork_id)) {
          map.set(s.artwork_id, {
            sale_price: s.sale_price,
            currency: s.currency,
            sale_date: s.sale_date,
            gallery_id: s.gallery_id,
          });
        }
      }
      setSalesMap(map);

      // Collect gallery IDs to resolve names
      const galleryIds = new Set<string>();
      for (const alert of matchedSoldAlerts) {
        if (alert.matched_gallery_id) galleryIds.add(alert.matched_gallery_id);
      }
      for (const sale of map.values()) {
        if (sale.gallery_id) galleryIds.add(sale.gallery_id);
      }

      if (galleryIds.size > 0) {
        const { data: galleries } = await supabase
          .from('galleries')
          .select('id, name')
          .in('id', [...galleryIds]);

        const nameMap = new Map<string, string>();
        for (const g of galleries || []) {
          nameMap.set(g.id, g.name);
        }
        setGalleryNames(nameMap);
      }
    } catch {
      toast({ title: 'Failed to load secondary market data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [matchedSoldAlerts, toast]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const data: SecondaryMarketData = useMemo(() => {
    if (matchedSoldAlerts.length === 0) return { ...EMPTY_DATA, unmatchedCount };

    const items: SecondaryMarketItem[] = matchedSoldAlerts.map((alert) => {
      const hammerPrice = alert.hammer_price || 0;
      const hammerCurrency = (alert.currency as string) ?? 'CHF';
      const hammerPriceCHF = toCHF(hammerPrice, hammerCurrency);

      const primarySale = alert.matched_artwork_id
        ? salesMap.get(alert.matched_artwork_id)
        : undefined;

      let primarySalePrice: number | null = null;
      let primaryCurrency: string | null = null;
      let primarySalePriceCHF: number | null = null;
      let appreciation: number | null = null;
      let yearsSincePrimary: number | null = null;

      if (primarySale) {
        primarySalePrice = primarySale.sale_price;
        primaryCurrency = primarySale.currency;
        primarySalePriceCHF = toCHF(primarySale.sale_price, primarySale.currency);

        if (primarySalePriceCHF > 0) {
          appreciation =
            ((hammerPriceCHF - primarySalePriceCHF) / primarySalePriceCHF) * 100;
          appreciation = Math.round(appreciation * 10) / 10;
        }

        if (alert.sale_date && primarySale.sale_date) {
          const auctionDate = new Date(alert.sale_date);
          const primaryDate = new Date(primarySale.sale_date);
          const diffMs = auctionDate.getTime() - primaryDate.getTime();
          yearsSincePrimary = Math.round((diffMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
        }
      }

      // Resolve gallery name
      const galleryId = alert.matched_gallery_id || primarySale?.gallery_id || null;
      const galleryOfOrigin = galleryId ? galleryNames.get(galleryId) || null : null;

      return {
        auctionAlertId: alert.id,
        artworkTitle: alert.artwork_title,
        auctionHouse: alert.auction_house || 'Unknown',
        saleDate: alert.sale_date,
        hammerPrice,
        hammerCurrency,
        hammerPriceCHF,
        primarySalePrice,
        primaryCurrency,
        primarySalePriceCHF,
        appreciation,
        galleryOfOrigin,
        yearsSincePrimary,
      };
    });

    // Gallery performance grouping
    const galleryMap = new Map<
      string,
      { name: string; appreciations: number[]; totalHammerCHF: number; count: number }
    >();

    for (const item of items) {
      const galleryId =
        matchedSoldAlerts.find((a) => a.id === item.auctionAlertId)?.matched_gallery_id ||
        (item.galleryOfOrigin
          ? [...galleryNames.entries()].find(([, name]) => name === item.galleryOfOrigin)?.[0]
          : null);

      if (!galleryId) continue;

      if (!galleryMap.has(galleryId)) {
        galleryMap.set(galleryId, {
          name: galleryNames.get(galleryId) || 'Unknown',
          appreciations: [],
          totalHammerCHF: 0,
          count: 0,
        });
      }

      const entry = galleryMap.get(galleryId)!;
      entry.count += 1;
      entry.totalHammerCHF += item.hammerPriceCHF;
      if (item.appreciation !== null) entry.appreciations.push(item.appreciation);
    }

    const galleryPerformance: GallerySecondaryPerformance[] = Array.from(
      galleryMap.entries(),
    )
      .map(([id, g]) => ({
        galleryId: id,
        galleryName: g.name,
        auctionCount: g.count,
        avgAppreciation:
          g.appreciations.length > 0
            ? Math.round(
                (g.appreciations.reduce((s, v) => s + v, 0) / g.appreciations.length) * 10,
              ) / 10
            : 0,
        totalHammerCHF: g.totalHammerCHF,
      }))
      .sort((a, b) => b.avgAppreciation - a.avgAppreciation);

    // Aggregate metrics
    const withAppreciation = items.filter((i) => i.appreciation !== null);
    const avgAppreciation =
      withAppreciation.length > 0
        ? Math.round(
            (withAppreciation.reduce((s, i) => s + (i.appreciation || 0), 0) /
              withAppreciation.length) *
              10,
          ) / 10
        : 0;

    const totalSecondaryVolume = items.reduce((s, i) => s + i.hammerPriceCHF, 0);
    const appreciatingCount = items.filter((i) => i.appreciation !== null && i.appreciation > 0).length;
    const depreciatingCount = items.filter((i) => i.appreciation !== null && i.appreciation < 0).length;

    return {
      items,
      galleryPerformance,
      avgAppreciation,
      totalSecondaryVolume,
      matchedCount: items.length,
      unmatchedCount,
      appreciatingCount,
      depreciatingCount,
    };
  }, [matchedSoldAlerts, salesMap, galleryNames, toCHF, unmatchedCount]);

  return { data, loading, refetch: fetchSalesData };
}
