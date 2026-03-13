// ---------------------------------------------------------------------------
// useRevenueOverview -- Year-by-year revenue + gallery ranking with YoY change
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';

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

export interface GalleryRevenueDetail {
  id: string;
  type: 'sale' | 'pre_sold' | 'consignment_order' | 'consignment_artwork';
  date: string | null;
  amount: number;       // gross value (original currency or CHF for computed items)
  currency: string;
  amountCHF: number;    // for sales: CHF conversion. For consignment: weighted value (after sell-through)
  grossCHF?: number;    // for consignment items: gross CHF value before sell-through weighting
  label?: string;       // description (e.g. "Pre-sold order", "45% sell-through")
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
  details: GalleryRevenueDetail[]; // individual sale/pre-sold line items
}

export interface ConsignmentGalleryDetail {
  galleryId: string;
  galleryName: string;
  consignmentOrderValue: number;   // production orders with consignment status (CHF)
  consignmentOrderCount: number;
  artworksAtGalleryValue: number;  // unsold artworks physically at this gallery (CHF)
  artworksAtGalleryCount: number;
  totalConsignmentValue: number;   // orders + artworks combined
  sellThroughRate: number;         // 0–1 ratio (manual override or computed)
  isOverride: boolean;             // true if sell-through was manually set
  weightedValue: number;           // totalConsignmentValue * sellThroughRate
  salesCount: number;              // historical sales from this gallery
  totalHandled: number;            // sales + currently unsold at gallery
}

// Art market price elasticity for the +15% scenario
// Research-based: contemporary art mid-career elasticity typically -0.5 to -1.0
// Conservative estimate of -0.7 (10% price increase → 7% volume decrease)
const ART_PRICE_ELASTICITY = -0.7;

export interface PriceScenario {
  priceIncreasePct: number;        // e.g. 15 (%)
  elasticity: number;              // e.g. -0.7
  volumeChangePct: number;         // derived: priceIncreasePct * elasticity (e.g. -10.5%)
  revenueMultiplier: number;       // (1 + priceIncrease) * (1 + volumeChange)
  projectedRevenue: number;        // base projectedRevenue * revenueMultiplier
  projectedSalesCount: number;     // base count adjusted for volume change
  netRevenueChangePct: number;     // (revenueMultiplier - 1) * 100
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
  artworksAtGalleriesRevenue: number; // unsold artworks at galleries, weighted by sell-through (CHF)
  artworksAtGalleriesCount: number;   // number of unsold artworks at galleries
  totalPipeline: number;          // potentialRevenue + confirmedOrdersRevenue
  priceScenario: PriceScenario;   // +15% price increase scenario
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

export function useRevenueOverview() {
  const [data, setData] = useState<RevenueOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Fetch sales, unsold artworks, active production orders, and gallery overrides in parallel
      const [salesResult, artworksResult, prodOrdersResult, galleryOverridesResult] = await Promise.all([
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
          .select('id, price, currency, status, gallery_id, galleries(name)')
          .not('status', 'in', '("draft","completed")'),
        supabase
          .from('galleries')
          .select('id, sell_through_override')
          .not('sell_through_override', 'is', null),
      ]);

      if (salesResult.error) throw salesResult.error;
      const sales = salesResult.data ?? [];
      const unsoldArtworks = artworksResult.data ?? [];
      const activeProdOrders = prodOrdersResult.data ?? [];

      // Build sell-through override map
      const sellThroughOverrides = new Map<string, number>();
      for (const g of galleryOverridesResult.data ?? []) {
        if (g.sell_through_override != null) {
          sellThroughOverrides.set(g.id, Number(g.sell_through_override));
        }
      }

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
      const now = new Date();
      const currentYear = now.getFullYear();

      // ---- Production order item values (CHF) — needed for gallery rankings ---
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

      // ---- Year summaries with YoY change ------------------------------------

      const yearSummaries: YearSummary[] = [];
      let prevRevenue: number | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];
        const revenue = ySales.reduce((sum, s) => sum + toCHF(Number(s.sale_price) || 0, s.currency ?? 'CHF'), 0);
        const count = ySales.length;
        const avgPrice = count > 0 ? revenue / count : 0;
        const yoyChange = prevRevenue != null && prevRevenue > 0
          ? ((revenue - prevRevenue) / prevRevenue) * 100
          : null;

        yearSummaries.push({ year, revenue, count, avgPrice, yoyChange });
        prevRevenue = revenue;
      }

      // ---- Gallery rankings per year with rank change ------------------------
      // Include pre-sold production orders in gallery revenue for the current year

      // Build gallery name map from production orders + sales (for name resolution)
      const prodOrderGalleryNames = new Map<string, string>();
      for (const order of activeProdOrders) {
        if (order.gallery_id) {
          const gData = (order as { galleries?: { name: string } | null }).galleries;
          if (gData?.name) prodOrderGalleryNames.set(order.gallery_id, gData.name);
        }
      }
      const galleryNameMap = new Map<string, string>();
      for (const s of sales) {
        if (s.gallery_id) {
          const gData = s.galleries as { name: string } | null;
          if (gData?.name) galleryNameMap.set(s.gallery_id, gData.name);
        }
      }
      for (const [gid, name] of prodOrderGalleryNames) {
        if (!galleryNameMap.has(gid)) galleryNameMap.set(gid, name);
      }

      // Build map of pre-sold order values per gallery (for current year addition)
      const preSoldByGallery = new Map<string, { value: number; count: number }>();
      for (const order of activeProdOrders) {
        if (order.status === 'pre_sold' && order.gallery_id) {
          const val = itemValMap[order.id] ?? 0;
          const existing = preSoldByGallery.get(order.gallery_id) ?? { value: 0, count: 0 };
          existing.value += val;
          existing.count += 1;
          preSoldByGallery.set(order.gallery_id, existing);
        }
      }

      // ---- Sell-through per gallery (needed for gallery rankings) ----------------
      // Compute BEFORE gallery rankings so we can include weighted consignment in current year

      // Consignment orders per gallery
      const consignmentByGalleryEarly = new Map<string, { value: number; count: number; orders: typeof activeProdOrders }>();
      for (const order of activeProdOrders) {
        if (order.status === 'consignment' && order.gallery_id) {
          const val = itemValMap[order.id] ?? 0;
          const existing = consignmentByGalleryEarly.get(order.gallery_id) ?? { value: 0, count: 0, orders: [] };
          existing.value += val;
          existing.count += 1;
          existing.orders.push(order);
          consignmentByGalleryEarly.set(order.gallery_id, existing);
        }
      }

      // Gallery sales counts (all-time)
      const gallerySalesCountsEarly = new Map<string, number>();
      for (const s of sales) {
        if (s.gallery_id) {
          gallerySalesCountsEarly.set(s.gallery_id, (gallerySalesCountsEarly.get(s.gallery_id) ?? 0) + 1);
        }
      }

      // Artworks on consignment per gallery
      const galleryArtworksEarly = new Map<string, { count: number; value: number; artworks: typeof unsoldArtworks }>();
      for (const a of unsoldArtworks) {
        const gid = (a as { gallery_id?: string | null }).gallery_id;
        if (gid && a.status === 'on_consignment') {
          const existing = galleryArtworksEarly.get(gid) ?? { count: 0, value: 0, artworks: [] };
          existing.count += 1;
          existing.value += toCHF(a.price ?? 0, a.currency ?? 'EUR');
          existing.artworks.push(a);
          galleryArtworksEarly.set(gid, existing);
        }
      }

      // Per-gallery sell-through rate + weighted values for current year rankings
      const gallerySellThrough = new Map<string, {
        sellThroughRate: number;
        orderValue: number;
        artworkValue: number;
        weightedOrderValue: number;
        weightedArtworkValue: number;
        consignmentOrders: typeof activeProdOrders;
        consignmentArtworks: typeof unsoldArtworks;
      }>();
      const allConsignGalleryIds = new Set<string>([
        ...consignmentByGalleryEarly.keys(),
        ...galleryArtworksEarly.keys(),
      ]);
      for (const gid of allConsignGalleryIds) {
        const oData = consignmentByGalleryEarly.get(gid);
        const aData = galleryArtworksEarly.get(gid);
        const orderValue = oData?.value ?? 0;
        const artworkValue = aData?.value ?? 0;
        const salesCount = gallerySalesCountsEarly.get(gid) ?? 0;
        const unsoldCount = aData?.count ?? 0;
        const totalHandled = salesCount + unsoldCount;
        const computedRate = totalHandled > 0 ? salesCount / totalHandled : 0.3;
        const sellThroughRate = sellThroughOverrides.get(gid) ?? computedRate;
        gallerySellThrough.set(gid, {
          sellThroughRate,
          orderValue,
          artworkValue,
          weightedOrderValue: orderValue * sellThroughRate,
          weightedArtworkValue: artworkValue * sellThroughRate,
          consignmentOrders: oData?.orders ?? [],
          consignmentArtworks: aData?.artworks ?? [],
        });
      }

      const galleryRankingsByYear: Record<number, GalleryYearRow[]> = {};
      let priorRankMap: Map<string, number> | null = null;

      for (const year of years) {
        const ySales = byYear.get(year) ?? [];

        // Aggregate per gallery + collect detail records
        const galleryMap = new Map<string, { name: string; revenue: number; count: number; details: GalleryRevenueDetail[] }>();
        for (const s of ySales) {
          const gid = s.gallery_id ?? 'direct';
          const gData = s.galleries as { name: string } | null;
          const gName = gData?.name ?? 'Direct Sale';
          const existing = galleryMap.get(gid) ?? { name: gName, revenue: 0, count: 0, details: [] };
          const saleAmt = Number(s.sale_price) || 0;
          const saleCur = (s as { currency?: string | null }).currency ?? 'CHF';
          const saleAmtCHF = toCHF(saleAmt, saleCur);
          existing.revenue += saleAmtCHF;
          existing.count += 1;
          existing.details.push({
            id: s.id,
            type: 'sale',
            date: s.sale_date ?? null,
            amount: saleAmt,
            currency: saleCur,
            amountCHF: toCHF(saleAmt, saleCur),
          });
          galleryMap.set(gid, existing);
        }

        // For current year: add pre-sold + weighted consignment to respective galleries
        if (year === currentYear) {
          // Pre-sold orders
          for (const order of activeProdOrders) {
            if (order.status !== 'pre_sold' || !order.gallery_id) continue;
            const gid = order.gallery_id;
            const val = itemValMap[order.id] ?? 0;
            const gName = prodOrderGalleryNames.get(gid) ?? 'Unknown Gallery';
            const existing = galleryMap.get(gid) ?? { name: gName, revenue: 0, count: 0, details: [] };
            existing.revenue += val;
            existing.count += 1;
            existing.details.push({
              id: order.id,
              type: 'pre_sold',
              date: null,
              amount: val,
              currency: 'CHF',
              amountCHF: val,
              label: 'Pre-sold order',
            });
            galleryMap.set(gid, existing);
          }

          // Weighted consignment orders + artworks on consignment
          for (const [gid, st] of gallerySellThrough) {
            const gName = prodOrderGalleryNames.get(gid) ?? galleryNameMap.get(gid) ?? 'Unknown Gallery';
            const existing = galleryMap.get(gid) ?? { name: gName, revenue: 0, count: 0, details: [] };
            const pctLabel = `${(st.sellThroughRate * 100).toFixed(0)}% sell-through`;

            // Consignment orders (weighted)
            if (st.weightedOrderValue > 0) {
              existing.revenue += st.weightedOrderValue;
              for (const order of st.consignmentOrders) {
                const orderVal = itemValMap[order.id] ?? 0;
                const weightedVal = orderVal * st.sellThroughRate;
                existing.details.push({
                  id: order.id,
                  type: 'consignment_order',
                  date: null,
                  amount: orderVal,
                  currency: 'CHF',
                  amountCHF: weightedVal,
                  grossCHF: orderVal,
                  label: `Consignment order (${pctLabel})`,
                });
              }
            }

            // Artworks on consignment (weighted)
            if (st.weightedArtworkValue > 0) {
              existing.revenue += st.weightedArtworkValue;
              for (const artwork of st.consignmentArtworks) {
                const artVal = toCHF(artwork.price ?? 0, artwork.currency ?? 'EUR');
                const weightedVal = artVal * st.sellThroughRate;
                existing.details.push({
                  id: artwork.id,
                  type: 'consignment_artwork',
                  date: null,
                  amount: artVal,
                  currency: 'CHF',
                  amountCHF: weightedVal,
                  grossCHF: artVal,
                  label: `Artwork on consignment (${pctLabel})`,
                });
              }
            }

            galleryMap.set(gid, existing);
          }
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

          // Sort details: sales by date (newest first), then pre-sold, then consignment
          const typeOrder = { sale: 0, pre_sold: 1, consignment_order: 2, consignment_artwork: 3 };
          const sortedDetails = [...g.details].sort((a, b) => {
            const ta = typeOrder[a.type] ?? 9;
            const tb = typeOrder[b.type] ?? 9;
            if (ta !== tb) return ta - tb;
            if (a.date && b.date) return b.date.localeCompare(a.date);
            return 0;
          });

          return {
            galleryId: g.galleryId,
            galleryName: g.name,
            revenue: g.revenue,
            count: g.count,
            avgPrice: g.avgPrice,
            rank,
            priorRank,
            rankChange,
            details: sortedDetails,
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

      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1);
      const daysInYear = Math.round((endOfYear.getTime() - startOfYear.getTime()) / 86_400_000);
      const daysElapsed = Math.max(1, Math.round((now.getTime() - startOfYear.getTime()) / 86_400_000));
      const fractionElapsed = daysElapsed / daysInYear;

      const currentYearSales = byYear.get(currentYear) ?? [];
      const revenueToDate = currentYearSales.reduce((sum, s) => sum + toCHF(Number(s.sale_price) || 0, s.currency ?? 'CHF'), 0);
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
        .reduce((sum, s) => sum + toCHF(Number(s.sale_price) || 0, s.currency ?? 'CHF'), 0) || null;

      // vsLastYearPace: compare sales + pre-sold to date vs prior year same period
      // (pre-sold is confirmed revenue, part of the pace)
      // NOTE: we compute preSoldRevenue below, so use a quick inline sum here
      let preSoldRevForPace = 0;
      for (const order of activeProdOrders) {
        if (order.status === 'pre_sold') preSoldRevForPace += (itemValMap[order.id] ?? 0);
      }
      const revenueToDateForPace = revenueToDate + preSoldRevForPace;
      const vsLastYearPace = priorYearSamePeriodRevenue != null && priorYearSamePeriodRevenue > 0
        ? ((revenueToDateForPace - priorYearSamePeriodRevenue) / priorYearSamePeriodRevenue) * 100
        : null;

      // Monthly breakdown for current year
      const monthlyMap = new Map<number, { revenue: number; count: number }>();
      for (let m = 0; m < 12; m++) monthlyMap.set(m, { revenue: 0, count: 0 });
      for (const s of currentYearSales) {
        if (!s.sale_date) continue;
        const m = new Date(s.sale_date).getMonth();
        const entry = monthlyMap.get(m)!;
        entry.revenue += toCHF(Number(s.sale_price) || 0, s.currency ?? 'CHF');
        entry.count += 1;
      }
      const monthlyBreakdown = Array.from(monthlyMap.entries())
        .map(([month, val]) => ({ month, ...val }))
        .sort((a, b) => a.month - b.month);

      // ---- Available artwork revenue potential (only status = 'available') ------

      const availableArtworks = unsoldArtworks.filter((a) => a.status === 'available');
      const potentialRevenue = availableArtworks.reduce(
        (sum, a) => sum + toCHF(a.price ?? 0, a.currency ?? 'EUR'), 0,
      );
      const potentialCount = availableArtworks.length;

      // ---- Confirmed production orders revenue (CHF) --------------------------
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
      // For each gallery with consignment orders OR artworks at gallery,
      // calculate sell-through: rate = salesCount / (salesCount + unsoldAtGallery)
      // Then weight all consignment value (orders + artworks) by that rate.

      // Build gallery sales count from all-time sales data
      const gallerySalesCounts = new Map<string, number>();
      for (const s of sales) {
        if (s.gallery_id) {
          gallerySalesCounts.set(s.gallery_id, (gallerySalesCounts.get(s.gallery_id) ?? 0) + 1);
        }
      }

      // Build artworks on consignment at galleries: count + value per gallery
      // Only include artworks with status 'on_consignment' (matches dashboard definition)
      const galleryArtworks = new Map<string, { count: number; value: number }>();
      for (const a of unsoldArtworks) {
        const gid = (a as { gallery_id?: string | null }).gallery_id;
        if (gid && a.status === 'on_consignment') {
          const existing = galleryArtworks.get(gid) ?? { count: 0, value: 0 };
          existing.count += 1;
          existing.value += toCHF(a.price ?? 0, a.currency ?? 'EUR');
          galleryArtworks.set(gid, existing);
        }
      }

      // Collect all gallery IDs that have either consignment orders or artworks at gallery
      const allConsignmentGalleryIds = new Set<string>([
        ...consignmentByGallery.keys(),
        ...galleryArtworks.keys(),
      ]);

      const consignmentGalleryDetails: ConsignmentGalleryDetail[] = [];
      let weightedConsignmentRevenue = 0;
      let artworksAtGalleriesRevenue = 0;
      let artworksAtGalleriesCount = 0;

      for (const galleryId of allConsignmentGalleryIds) {
        const orderData = consignmentByGallery.get(galleryId);
        const artworkData = galleryArtworks.get(galleryId);
        const orderValue = orderData?.value ?? 0;
        const orderCount = orderData?.count ?? 0;
        const artworkValue = artworkData?.value ?? 0;
        const artworkCount = artworkData?.count ?? 0;
        const totalConsignmentValue = orderValue + artworkValue;

        const salesCount = gallerySalesCounts.get(galleryId) ?? 0;
        const unsoldCount = artworkCount; // artworks currently at this gallery
        const totalHandled = salesCount + unsoldCount;
        // Use manual override if set, otherwise compute from history (default 30%)
        const computedRatePrognosis = totalHandled > 0 ? salesCount / totalHandled : 0.3;
        const sellThroughRate = sellThroughOverrides.get(galleryId) ?? computedRatePrognosis;
        const weightedValue = totalConsignmentValue * sellThroughRate;
        weightedConsignmentRevenue += weightedValue;
        artworksAtGalleriesRevenue += artworkValue;
        artworksAtGalleriesCount += artworkCount;

        consignmentGalleryDetails.push({
          galleryId,
          galleryName: galleryNameMap.get(galleryId) ?? 'Unknown Gallery',
          consignmentOrderValue: orderValue,
          consignmentOrderCount: orderCount,
          artworksAtGalleryValue: artworkValue,
          artworksAtGalleryCount: artworkCount,
          totalConsignmentValue,
          sellThroughRate,
          isOverride: sellThroughOverrides.has(galleryId),
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

      // ---- Price increase scenario (+15%) -----------------------------------------
      const priceIncreasePct = 15;
      const volumeChangePct = priceIncreasePct * ART_PRICE_ELASTICITY; // e.g. -10.5%
      const revenueMultiplier = (1 + priceIncreasePct / 100) * (1 + volumeChangePct / 100);
      const priceScenario: PriceScenario = {
        priceIncreasePct,
        elasticity: ART_PRICE_ELASTICITY,
        volumeChangePct,
        revenueMultiplier,
        projectedRevenue: projectedRevenue * revenueMultiplier,
        projectedSalesCount: Math.round(projectedSalesCount * (1 + volumeChangePct / 100)),
        netRevenueChangePct: (revenueMultiplier - 1) * 100,
      };

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
        artworksAtGalleriesRevenue,
        artworksAtGalleriesCount,
        totalPipeline,
        priceScenario,
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
  }, [toast, toCHF]);

  // Wait for exchange rates before fetching data
  useEffect(() => { if (ratesReady) fetchData(); }, [fetchData, ratesReady]);

  return { data, loading, error, refresh: fetchData };
}
