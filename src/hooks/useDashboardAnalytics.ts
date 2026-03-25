// ---------------------------------------------------------------------------
// useDashboardAnalytics — fetches & computes 9 business analyses for dashboard
// All monetary values converted to CHF via toCHF callback.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Public data interfaces
// ---------------------------------------------------------------------------

// 1. Profit & Loss per Artwork
export interface ArtworkProfitLoss {
  artworkId: string;
  title: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  marginPercent: number;
}
export interface ProfitLossSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalNetProfit: number;
  avgMargin: number;
  topArtworks: ArtworkProfitLoss[];
}

// 2. Sales Funnel
export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  conversionRate: number;
  avgDaysInStage: number | null;
}
export interface SalesFunnelData {
  stages: FunnelStage[];
  overallConversion: number;
  totalPipelineValue: number;
}

// 3. Collector LTV
export interface CollectorLTV {
  contactId: string;
  name: string;
  country: string | null;
  totalSpend: number;
  purchaseCount: number;
  avgOrderValue: number;
  lastPurchaseDate: string;
}

// 4. Cash Flow
export interface CashFlowMonth {
  month: string;
  cashIn: number;
  cashOut: number;
  netFlow: number;
  runningBalance: number;
}

// 5. Consignment Aging
export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
  totalValue: number;
}
export interface StaleArtwork {
  id: string;
  title: string;
  galleryName: string;
  galleryId: string | null;
  daysConsigned: number;
  value: number;
}
export interface InventoryAgingData {
  buckets: AgingBucket[];
  totalConsigned: number;
  totalConsignedValue: number;
  avgDaysConsigned: number;
  staleArtworks: StaleArtwork[];
}

// 6. Exhibition Impact
export interface ExhibitionImpact {
  exhibitionId: string;
  title: string;
  venue: string | null;
  dates: string;
  artworksShown: number;
  directSales: number;
  attributedSales: number;
  totalRevenue: number;
  budget: number;
  expenses: number;
  roi: number | null;
}

// 7. Price Intelligence
export interface GalleryDiscount {
  galleryId: string;
  galleryName: string;
  avgDiscount: number;
  salesCount: number;
}
export interface PriceIntelligenceData {
  avgDiscountRate: number;
  atListPricePercent: number;
  galleryDiscounts: GalleryDiscount[];
  recentDiscounted: { title: string; listPrice: number; salePrice: number; discount: number; gallery: string }[];
}

// 8. Viewing Room Engagement
export interface ViewingRoomStats {
  roomId: string;
  title: string;
  visibility: string;
  artworkCount: number;
  totalViews: number;
  lastViewed: string | null;
}
export interface ViewingRoomEngagementData {
  totalViews: number;
  rooms: ViewingRoomStats[];
  monthlyTrend: { month: string; views: number }[];
}

// 9. Geographic Distribution
export interface GeoEntry {
  location: string;
  revenue: number;
  count: number;
}
export interface GeoDistributionData {
  salesByCountry: GeoEntry[];
  collectorsByCountry: GeoEntry[];
}

// Combined
export interface DashboardAnalyticsData {
  profitLoss: ProfitLossSummary;
  salesFunnel: SalesFunnelData;
  collectorLTV: CollectorLTV[];
  cashFlow: CashFlowMonth[];
  inventoryAging: InventoryAgingData;
  exhibitionImpact: ExhibitionImpact[];
  priceIntelligence: PriceIntelligenceData;
  viewingRoomEngagement: ViewingRoomEngagementData;
  geoDistribution: GeoDistributionData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGE_ORDER = ['lead', 'contacted', 'quoted', 'negotiating', 'sold', 'lost'] as const;
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', contacted: 'Contacted', quoted: 'Quoted',
  negotiating: 'Negotiating', sold: 'Sold', lost: 'Lost',
};

function monthKey(d: string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}
function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDashboardAnalytics(
  toCHF: (amount: number, currency: string) => number,
  ratesReady: boolean,
) {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Raw query results cached for re-compute when rates arrive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [raw, setRaw] = useState<Record<string, any[]>>({});

  const fetchRaw = useCallback(async () => {
    // Verify session before querying
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [
      { data: sales },
      { data: expenses },
      { data: deals },
      { data: contacts },
      { data: artworks },
      { data: invoices },
      { data: exhibitions },
      { data: viewingRooms },
      { data: vrViews },
      { data: galleries },
    ] = await Promise.all([
      supabase.from('sales').select('id, artwork_id, sale_price, currency, sale_date, contact_id, gallery_id, sale_city, sale_country, sale_type, source_exhibition_id, artworks(title, price, currency, category)'),
      supabase.from('expenses').select('id, artwork_id, exhibition_id, amount, currency, expense_date, category'),
      supabase.from('deals').select('id, contact_id, artwork_id, stage, value, currency, stage_changed_at, lost_reason, created_at, updated_at'),
      supabase.from('contacts').select('id, first_name, last_name, city, country'),
      supabase.from('artworks').select('id, title, status, consigned_since, price, currency, gallery_id'),
      supabase.from('invoices').select('id, total, currency, paid_date').eq('status', 'paid'),
      supabase.from('exhibitions').select('id, title, venue, start_date, end_date, budget, budget_currency, exhibition_artworks(artwork_id)'),
      supabase.from('viewing_rooms').select('id, title, visibility, artwork_ids'),
      supabase.from('viewing_room_views').select('id, viewing_room_id, viewed_at'),
      supabase.from('galleries').select('id, name'),
    ]);

    setRaw({
      sales: sales ?? [], expenses: expenses ?? [], deals: deals ?? [],
      contacts: contacts ?? [], artworks: artworks ?? [], invoices: invoices ?? [],
      exhibitions: exhibitions ?? [], viewingRooms: viewingRooms ?? [],
      vrViews: vrViews ?? [], galleries: galleries ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchRaw(); }, [fetchRaw]);

  // Re-compute when exchange rates or raw data arrive
  useEffect(() => {
    if (!ratesReady || Object.keys(raw).length === 0) return;

    const { sales, expenses, deals, contacts, artworks, invoices, exhibitions, viewingRooms, vrViews, galleries } = raw;

    // Gallery name map
    const gNameMap = new Map<string, string>();
    for (const g of galleries) gNameMap.set(g.id, g.name);

    // Contact name map
    const cNameMap = new Map<string, { name: string; country: string | null }>();
    for (const c of contacts) {
      cNameMap.set(c.id, { name: `${c.first_name} ${c.last_name}`, country: c.country });
    }

    // ---- 1. Profit & Loss per Artwork ----
    const revenueByArtwork = new Map<string, { revenue: number; title: string }>();
    const expenseByArtwork = new Map<string, number>();

    for (const s of sales) {
      const chf = toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
      const existing = revenueByArtwork.get(s.artwork_id) ?? { revenue: 0, title: s.artworks?.title ?? 'Unknown' };
      existing.revenue += chf;
      revenueByArtwork.set(s.artwork_id, existing);
    }
    for (const e of expenses) {
      if (e.artwork_id) {
        expenseByArtwork.set(e.artwork_id, (expenseByArtwork.get(e.artwork_id) ?? 0) + toCHF(e.amount, e.currency ?? 'EUR'));
      }
    }

    let totalRev = 0, totalExp = 0;
    const plItems: ArtworkProfitLoss[] = [];
    for (const [aid, { revenue, title }] of revenueByArtwork) {
      const exp = expenseByArtwork.get(aid) ?? 0;
      totalRev += revenue;
      totalExp += exp;
      plItems.push({
        artworkId: aid, title, revenue, expenses: exp,
        netProfit: revenue - exp,
        marginPercent: revenue > 0 ? ((revenue - exp) / revenue) * 100 : 0,
      });
    }
    // Also add expenses for artworks that were never sold
    for (const [aid, exp] of expenseByArtwork) {
      if (!revenueByArtwork.has(aid)) totalExp += exp;
    }
    plItems.sort((a, b) => b.netProfit - a.netProfit);

    const profitLoss: ProfitLossSummary = {
      totalRevenue: totalRev, totalExpenses: totalExp,
      totalNetProfit: totalRev - totalExp,
      avgMargin: plItems.length > 0 ? plItems.reduce((s, i) => s + i.marginPercent, 0) / plItems.length : 0,
      topArtworks: plItems.slice(0, 10),
    };

    // ---- 2. Sales Funnel ----
    const stageMap = new Map<string, { count: number; value: number; days: number[] }>();
    for (const st of STAGE_ORDER) stageMap.set(st, { count: 0, value: 0, days: [] });

    for (const d of deals) {
      const entry = stageMap.get(d.stage);
      if (!entry) continue;
      entry.count += 1;
      entry.value += d.value != null ? toCHF(d.value, d.currency ?? 'EUR') : 0;
      if (d.stage_changed_at && d.created_at) {
        const days = daysBetween(d.created_at, d.stage_changed_at);
        if (days >= 0) entry.days.push(days);
      }
    }

    const funnelStages: FunnelStage[] = STAGE_ORDER.map((st, idx) => {
      const entry = stageMap.get(st)!;
      const nextStage = idx < STAGE_ORDER.length - 2 ? stageMap.get(STAGE_ORDER[idx + 1]) : null;
      return {
        stage: st, label: STAGE_LABELS[st] ?? st,
        count: entry.count, totalValue: entry.value,
        conversionRate: nextStage && entry.count > 0 ? (nextStage.count / entry.count) * 100 : 0,
        avgDaysInStage: entry.days.length > 0 ? Math.round(entry.days.reduce((a, b) => a + b, 0) / entry.days.length) : null,
      };
    });

    const leadCount = stageMap.get('lead')?.count ?? 0;
    const soldCount = stageMap.get('sold')?.count ?? 0;
    const activeValue = ['lead', 'contacted', 'quoted', 'negotiating']
      .reduce((s, st) => s + (stageMap.get(st)?.value ?? 0), 0);

    const salesFunnel: SalesFunnelData = {
      stages: funnelStages,
      overallConversion: leadCount > 0 ? (soldCount / leadCount) * 100 : 0,
      totalPipelineValue: activeValue,
    };

    // ---- 3. Collector LTV ----
    const collectorMap = new Map<string, { spend: number; count: number; dates: string[] }>();
    for (const s of sales) {
      if (!s.contact_id) continue;
      const entry = collectorMap.get(s.contact_id) ?? { spend: 0, count: 0, dates: [] };
      entry.spend += toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
      entry.count += 1;
      if (s.sale_date) entry.dates.push(s.sale_date);
      collectorMap.set(s.contact_id, entry);
    }
    const collectorLTV: CollectorLTV[] = Array.from(collectorMap.entries())
      .map(([cId, { spend, count, dates }]) => {
        dates.sort();
        const info = cNameMap.get(cId);
        return {
          contactId: cId,
          name: info?.name ?? 'Unknown',
          country: info?.country ?? null,
          totalSpend: spend, purchaseCount: count,
          avgOrderValue: count > 0 ? spend / count : 0,
          lastPurchaseDate: dates[dates.length - 1] ?? '',
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 15);

    // ---- 4. Cash Flow ----
    const cfMap = new Map<string, { cashIn: number; cashOut: number }>();
    for (const inv of invoices) {
      if (!inv.paid_date) continue;
      const mk = monthKey(inv.paid_date);
      const entry = cfMap.get(mk) ?? { cashIn: 0, cashOut: 0 };
      entry.cashIn += toCHF(inv.total ?? 0, inv.currency ?? 'EUR');
      cfMap.set(mk, entry);
    }
    for (const e of expenses) {
      if (!e.expense_date) continue;
      const mk = monthKey(e.expense_date);
      const entry = cfMap.get(mk) ?? { cashIn: 0, cashOut: 0 };
      entry.cashOut += toCHF(e.amount, e.currency ?? 'EUR');
      cfMap.set(mk, entry);
    }
    const sortedMonths = Array.from(cfMap.keys()).sort();
    let runBal = 0;
    const cashFlow: CashFlowMonth[] = sortedMonths.map((mk) => {
      const { cashIn, cashOut } = cfMap.get(mk)!;
      runBal += cashIn - cashOut;
      return { month: formatMonthLabel(mk), cashIn, cashOut, netFlow: cashIn - cashOut, runningBalance: runBal };
    });

    // ---- 5. Consignment Aging ----
    const today = new Date();
    const consigned = artworks.filter((a: { status: string; consigned_since: string | null }) =>
      a.status === 'on_consignment' && a.consigned_since,
    );
    const bucketDefs = [
      { label: '0–90 days', minDays: 0, maxDays: 90 },
      { label: '91–180 days', minDays: 91, maxDays: 180 },
      { label: '181–365 days', minDays: 181, maxDays: 365 },
      { label: '365+ days', minDays: 366, maxDays: 99999 },
    ];
    const agingBuckets: AgingBucket[] = bucketDefs.map((b) => ({ ...b, count: 0, totalValue: 0 }));
    const staleList: StaleArtwork[] = [];
    let totalDays = 0;

    for (const a of consigned) {
      const days = Math.floor((today.getTime() - new Date(a.consigned_since).getTime()) / 86_400_000);
      const val = a.price ? toCHF(a.price, a.currency ?? 'EUR') : 0;
      totalDays += days;

      for (const bucket of agingBuckets) {
        if (days >= bucket.minDays && days <= bucket.maxDays) {
          bucket.count += 1;
          bucket.totalValue += val;
          break;
        }
      }

      if (days > 180) {
        staleList.push({
          id: a.id, title: a.title ?? 'Untitled',
          galleryName: gNameMap.get(a.gallery_id) ?? 'Unknown',
          galleryId: a.gallery_id, daysConsigned: days, value: val,
        });
      }
    }
    staleList.sort((a, b) => b.daysConsigned - a.daysConsigned);

    const inventoryAging: InventoryAgingData = {
      buckets: agingBuckets,
      totalConsigned: consigned.length,
      totalConsignedValue: agingBuckets.reduce((s, b) => s + b.totalValue, 0),
      avgDaysConsigned: consigned.length > 0 ? Math.round(totalDays / consigned.length) : 0,
      staleArtworks: staleList.slice(0, 20),
    };

    // ---- 6. Exhibition Impact ----
    // Build artwork → sales lookup
    const salesByArtwork = new Map<string, { date: string; revenue: number; sourceExhId: string | null }[]>();
    for (const s of sales) {
      const list = salesByArtwork.get(s.artwork_id) ?? [];
      list.push({
        date: s.sale_date,
        revenue: toCHF(s.sale_price ?? 0, s.currency ?? 'EUR'),
        sourceExhId: s.source_exhibition_id ?? null,
      });
      salesByArtwork.set(s.artwork_id, list);
    }
    // Exhibition expenses
    const exhExpenses = new Map<string, number>();
    for (const e of expenses) {
      if (e.exhibition_id) {
        exhExpenses.set(e.exhibition_id, (exhExpenses.get(e.exhibition_id) ?? 0) + toCHF(e.amount, e.currency ?? 'EUR'));
      }
    }

    const exhibitionImpact: ExhibitionImpact[] = (exhibitions ?? []).map((exh: {
      id: string; title: string; venue: string | null;
      start_date: string | null; end_date: string | null;
      budget: number | null; budget_currency: string | null;
      exhibition_artworks: { artwork_id: string }[] | null;
    }) => {
      const artworkIds = (exh.exhibition_artworks ?? []).map((ea) => ea.artwork_id);
      const endDate = exh.end_date ?? exh.start_date ?? '';
      let directSales = 0, directRevenue = 0;
      let attributedSales = 0, attributedRevenue = 0;

      // Direct: sold within 90 days of exhibition end
      for (const aid of artworkIds) {
        for (const s of salesByArtwork.get(aid) ?? []) {
          if (endDate && s.date) {
            const diff = daysBetween(endDate, s.date);
            if (diff >= 0 && diff <= 90) {
              directSales += 1;
              directRevenue += s.revenue;
            }
          }
        }
      }

      // Attributed: sales with source_exhibition_id = this exhibition (long-term)
      for (const s of sales) {
        if (s.source_exhibition_id === exh.id) {
          attributedSales += 1;
          attributedRevenue += toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
        }
      }

      const totalRev = directRevenue + attributedRevenue;
      const budgetCHF = exh.budget ? toCHF(exh.budget, exh.budget_currency ?? 'EUR') : 0;
      const expCHF = exhExpenses.get(exh.id) ?? 0;
      const totalCost = budgetCHF + expCHF;

      const startPart = exh.start_date ? new Date(exh.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      const endPart = exh.end_date ? new Date(exh.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      const dates = startPart && endPart && startPart !== endPart ? `${startPart} – ${endPart}` : startPart || endPart || '—';

      return {
        exhibitionId: exh.id, title: exh.title, venue: exh.venue, dates,
        artworksShown: artworkIds.length,
        directSales, attributedSales,
        totalRevenue: totalRev,
        budget: budgetCHF, expenses: expCHF,
        roi: totalCost > 0 ? ((totalRev - totalCost) / totalCost) * 100 : null,
      };
    }).sort((a: ExhibitionImpact, b: ExhibitionImpact) => b.totalRevenue - a.totalRevenue);

    // ---- 7. Price Intelligence ----
    const discounts: { title: string; listPrice: number; salePrice: number; discount: number; gallery: string; galleryId: string | null }[] = [];
    let atListCount = 0;

    for (const s of sales) {
      const artwork = s.artworks;
      if (!artwork?.price || artwork.price <= 0) continue;
      const listCHF = toCHF(artwork.price, artwork.currency ?? 'EUR');
      const saleCHF = toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
      if (listCHF <= 0) continue;

      const discount = Math.max(0, (1 - saleCHF / listCHF) * 100);
      if (discount < 0.5) atListCount += 1;

      discounts.push({
        title: artwork.title ?? 'Untitled',
        listPrice: listCHF, salePrice: saleCHF, discount,
        gallery: gNameMap.get(s.gallery_id) ?? 'Direct',
        galleryId: s.gallery_id,
      });
    }

    // Per-gallery discount
    const galleryDiscountMap = new Map<string, { total: number; count: number }>();
    for (const d of discounts) {
      if (!d.galleryId) continue;
      const entry = galleryDiscountMap.get(d.galleryId) ?? { total: 0, count: 0 };
      entry.total += d.discount;
      entry.count += 1;
      galleryDiscountMap.set(d.galleryId, entry);
    }
    const galleryDiscounts: GalleryDiscount[] = Array.from(galleryDiscountMap.entries())
      .map(([gId, { total, count }]) => ({
        galleryId: gId, galleryName: gNameMap.get(gId) ?? 'Unknown',
        avgDiscount: count > 0 ? total / count : 0, salesCount: count,
      }))
      .sort((a, b) => b.avgDiscount - a.avgDiscount);

    const avgDiscountAll = discounts.length > 0
      ? discounts.reduce((s, d) => s + d.discount, 0) / discounts.length : 0;

    const priceIntelligence: PriceIntelligenceData = {
      avgDiscountRate: avgDiscountAll,
      atListPricePercent: discounts.length > 0 ? (atListCount / discounts.length) * 100 : 0,
      galleryDiscounts,
      recentDiscounted: discounts.filter((d) => d.discount >= 0.5).slice(0, 10),
    };

    // ---- 8. Viewing Room Engagement ----
    const viewCountMap = new Map<string, { count: number; last: string | null }>();
    for (const v of vrViews) {
      const entry = viewCountMap.get(v.viewing_room_id) ?? { count: 0, last: null };
      entry.count += 1;
      if (!entry.last || v.viewed_at > entry.last) entry.last = v.viewed_at;
      viewCountMap.set(v.viewing_room_id, entry);
    }

    const vrRooms: ViewingRoomStats[] = (viewingRooms ?? []).map((vr: {
      id: string; title: string; visibility: string; artwork_ids: string[];
    }) => {
      const stats = viewCountMap.get(vr.id);
      return {
        roomId: vr.id, title: vr.title, visibility: vr.visibility,
        artworkCount: (vr.artwork_ids ?? []).length,
        totalViews: stats?.count ?? 0,
        lastViewed: stats?.last ?? null,
      };
    }).sort((a: ViewingRoomStats, b: ViewingRoomStats) => b.totalViews - a.totalViews);

    // Monthly trend
    const vrMonthMap = new Map<string, number>();
    for (const v of vrViews) {
      const mk = monthKey(v.viewed_at);
      vrMonthMap.set(mk, (vrMonthMap.get(mk) ?? 0) + 1);
    }
    const vrMonthly = Array.from(vrMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mk, views]) => ({ month: formatMonthLabel(mk), views }));

    const viewingRoomEngagement: ViewingRoomEngagementData = {
      totalViews: vrViews.length,
      rooms: vrRooms,
      monthlyTrend: vrMonthly,
    };

    // ---- 9. Geographic Distribution ----
    const salesGeoMap = new Map<string, { revenue: number; count: number }>();
    const collectorGeoMap = new Map<string, { revenue: number; count: number }>();

    for (const s of sales) {
      const rev = toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');

      // Where the sale happened
      const saleCountry = s.sale_country?.trim();
      if (saleCountry) {
        const entry = salesGeoMap.get(saleCountry) ?? { revenue: 0, count: 0 };
        entry.revenue += rev; entry.count += 1;
        salesGeoMap.set(saleCountry, entry);
      }

      // Where the collector is based
      if (s.contact_id) {
        const cInfo = cNameMap.get(s.contact_id);
        const cCountry = cInfo?.country?.trim();
        if (cCountry) {
          const entry = collectorGeoMap.get(cCountry) ?? { revenue: 0, count: 0 };
          entry.revenue += rev; entry.count += 1;
          collectorGeoMap.set(cCountry, entry);
        }
      }
    }

    const toGeoArray = (map: Map<string, { revenue: number; count: number }>): GeoEntry[] =>
      Array.from(map.entries())
        .map(([loc, { revenue, count }]) => ({ location: loc, revenue, count }))
        .sort((a, b) => b.revenue - a.revenue);

    const geoDistribution: GeoDistributionData = {
      salesByCountry: toGeoArray(salesGeoMap),
      collectorsByCountry: toGeoArray(collectorGeoMap),
    };

    // ---- Set combined data ----
    setData({
      profitLoss, salesFunnel, collectorLTV, cashFlow,
      inventoryAging, exhibitionImpact, priceIntelligence,
      viewingRoomEngagement, geoDistribution,
    });
  }, [ratesReady, toCHF, raw]);

  return { data, loading, refresh: fetchRaw };
}
