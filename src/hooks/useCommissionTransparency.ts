// ---------------------------------------------------------------------------
// useCommissionTransparency -- Per-gallery commission breakdown & transparency
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommissionSaleDetail {
  saleId: string;
  artworkTitle: string;
  saleDate: string;
  salePrice: number;
  currency: string;
  commissionPercent: number;
  galleryShare: number;
  noaShare: number;
  artistShare: number;
  paymentStatus: string;
}

export interface GalleryCommissionSummary {
  galleryId: string;
  galleryName: string;
  country: string | null;
  defaultCommissionRate: number | null;
  commissionGallery: number | null;
  commissionNoa: number | null;
  commissionArtist: number | null;
  totalSales: number;
  totalRevenue: number;
  totalGalleryCommission: number;
  totalNoaCommission: number;
  totalArtistCommission: number;
  paidAmount: number;
  outstandingAmount: number;
  sales: CommissionSaleDetail[];
}

export interface CommissionTransparencyData {
  galleries: GalleryCommissionSummary[];
  totalRevenue: number;
  totalGalleryCommissions: number;
  totalNoaRevenue: number;
  totalArtistRevenue: number;
  totalOutstanding: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCommissionTransparency() {
  const [data, setData] = useState<CommissionTransparencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetchData = useCallback(async () => {
    if (!ratesReady) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Fetch galleries and sales in parallel
      const [galleriesResult, salesResult] = await Promise.all([
        supabase
          .from('galleries')
          .select('id, name, country, commission_rate, commission_gallery, commission_noa, commission_artist'),
        supabase
          .from('sales')
          .select('id, gallery_id, sale_price, currency, sale_date, commission_percent, payment_status, artwork_id, artworks(title)')
          .order('sale_date', { ascending: false }),
      ]);

      if (galleriesResult.error) throw galleriesResult.error;
      if (salesResult.error) throw salesResult.error;

      const galleries = galleriesResult.data ?? [];
      const sales = salesResult.data ?? [];

      // Build gallery lookup
      const galleryMap = new Map<string, (typeof galleries)[0]>();
      for (const g of galleries) {
        galleryMap.set(g.id, g);
      }

      // Group sales by gallery
      const salesByGallery = new Map<string, (typeof sales)>();
      for (const s of sales) {
        if (!s.gallery_id) continue;
        const arr = salesByGallery.get(s.gallery_id) ?? [];
        arr.push(s);
        salesByGallery.set(s.gallery_id, arr);
      }

      // Process each gallery
      const gallerySummaries: GalleryCommissionSummary[] = [];

      let totalRevenue = 0;
      let totalGalleryCommissions = 0;
      let totalNoaRevenue = 0;
      let totalArtistRevenue = 0;
      let totalOutstanding = 0;

      // Iterate over all galleries that have sales
      const galleryIds = new Set([
        ...salesByGallery.keys(),
      ]);

      for (const galleryId of galleryIds) {
        const gallery = galleryMap.get(galleryId);
        if (!gallery) continue;

        const gallerySales = salesByGallery.get(galleryId) ?? [];
        if (gallerySales.length === 0) continue;

        const cg = gallery.commission_gallery as number | null;
        const cn = gallery.commission_noa as number | null;
        const ca = gallery.commission_artist as number | null;
        const cr = gallery.commission_rate as number | null;

        let summaryRevenue = 0;
        let summaryGalleryComm = 0;
        let summaryNoaComm = 0;
        let summaryArtistComm = 0;
        let summaryPaid = 0;
        let summaryOutstanding = 0;

        const saleDetails: CommissionSaleDetail[] = [];

        for (const sale of gallerySales) {
          const salePrice = Number(sale.sale_price) || 0;
          const currency = (sale.currency as string) ?? 'CHF';
          const salePriceCHF = toCHF(salePrice, currency);
          const saleCommPercent = sale.commission_percent as number | null;
          const paymentStatus = (sale.payment_status as string) ?? 'pending';
          const artworkData = sale.artworks as { title: string } | null;
          const artworkTitle = artworkData?.title ?? 'Unknown Artwork';

          // Determine commission splits:
          // 1. Use gallery-specific 3-way split if available
          // 2. Fall back to commission_percent (sale-level or gallery-level) for gallery share,
          //    rest split 50/50 between NOA and artist
          // 3. Default: 50% gallery, 25% NOA, 25% artist
          let galleryPct: number;
          let noaPct: number;
          let artistPct: number;

          if (cg != null && cn != null && ca != null) {
            galleryPct = cg;
            noaPct = cn;
            artistPct = ca;
          } else if (saleCommPercent != null) {
            galleryPct = saleCommPercent;
            noaPct = (100 - saleCommPercent) / 2;
            artistPct = (100 - saleCommPercent) / 2;
          } else if (cr != null) {
            galleryPct = cr;
            noaPct = (100 - cr) / 2;
            artistPct = (100 - cr) / 2;
          } else {
            galleryPct = 50;
            noaPct = 25;
            artistPct = 25;
          }

          const totalPct = galleryPct + noaPct + artistPct;
          const galleryShare = salePriceCHF * (galleryPct / totalPct);
          const noaShare = salePriceCHF * (noaPct / totalPct);
          const artistShare = salePriceCHF * (artistPct / totalPct);

          summaryRevenue += salePriceCHF;
          summaryGalleryComm += galleryShare;
          summaryNoaComm += noaShare;
          summaryArtistComm += artistShare;

          if (paymentStatus === 'paid') {
            summaryPaid += salePriceCHF;
          } else {
            summaryOutstanding += salePriceCHF;
          }

          saleDetails.push({
            saleId: sale.id,
            artworkTitle,
            saleDate: (sale.sale_date as string) ?? '',
            salePrice: salePriceCHF,
            currency: 'CHF',
            commissionPercent: galleryPct,
            galleryShare,
            noaShare,
            artistShare,
            paymentStatus,
          });
        }

        gallerySummaries.push({
          galleryId,
          galleryName: gallery.name,
          country: gallery.country as string | null,
          defaultCommissionRate: cr,
          commissionGallery: cg,
          commissionNoa: cn,
          commissionArtist: ca,
          totalSales: gallerySales.length,
          totalRevenue: summaryRevenue,
          totalGalleryCommission: summaryGalleryComm,
          totalNoaCommission: summaryNoaComm,
          totalArtistCommission: summaryArtistComm,
          paidAmount: summaryPaid,
          outstandingAmount: summaryOutstanding,
          sales: saleDetails,
        });

        totalRevenue += summaryRevenue;
        totalGalleryCommissions += summaryGalleryComm;
        totalNoaRevenue += summaryNoaComm;
        totalArtistRevenue += summaryArtistComm;
        totalOutstanding += summaryOutstanding;
      }

      // Sort galleries by total revenue descending
      gallerySummaries.sort((a, b) => b.totalRevenue - a.totalRevenue);

      setData({
        galleries: gallerySummaries,
        totalRevenue,
        totalGalleryCommissions,
        totalNoaRevenue,
        totalArtistRevenue,
        totalOutstanding,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch commission data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast, toCHF, ratesReady]);

  useEffect(() => { if (ratesReady) fetchData(); }, [fetchData, ratesReady]);

  return { data, loading, error, refresh: fetchData };
}
