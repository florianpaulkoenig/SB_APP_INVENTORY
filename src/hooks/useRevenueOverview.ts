// ---------------------------------------------------------------------------
// useRevenueOverview -- Year-by-year revenue + gallery ranking with YoY change
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearSummary {
  year: number;
  revenue: number;
  count: number;
  avgPrice: number;
  yoyChange: number | null; // percentage change vs prior year, null for first year
}

export interface GalleryYearRow {
  galleryId: string;
  galleryName: string;
  revenue: number;
  count: number;
  avgPrice: number;
  rank: number;
  priorRank: number | null;
  rankChange: number | null; // positive = improved (lower rank number), negative = declined
}

export interface ConsignmentGalleryDetail {
  galleryId: string;
  galleryName: string;
  consignmentValue: number;     // total consignment order value (CHF)
  orderCount: number;
  sellThroughRate: number;      // 0–1 ratio based on gallery history
  weightedValue: number;        // consignmentValue * sellThroughRate
  salesCount: number;           // historical sales from this gallery
  totalHandled: number;         // sales + currently unsold at gallery
}

export interface YearPrognosis {
  currentYear: number;
  revenueToDate: number;           // sales revenue only (excluding pre-sold)
  revenueToDateIncPreSold: number; // sales + pre-sold (the "real" pace base)
  salesCountToDate: number;
  preSoldRevenue: number;          // pre-sold orders — revenue confirmed (CHF)
  preSoldCount: number;
  daysElapsed: number;
  daysInYear: number;
  fractionElapsed: number;
  projectedRevenueSalesOnly: number;  // linear extrapolation from sales pace alone (excl pre-sold)
  projectedRevenue: number;           // best estimate: (sales+preSold pace) + weighted consignment
  projectedSalesCount: number;
  priorYearRevenue: number | null;
  priorYearSamePeriodRevenue: number | null; // prior year revenue up to same day-of-year
  vsLastYearPace: number | null;  // % difference vs prior year same period
  monthlyBreakdown: { month: number; revenue: number; count: number }[];
  // Pipeline data
  potentialRevenue: number;       // unsold artworks total price (CHF)
  potentialCount: number;         // number of unsold artworks with price
  confirmedOrdersRevenue: number; // active production orders value (CHF) — all non-draft/completed
  confirmedOrdersCount: number;   // number of active production orders
  consignmentRevenue: number;     // consignment orders — exhibited for sale (CHF)
  consignmentCount: number;
  weightedConsignmentRevenue: number; // consignment value × gallery sell-through rate
  consignmentGalleryDetails: ConsignmentGalleryDetail[]; // per-gallery breakdown
  totalPipeline: number;          // potentialRevenue + confirmedOrdersRevenue
}

export interface RevenueOverviewData {
  years: number[];
  yearSummaries: YearSummary[];
  galleryRankingsByYear: Record<number, GalleryYearRow[]>;
  lifetimeRevenue: number;
  bestYear: { year: number; revenue: number } | null;
  prognosis: YearPrognosis | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// Simple CHF conversion using fallback rates (no API call needed here)
const FALLBACK_RATES: Record<string, number> = { CHF: 1, EUR: 0.94, USD: 0.88, GBP: 1.12 };
function toCHF(amount: number, currency: string): number {
  if (!amount) return 0;
  const cur = currency?.toUpperCase() || 'EUR';
  if (cur === 'CHF') return amount;
  const rate = FALLBACK_RATES[cur];
  return rate && rate > 0 ? amount / rate : amount;
}

export function useRevenueOverview() {
  const [data, setData] = useState<RevenueOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Fetch sales, unsold artworks, and active production orders in parallel
      const [salesResult, artworksResult, prodOrdersResult] = await Promise.all([
        supabase
          .from('sales')
          .select('id, gallery_id, sale_date, sale_price, currency, galleries(name)')
          .order('sale_date', { ascending: true }),
        supabase
          .from('artworks')
          .select('id, status, price, currency, gallery_id')
          .not('status', 'in', '("sold","archived","destroyed")')
          .gt('price', 0),
        supabase
          .from('production_orders')
          .select('id, price, currency, status, gallery_id')
          .not('status', 'in', '("draft","completed")'),
      ]);

      if (salesResult.error) throw salesResult.error;
      const sales = salesResult.data ?? [];
      const unsoldArtworks = artworksResult.data ?? [];
      const activeProdOrders = prodOrdersResult.data ?? [];

      // Fetch production order items for active orders (to get accurate per-item values)
      const activeOrderIds = activeProdOrders.map((o) => o.id);
      const orderItemsResult = activeOrderIds.length > 0
        ? await supabase
            .from('production_order_items')
            .select('production_order_id, price, currency, quantity, artwork_id')
            .in('production_order_id', activeOrderIds)
        : { data: [] as { production_order_id: string; price: number | null; currency: string | null; quantity: number | null; artwork_id: string | null }[] };
      const orderItems = orderItemsResult.data ?? [];

      if (sales.length === 0) {
        setData({
          years: [],
          yearSummaries: [],
          galleryRankingsByYear: {},
          lifetimeRevenue: 0,
          bestYear: null,
          prognosis: null,
        });
        setLoading(false);
        return;
      }

      // ---- Group sales by year -----------------------------------------------

      const byYear = new Map<number, typeof sales>();
      for (const s of sales) {
        if (!s.sale_date) continue;
        const year = new Date(s.sale_date).getFullYear();
        const arr = byYear.get(year) ?? [];
        arr.push(s);
        byYear.set(year, arr);
      }

      const years = Array.from(byYear.keys()).sort((a, b) => a - b);

      // ---- Year summaries with YoY change ------------------------------------

      const yearSummaries: YearSummary[] = [];
      let prevRevenue: number | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];
        const revenue = ySales.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
        const count = ySales.length;
        const avgPrice = count > 0 ? revenue / count : 0;
        const yoyChange = prevRevenue != null && prevRevenue > 0
          ? ((revenue - prevRevenue) / prevRevenue) * 100
          : null;

        yearSummaries.push({ year, revenue, count, avgPrice, yoyChange });
        prevRevenue = revenue;
      }

      // ---- Gallery rankings per year with rank change ------------------------

      const galleryRankingsByYear: Record<number, GalleryYearRow[]> = {};
      let priorRankMap: Map<string, number> | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];

        // Aggregate per gallery
        const galleryMap = new Map<string, { name: string; revenue: number; count: number }>();
        for (const s of ySales) {
          const gid = s.gallery_id ?? 'direct';
          const gData = s.galleries as { name: string } | null;
          const gName = gData?.name ?? 'Direct Sale';
          const existing = galleryMap.get(gid) ?? { name: gName, revenue: 0, count: 0 };
          existing.revenue += Number(s.sale_price) || 0;
          existing.count += 1;
          galleryMap.set(gid, existing);
        }

        // Sort by revenue descending and assign ranks
        const sorted = Array.from(galleryMap.entries())
          .map(([gid, val]) => ({ galleryId: gid, ...val, avgPrice: val.count > 0 ? val.revenue / val.count : 0 }))
          .sort((a, b) => b.revenue - a.revenue);

        const currentRankMap = new Map<string, number>();
        const rows: GalleryYearRow[] = sorted.map((g, i) => {
          const rank = i + 1;
          currentRankMap.set(g.galleryId, rank);
          const priorRank = priorRankMap?.get(g.galleryId) ?? null;
          const rankChange = priorRank != null ? priorRank - rank : null; // positive = improved

          return {
            galleryId: g.galleryId,
            galleryName: g.name,
            revenue: g.revenue,
            count: g.count,
            avgPrice: g.avgPrice,
            rank,
            priorRank,
            rankChange,
          };
        });

        galleryRankingsByYear[year] = rows;
        priorRankMap = currentRankMap;
      }

      // ---- Lifetime totals ---------------------------------------------------

      const lifetimeRevenue = yearSummaries.reduce((sum, y) => sum + y.revenue, 0);
      const bestYear = yearSummaries.length > 0
        ? yearSummaries.reduce((best, y) => y.revenue > best.revenue ? y : best)
        : null;

      // ---- Prognosis for running year ----------------------------------------

      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1);
      const daysInYear = Math.round((endOfYear.getTime() - startOfYear.getTime()) / 86_400_000);
      const daysElapsed = Math.max(1, Math.round((now.getTime() - startOfYear.getTime()) / 86_400_000));
      const fractionElapsed = daysElapsed / daysInYear;

      const currentYearSales = byYear.get(currentYear) ?? [];
      const revenueToDate = currentYearSales.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
      const salesCountToDate = currentYearSales.length;

      const projectedRevenueSalesOnly = fractionElapsed > 0 ? revenueToDate / fractionElapsed : 0;
      const projectedSalesCount = fractionElapsed > 0 ? Math.round(salesCountToDate / fractionElapsed) : 0;
      // projectedRevenue will be set after pre-sold calculation (sales pace + pre-sold on top)

      // Prior year same-period comparison
      const priorYear = currentYear - 1;
      const priorYearSummary = yearSummaries.find((y) => y.year === priorYear);
      const priorYearRevenue = priorYearSummary?.revenue ?? null;

      // Calculate prior year revenue up to the same day-of-year
      const cutoffDayOfYear = daysElapsed;
      const priorYearSales = byYear.get(priorYear) ?? [];
      const priorStartOfYear = new Date(priorYear, 0, 1);
      const priorYearSamePeriodRevenue = priorYearSales
        .filter((s) => {
          if (!s.sale_date) return false;
          const d = new Date(s.sale_date);
          const dayOfYear = Math.round((d.getTime() - priorStartOfYear.getTime()) / 86_400_000);
          return dayOfYear <= cutoffDayOfYear;
        })
        .reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0) || null;

      const vsLastYearPace = priorYearSamePeriodRevenue != null && priorYearSamePeriodRevenue > 0
        ? ((revenueToDate - priorYearSamePeriodRevenue) / priorYearSamePeriodRevenue) * 100
        : null;

      // Monthly breakdown for current year
      const monthlyMap = new Map<number, { revenue: number; count: number }>();
      for (let m = 0; m < 12; m++) monthlyMap.set(m, { revenue: 0, count: 0 });
      for (const s of currentYearSales) {
        if (!s.sale_date) continue;
        const m = new Date(s.sale_date).getMonth();
        const entry = monthlyMap.get(m)!;
        entry.revenue += Number(s.sale_price) || 0;
        entry.count += 1;
      }
      const monthlyBreakdown = Array.from(monthlyMap.entries())
        .map(([month, val]) => ({ month, ...val }))
        .sort((a, b) => a.month - b.month);

      // ---- Potential revenue (unsold artworks → CHF) ---------------------------

      const potentialRevenue = unsoldArtworks.reduce(
        (sum, a) => sum + toCHF(a.price ?? 0, a.currency ?? 'EUR'), 0,
      );
      const potentialCount = unsoldArtworks.length;

      // ---- Confirmed production orders revenue (CHF) --------------------------
      // Sum per-item values, excluding items already converted to artworks

      const itemValMap: Record<string, number> = {};
      for (const item of orderItems) {
        if (item.artwork_id) continue; // already converted to artwork → counted in potential
        if (item.price != null && item.price > 0) {
          const qty = item.quantity ?? 1;
          const chf = toCHF(item.price * qty, item.currency ?? 'EUR');
          itemValMap[item.production_order_id] = (itemValMap[item.production_order_id] ?? 0) + chf;
        }
      }
      const confirmedOrdersRevenue = Object.values(itemValMap).reduce((sum, v) => sum + v, 0);
      const confirmedOrdersCount = activeProdOrders.length;

      // Break down by order type: pre-sold (confirmed) vs consignment (exhibited for sale)
      let preSoldRevenue = 0;
      let preSoldCount = 0;
      let consignmentRevenue = 0;
      let consignmentCount = 0;
      // Track consignment orders per gallery for sell-through weighting
      const consignmentByGallery = new Map<string, { value: number; count: number }>();
      for (const order of activeProdOrders) {
        const val = itemValMap[order.id] ?? 0;
        if (order.status === 'pre_sold') {
          preSoldRevenue += val;
          preSoldCount += 1;
        } else if (order.status === 'consignment') {
          consignmentRevenue += val;
          consignmentCount += 1;
          if (order.gallery_id) {
            const existing = consignmentByGallery.get(order.gallery_id) ?? { value: 0, count: 0 };
            existing.value += val;
            existing.count += 1;
            consignmentByGallery.set(order.gallery_id, existing);
          }
        }
      }

      const totalPipeline = potentialRevenue + confirmedOrdersRevenue;

      // ---- Consignment sell-through rate per gallery -----------------------------
      // For each gallery with consignment orders, calculate sell-through:
      //   rate = salesCount / (salesCount + unsoldArtworksAtGallery)
      // Then weight the consignment value by that rate.

      // Build gallery sales count from all-time sales data
      const gallerySalesCounts = new Map<string, number>();
      for (const s of sales) {
        if (s.gallery_id) {
          gallerySalesCounts.set(s.gallery_id, (gallerySalesCounts.get(s.gallery_id) ?? 0) + 1);
        }
      }

      // Build unsold artworks count per gallery (artworks currently at gallery, not sold)
      const galleryUnsoldCounts = new Map<string, number>();
      for (const a of unsoldArtworks) {
        const gid = (a as { gallery_id?: string | null }).gallery_id;
        if (gid) {
          galleryUnsoldCounts.set(gid, (galleryUnsoldCounts.get(gid) ?? 0) + 1);
        }
      }

      // Resolve gallery names from sales data (we already have them from the sales query)
      const galleryNameMap = new Map<string, string>();
      for (const s of sales) {
        if (s.gallery_id) {
          const gData = s.galleries as { name: string } | null;
          if (gData?.name) galleryNameMap.set(s.gallery_id, gData.name);
        }
      }

      const consignmentGalleryDetails: ConsignmentGalleryDetail[] = [];
      let weightedConsignmentRevenue = 0;

      for (const [galleryId, { value, count }] of consignmentByGallery) {
        const salesCount = gallerySalesCounts.get(galleryId) ?? 0;
        const unsoldCount = galleryUnsoldCounts.get(galleryId) ?? 0;
        const totalHandled = salesCount + unsoldCount;
        // Default 30% if gallery has no history (conservative estimate)
        const sellThroughRate = totalHandled > 0 ? salesCount / totalHandled : 0.3;
        const weightedValue = value * sellThroughRate;
        weightedConsignmentRevenue += weightedValue;

        consignmentGalleryDetails.push({
          galleryId,
          galleryName: galleryNameMap.get(galleryId) ?? 'Unknown Gallery',
          consignmentValue: value,
          orderCount: count,
          sellThroughRate,
          weightedValue,
          salesCount,
          totalHandled,
        });
      }
      // Sort by weighted value descending
      consignmentGalleryDetails.sort((a, b) => b.weightedValue - a.weightedValue);

      // ---- Best-estimate projected revenue ----------------------------------------
      // Pre-sold is part of the revenue pace (user confirmed: pre-sold = sales pace)
      const revenueToDateIncPreSold = revenueToDate + preSoldRevenue;
      // Pace extrapolation includes pre-sold in the base
      const projectedFromPace = fractionElapsed > 0 ? revenueToDateIncPreSold / fractionElapsed : 0;
      // Add weighted consignment on top (probability-adjusted upside)
      const projectedRevenue = projectedFromPace + weightedConsignmentRevenue;

      const prognosis: YearPrognosis = {
        currentYear,
        revenueToDate,
        revenueToDateIncPreSold,
        salesCountToDate,
        preSoldRevenue,
        preSoldCount,
        daysElapsed,
        daysInYear,
        fractionElapsed,
        projectedRevenueSalesOnly,
        projectedRevenue,
        projectedSalesCount,
        priorYearRevenue,
        priorYearSamePeriodRevenue,
        vsLastYearPace,
        monthlyBreakdown,
        potentialRevenue,
        potentialCount,
        confirmedOrdersRevenue,
        confirmedOrdersCount,
        consignmentRevenue,
        consignmentCount,
        weightedConsignmentRevenue,
        consignmentGalleryDetails,
        totalPipeline,
      };

      setData({
        years,
        yearSummaries,
        galleryRankingsByYear,
        lifetimeRevenue,
        bestYear: bestYear ? { year: bestYear.year, revenue: bestYear.revenue } : null,
        prognosis,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch revenue data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
