// ---------------------------------------------------------------------------
// DashboardPage -- artwork inventory dashboard with live stats
// All monetary values converted to CHF using daily exchange rates
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card } from '../components/ui/Card';
import { ProfitLossCard } from '../components/dashboard/ProfitLossCard';
import { SalesFunnelChart } from '../components/dashboard/SalesFunnelChart';
import { CollectorLTVTable } from '../components/dashboard/CollectorLTVTable';
import { CashFlowChart } from '../components/dashboard/CashFlowChart';
import { ConsignmentAgingChart } from '../components/dashboard/ConsignmentAgingChart';
import { ExhibitionImpactTable } from '../components/dashboard/ExhibitionImpactTable';
import { PriceIntelligenceCard } from '../components/dashboard/PriceIntelligenceCard';
import { ViewingRoomEngagement } from '../components/dashboard/ViewingRoomEngagement';
import { GeoDistributionChart } from '../components/dashboard/GeoDistributionChart';

interface DashboardStats {
  total: number;
  available: number;
  onConsignment: number;
  sold: number;
  reserved: number;
  inProduction: number;
  inTransit: number;
  ordered: number;
}

interface GalleryCount {
  id: string;
  name: string;
  count: number;
  onConsignment: number;
  sold: number;
  available: number;
}

interface GalleryRevenue {
  id: string;
  name: string;
  revenue: number; // already in CHF
}

interface GalleryPotential {
  id: string;
  name: string;
  potential: number; // already in CHF
}

// Raw data interfaces (before currency conversion)
interface RawArtwork {
  status: string;
  gallery_id: string | null;
  price: number | null;
  currency: string | null;
}

interface RawSale {
  sale_price: number | null;
  currency: string | null;
  gallery_id: string | null;
  sale_date: string | null;
  commission_percent: number | null;
  artwork_id: string | null;
}

interface RawProdOrder {
  id: string;
  price: number | null;
  currency: string | null;
  status: string;
  gallery_id: string | null;
}

interface GalleryOrderRevenue {
  id: string;
  name: string;
  revenue: number; // in CHF
  orderCount: number;
}

// Revenue split (gallery / NOA / artist)
interface RevenueSplit {
  gallery: number; // CHF
  noa: number;     // CHF
  artist: number;  // CHF
  total: number;   // CHF
}

// Gallery performance analysis
interface GalleryPerformance {
  id: string;
  name: string;
  totalArtworks: number;
  sold: number;
  onConsignment: number;
  sellThroughRate: number; // percentage
  revenue: number; // CHF
  commission: number; // CHF
  avgDaysToSell: number | null;
}

// Unified gallery ranking row
interface GalleryRanking {
  id: string;
  name: string;
  type: string;
  totalRevenue: number;
  ordersRevenue: number;
  potentialRevenue: number;
  artworksSold: number;
  artworksConsigned: number;
  sellThroughRate: number;
  commissionSplit: string; // e.g. "50/25/25"
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { toCHF, ready: ratesReady } = useExchangeRates();
  const { data: analyticsData, loading: analyticsLoading } = useDashboardAnalytics(toCHF, ratesReady);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [galleryCounts, setGalleryCounts] = useState<GalleryCount[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPotential, setTotalPotential] = useState(0);
  const [confirmedOrdersRevenue, setConfirmedOrdersRevenue] = useState(0);
  const [galleryRevenues, setGalleryRevenues] = useState<GalleryRevenue[]>([]);
  const [galleryPotentials, setGalleryPotentials] = useState<GalleryPotential[]>([]);
  const [galleryOrderRevenues, setGalleryOrderRevenues] = useState<GalleryOrderRevenue[]>([]);
  const [galleryPerformance, setGalleryPerformance] = useState<GalleryPerformance[]>([]);
  const [revenueSplit, setRevenueSplit] = useState<RevenueSplit>({ gallery: 0, noa: 0, artist: 0, total: 0 });
  const [potentialSplit, setPotentialSplit] = useState<RevenueSplit>({ gallery: 0, noa: 0, artist: 0, total: 0 });
  const [ordersSplit, setOrdersSplit] = useState<RevenueSplit>({ gallery: 0, noa: 0, artist: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Store raw data so we can re-compute when exchange rates arrive
  const [rawArtworks, setRawArtworks] = useState<RawArtwork[]>([]);
  const [rawSales, setRawSales] = useState<RawSale[]>([]);
  const [rawProdOrders, setRawProdOrders] = useState<RawProdOrder[]>([]);
  // Per-order value from unconverted items only (excludes items already converted to artworks)
  const [prodOrderItemValues, setProdOrderItemValues] = useState<Record<string, { value: number; currency: string }>>({});
  const [galleryNameMap, setGalleryNameMap] = useState<Record<string, string>>({});
  const [galleryTypeMap, setGalleryTypeMap] = useState<Record<string, string>>({});
  const [galleryCommissionRates, setGalleryCommissionRates] = useState<Record<string, number>>({});
  const [galleryCommissionSplits, setGalleryCommissionSplits] = useState<Record<string, { gallery: number; noa: number; artist: number }>>({});
  const [consignmentDates, setConsignmentDates] = useState<Record<string, string>>({});

  // ---- Fetch raw data from Supabase (currency-agnostic) -------------------

  const fetchRawData = useCallback(async () => {
    // Fetch artworks
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('status, gallery_id, price, currency');

    if (error || !artworks) {
      setLoading(false);
      return;
    }

    setRawArtworks(artworks);

    // Fetch production orders (include gallery_id for per-gallery breakdown)
    const { data: prodOrders } = await supabase
      .from('production_orders')
      .select('id, price, currency, status, gallery_id')
      .not('status', 'in', '("draft","completed")');
    setRawProdOrders(prodOrders ?? []);

    // Fetch production order items (count + per-item values excluding converted)
    const activeOrderIds = (prodOrders ?? []).map((o) => o.id);
    let orderedItemCount = 0;
    const itemValMap: Record<string, { value: number; currency: string }> = {};
    if (activeOrderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('production_order_items')
        .select('production_order_id, quantity, price, currency, artwork_id')
        .in('production_order_id', activeOrderIds);
      orderedItemCount = (orderItems ?? []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      for (const item of orderItems ?? []) {
        if (item.artwork_id) continue; // converted → value moved to artwork potential revenue
        if (item.price != null && item.price > 0) {
          const qty = item.quantity ?? 1;
          if (!itemValMap[item.production_order_id]) {
            itemValMap[item.production_order_id] = { value: 0, currency: item.currency ?? 'EUR' };
          }
          itemValMap[item.production_order_id].value += item.price * qty;
          if (item.currency) itemValMap[item.production_order_id].currency = item.currency;
        }
      }
    }
    setProdOrderItemValues(itemValMap);

    // Stat counts (no currency needed)
    setStats({
      total: artworks.length,
      available: artworks.filter((a) => a.status === 'available').length,
      onConsignment: artworks.filter((a) => a.status === 'on_consignment').length,
      sold: artworks.filter((a) => a.status === 'sold').length,
      reserved: artworks.filter((a) => a.status === 'reserved').length,
      inProduction: (prodOrders ?? []).length,
      inTransit: artworks.filter((a) => a.status === 'in_transit').length,
      ordered: orderedItemCount,
    });

    // Gallery counts (no currency needed)
    const galleryIdCounts: Record<string, number> = {};
    const galleryConsignment: Record<string, number> = {};
    const gallerySold: Record<string, number> = {};
    const galleryAvailable: Record<string, number> = {};
    for (const row of artworks) {
      if (row.gallery_id) {
        galleryIdCounts[row.gallery_id] = (galleryIdCounts[row.gallery_id] || 0) + 1;
        if (row.status === 'on_consignment') {
          galleryConsignment[row.gallery_id] = (galleryConsignment[row.gallery_id] || 0) + 1;
        } else if (row.status === 'sold') {
          gallerySold[row.gallery_id] = (gallerySold[row.gallery_id] || 0) + 1;
        } else if (row.status === 'available') {
          galleryAvailable[row.gallery_id] = (galleryAvailable[row.gallery_id] || 0) + 1;
        }
      }
    }

    // Fetch sales with commission data
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_price, currency, gallery_id, sale_date, commission_percent, artwork_id');
    setRawSales(sales ?? []);

    // Collect all gallery IDs (artworks, sales, AND production orders)
    const allGalleryIds = new Set<string>();
    for (const row of artworks) {
      if (row.gallery_id) allGalleryIds.add(row.gallery_id);
    }
    for (const sale of sales ?? []) {
      if (sale.gallery_id) allGalleryIds.add(sale.gallery_id);
    }
    for (const po of prodOrders ?? []) {
      if (po.gallery_id) allGalleryIds.add(po.gallery_id);
    }

    // Fetch gallery names + commission rates + splits
    const galleryIds = Array.from(allGalleryIds);
    const nameMap: Record<string, string> = {};
    const typeMap: Record<string, string> = {};
    const commissionMap: Record<string, number> = {};
    const splitMap: Record<string, { gallery: number; noa: number; artist: number }> = {};
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name, type, commission_rate, commission_gallery, commission_noa, commission_artist')
        .in('id', galleryIds);
      for (const g of galleries ?? []) {
        nameMap[g.id] = g.name;
        typeMap[g.id] = g.type ?? 'primary_flagship';
        if (g.commission_rate != null) {
          commissionMap[g.id] = g.commission_rate;
        }
        if (g.commission_gallery != null || g.commission_noa != null || g.commission_artist != null) {
          splitMap[g.id] = {
            gallery: g.commission_gallery ?? 0,
            noa: g.commission_noa ?? 0,
            artist: g.commission_artist ?? 0,
          };
        }
      }
    }
    setGalleryNameMap(nameMap);
    setGalleryTypeMap(typeMap);
    setGalleryCommissionRates(commissionMap);
    setGalleryCommissionSplits(splitMap);

    // Fetch consignment movements for avg-days-to-sell calculation
    // Get the earliest consignment date per artwork
    const soldArtworkIds = (sales ?? [])
      .filter((s) => s.artwork_id)
      .map((s) => s.artwork_id as string);
    if (soldArtworkIds.length > 0) {
      const { data: movements } = await supabase
        .from('artwork_movements')
        .select('artwork_id, movement_date, movement_type')
        .in('artwork_id', soldArtworkIds)
        .eq('movement_type', 'consignment')
        .order('movement_date', { ascending: true });
      // Store earliest consignment date per artwork
      const dateMap: Record<string, string> = {};
      for (const m of movements ?? []) {
        if (!dateMap[m.artwork_id]) {
          dateMap[m.artwork_id] = m.movement_date;
        }
      }
      setConsignmentDates(dateMap);
    }

    // Set gallery counts
    const counts: GalleryCount[] = galleryIds
      .filter((gId) => galleryIdCounts[gId])
      .map((gId) => ({
        id: gId,
        name: nameMap[gId] || 'Unknown',
        count: galleryIdCounts[gId] || 0,
        onConsignment: galleryConsignment[gId] || 0,
        sold: gallerySold[gId] || 0,
        available: galleryAvailable[gId] || 0,
      }))
      .sort((a, b) => b.count - a.count);
    setGalleryCounts(counts);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRawData();
  }, [fetchRawData]);

  // ---- Re-compute monetary values when exchange rates are ready -----------

  useEffect(() => {
    if (!ratesReady || rawArtworks.length === 0 && rawSales.length === 0 && rawProdOrders.length === 0) return;

    // ---- Total potential revenue (unsold artworks → CHF) ----
    const unsold = rawArtworks.filter((a) => a.status !== 'sold' && a.price != null && a.price > 0);
    const potentialTotal = unsold.reduce(
      (sum, a) => sum + toCHF(a.price ?? 0, a.currency ?? 'EUR'),
      0,
    );
    setTotalPotential(potentialTotal);

    // Potential per gallery (CHF)
    const galleryPotentialMap: Record<string, number> = {};
    for (const row of unsold) {
      if (row.gallery_id) {
        galleryPotentialMap[row.gallery_id] =
          (galleryPotentialMap[row.gallery_id] || 0) + toCHF(row.price ?? 0, row.currency ?? 'EUR');
      }
    }

    const potentials: GalleryPotential[] = Object.entries(galleryPotentialMap)
      .map(([gId, pot]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        potential: pot,
      }))
      .sort((a, b) => b.potential - a.potential);
    setGalleryPotentials(potentials);

    // ---- Confirmed production orders revenue (CHF) — total + per gallery ----
    // Use per-item values excluding converted items (artwork_id set)
    const confirmedTotal = rawProdOrders.reduce((sum, o) => {
      const itemVal = prodOrderItemValues[o.id];
      if (itemVal && itemVal.value > 0) return sum + toCHF(itemVal.value, itemVal.currency);
      return sum;
    }, 0);
    setConfirmedOrdersRevenue(confirmedTotal);

    // Orders revenue per gallery (CHF)
    const galleryOrderMap: Record<string, { revenue: number; count: number }> = {};
    for (const po of rawProdOrders) {
      const itemVal = prodOrderItemValues[po.id];
      if (po.gallery_id && itemVal && itemVal.value > 0) {
        const chfVal = toCHF(itemVal.value, itemVal.currency);
        if (!galleryOrderMap[po.gallery_id]) {
          galleryOrderMap[po.gallery_id] = { revenue: 0, count: 0 };
        }
        galleryOrderMap[po.gallery_id].revenue += chfVal;
        galleryOrderMap[po.gallery_id].count += 1;
      }
    }
    const orderRevs: GalleryOrderRevenue[] = Object.entries(galleryOrderMap)
      .map(([gId, data]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        revenue: data.revenue,
        orderCount: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    setGalleryOrderRevenues(orderRevs);

    // ---- Sales revenue (CHF) ----
    const revenueTotal = rawSales.reduce(
      (sum, s) => sum + toCHF(s.sale_price ?? 0, s.currency ?? 'EUR'),
      0,
    );
    setTotalRevenue(revenueTotal);

    // Revenue per gallery (CHF)
    const galleryRevenueMap: Record<string, number> = {};
    for (const sale of rawSales) {
      if (sale.gallery_id) {
        galleryRevenueMap[sale.gallery_id] =
          (galleryRevenueMap[sale.gallery_id] || 0) + toCHF(sale.sale_price ?? 0, sale.currency ?? 'EUR');
      }
    }

    const revenues: GalleryRevenue[] = Object.entries(galleryRevenueMap)
      .map(([gId, rev]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        revenue: rev,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    setGalleryRevenues(revenues);

    // ---- Revenue split: Gallery / NOA / Artist (CHF) ----
    let splitGallery = 0;
    let splitNoa = 0;
    let splitArtist = 0;
    for (const sale of rawSales) {
      const chfPrice = toCHF(sale.sale_price ?? 0, sale.currency ?? 'EUR');
      if (sale.gallery_id && galleryCommissionSplits[sale.gallery_id]) {
        const split = galleryCommissionSplits[sale.gallery_id];
        splitGallery += chfPrice * (split.gallery / 100);
        splitNoa += chfPrice * (split.noa / 100);
        splitArtist += chfPrice * (split.artist / 100);
      } else {
        // No split defined — entire revenue attributed to artist/NOA
        splitArtist += chfPrice;
      }
    }
    setRevenueSplit({ gallery: splitGallery, noa: splitNoa, artist: splitArtist, total: revenueTotal });

    // ---- Potential Revenue Split: Gallery / NOA / Artist (CHF) ----
    let potSplitGallery = 0;
    let potSplitNoa = 0;
    let potSplitArtist = 0;
    for (const row of unsold) {
      const chfPrice = toCHF(row.price ?? 0, row.currency ?? 'EUR');
      if (row.gallery_id && galleryCommissionSplits[row.gallery_id]) {
        const split = galleryCommissionSplits[row.gallery_id];
        potSplitGallery += chfPrice * (split.gallery / 100);
        potSplitNoa += chfPrice * (split.noa / 100);
        potSplitArtist += chfPrice * (split.artist / 100);
      } else {
        potSplitArtist += chfPrice;
      }
    }
    setPotentialSplit({ gallery: potSplitGallery, noa: potSplitNoa, artist: potSplitArtist, total: potentialTotal });

    // ---- Confirmed Orders Revenue Split: Gallery / NOA / Artist (CHF) ----
    let ordSplitGallery = 0;
    let ordSplitNoa = 0;
    let ordSplitArtist = 0;
    for (const po of rawProdOrders) {
      const itemVal = prodOrderItemValues[po.id];
      if (!itemVal || itemVal.value <= 0) continue;
      const chfPrice = toCHF(itemVal.value, itemVal.currency);
      if (po.gallery_id && galleryCommissionSplits[po.gallery_id]) {
        const split = galleryCommissionSplits[po.gallery_id];
        ordSplitGallery += chfPrice * (split.gallery / 100);
        ordSplitNoa += chfPrice * (split.noa / 100);
        ordSplitArtist += chfPrice * (split.artist / 100);
      } else {
        ordSplitArtist += chfPrice;
      }
    }
    setOrdersSplit({ gallery: ordSplitGallery, noa: ordSplitNoa, artist: ordSplitArtist, total: confirmedTotal });

    // ---- Gallery Performance Analysis ----
    // Collect per-gallery: sell-through rate, revenue, commission, avg days to sell
    const allGalleryIds = new Set<string>();
    for (const a of rawArtworks) {
      if (a.gallery_id) allGalleryIds.add(a.gallery_id);
    }
    for (const s of rawSales) {
      if (s.gallery_id) allGalleryIds.add(s.gallery_id);
    }

    const perfMap: Record<string, {
      totalArtworks: number;
      sold: number;
      onConsignment: number;
      revenue: number;
      commission: number;
      daysToSell: number[];
    }> = {};

    // Initialise per gallery
    for (const gId of allGalleryIds) {
      perfMap[gId] = { totalArtworks: 0, sold: 0, onConsignment: 0, revenue: 0, commission: 0, daysToSell: [] };
    }

    // Artwork counts
    for (const a of rawArtworks) {
      if (!a.gallery_id || !perfMap[a.gallery_id]) continue;
      perfMap[a.gallery_id].totalArtworks += 1;
      if (a.status === 'sold') perfMap[a.gallery_id].sold += 1;
      if (a.status === 'on_consignment') perfMap[a.gallery_id].onConsignment += 1;
    }

    // Revenue + commission from sales
    for (const s of rawSales) {
      if (!s.gallery_id || !perfMap[s.gallery_id]) continue;
      const chfPrice = toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
      perfMap[s.gallery_id].revenue += chfPrice;

      // Commission: use sale's commission_percent if set, otherwise gallery default
      const commPct = s.commission_percent ?? galleryCommissionRates[s.gallery_id] ?? 0;
      perfMap[s.gallery_id].commission += chfPrice * (commPct / 100);

      // Days to sell: from consignment date to sale date
      if (s.artwork_id && s.sale_date && consignmentDates[s.artwork_id]) {
        const consignDate = new Date(consignmentDates[s.artwork_id]);
        const saleDate = new Date(s.sale_date);
        const diffDays = Math.floor((saleDate.getTime() - consignDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          perfMap[s.gallery_id].daysToSell.push(diffDays);
        }
      }
    }

    const performances: GalleryPerformance[] = Array.from(allGalleryIds)
      .map((gId) => {
        const p = perfMap[gId];
        const engagedCount = p.sold + p.onConsignment;
        return {
          id: gId,
          name: galleryNameMap[gId] || 'Unknown',
          totalArtworks: p.totalArtworks,
          sold: p.sold,
          onConsignment: p.onConsignment,
          sellThroughRate: engagedCount > 0 ? (p.sold / engagedCount) * 100 : 0,
          revenue: p.revenue,
          commission: p.commission,
          avgDaysToSell: p.daysToSell.length > 0
            ? Math.round(p.daysToSell.reduce((a, b) => a + b, 0) / p.daysToSell.length)
            : null,
        };
      })
      .filter((p) => p.totalArtworks > 0 || p.revenue > 0)
      .sort((a, b) => b.sellThroughRate - a.sellThroughRate);
    setGalleryPerformance(performances);
  }, [ratesReady, toCHF, rawArtworks, rawSales, rawProdOrders, prodOrderItemValues, galleryNameMap, galleryCommissionRates, galleryCommissionSplits, consignmentDates]);

  // ---- Stat cards ---------------------------------------------------------

  const statCards = stats
    ? [
        { label: 'Total Artworks', value: stats.total, onClick: () => navigate('/artworks') },
        { label: 'Available', value: stats.available, color: 'text-emerald-600' },
        { label: 'On Consignment', value: stats.onConsignment, color: 'text-sky-600' },
        { label: 'Sold', value: stats.sold, color: 'text-red-600' },
        { label: 'Reserved', value: stats.reserved, color: 'text-amber-600' },
        { label: 'In Production', value: stats.inProduction, color: 'text-blue-600', onClick: () => navigate('/production') },
        { label: 'Ordered', value: stats.ordered, color: 'text-violet-600', onClick: () => navigate('/production') },
      ]
    : [];

  // ---- Unified Gallery Ranking (merged from all gallery data) ---------------

  const chfFmt = useMemo(
    () => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    [],
  );

  const galleryRankings: GalleryRanking[] = useMemo(() => {
    // Collect every gallery id that appears in any dataset
    const allIds = new Set<string>();
    for (const g of galleryCounts) allIds.add(g.id);
    for (const g of galleryRevenues) allIds.add(g.id);
    for (const g of galleryOrderRevenues) allIds.add(g.id);
    for (const g of galleryPotentials) allIds.add(g.id);
    for (const g of galleryPerformance) allIds.add(g.id);

    // Build lookup maps for O(1) access
    const revenueMap = new Map(galleryRevenues.map((g) => [g.id, g.revenue]));
    const orderRevMap = new Map(galleryOrderRevenues.map((g) => [g.id, g.revenue]));
    const potentialMap = new Map(galleryPotentials.map((g) => [g.id, g.potential]));
    const countMap = new Map(galleryCounts.map((g) => [g.id, g]));
    const perfMap = new Map(galleryPerformance.map((g) => [g.id, g]));

    return Array.from(allIds)
      .map((gId) => {
        const counts = countMap.get(gId);
        const perf = perfMap.get(gId);
        const sold = counts?.sold ?? perf?.sold ?? 0;
        const consigned = counts?.onConsignment ?? perf?.onConsignment ?? 0;
        const engaged = sold + consigned;
        const split = galleryCommissionSplits[gId];
        const commissionSplit = split
          ? `${split.gallery}/${split.noa}/${split.artist}`
          : '—';

        return {
          id: gId,
          name: galleryNameMap[gId] || 'Unknown',
          type: galleryTypeMap[gId] || 'primary_flagship',
          totalRevenue: revenueMap.get(gId) ?? 0,
          ordersRevenue: orderRevMap.get(gId) ?? 0,
          potentialRevenue: potentialMap.get(gId) ?? 0,
          artworksSold: sold,
          artworksConsigned: consigned,
          sellThroughRate: engaged > 0 ? (sold / engaged) * 100 : 0,
          commissionSplit,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [galleryCounts, galleryRevenues, galleryOrderRevenues, galleryPotentials, galleryPerformance, galleryCommissionSplits, galleryNameMap, galleryTypeMap]);

  return (
    <div>
      {/* Stat cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className="rounded-lg border border-primary-100 bg-white p-3 sm:p-6 text-left transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                {stat.label}
              </p>
              <p className={`mt-2 font-display text-xl sm:text-3xl font-bold ${stat.color ?? 'text-primary-900'}`}>
                {stat.value}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Revenue Overview — summary cards + split table in one Card */}
      {!loading && (
        <Card className="mt-10 p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-primary-900">
            Revenue Overview
          </h2>

          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-primary-100 bg-primary-50/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Total Revenue (Sales)
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
                {formatCurrency(totalRevenue, 'CHF')}
              </p>
            </div>
            <div className="rounded-lg border border-primary-100 bg-primary-50/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Total Potential Revenue
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-accent">
                {formatCurrency(totalPotential, 'CHF')}
              </p>
              <p className="mt-1 text-xs text-primary-400">
                Unsold artworks with prices
              </p>
            </div>
            <div
              className="cursor-pointer rounded-lg border border-primary-100 bg-primary-50/30 p-5 transition-shadow hover:shadow-md"
              onClick={() => navigate('/production')}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Confirmed Orders Revenue
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-blue-600">
                {formatCurrency(confirmedOrdersRevenue, 'CHF')}
              </p>
              <p className="mt-1 text-xs text-primary-400">
                Active production orders
              </p>
            </div>
          </div>

          {/* Revenue Split Table */}
          {(revenueSplit.total > 0 || potentialSplit.total > 0 || ordersSplit.total > 0) && (
            <>
              <h3 className="mb-3 mt-6 font-display text-sm font-semibold text-primary-700">
                Revenue Split
              </h3>

              <div className="overflow-x-auto rounded-lg border border-primary-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary-100 bg-primary-50/50">
                      <th className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-primary-500">Revenue Type</th>
                      <th className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-sky-600">Gallery</th>
                      <th className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-amber-600">NOA</th>
                      <th className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-emerald-600">Artist</th>
                      <th className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-primary-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50">
                    {/* Sales Revenue Split */}
                    {revenueSplit.total > 0 && (
                      <tr>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-primary-900">
                          Sales Revenue
                          <div className="mt-1 flex h-2 w-24 overflow-hidden rounded-full bg-primary-100">
                            <div className="bg-sky-500" style={{ width: `${(revenueSplit.gallery / revenueSplit.total) * 100}%` }} />
                            <div className="bg-amber-500" style={{ width: `${(revenueSplit.noa / revenueSplit.total) * 100}%` }} />
                            <div className="bg-emerald-500" style={{ width: `${(revenueSplit.artist / revenueSplit.total) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-sky-600">
                          {formatCurrency(revenueSplit.gallery, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((revenueSplit.gallery / revenueSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-amber-600">
                          {formatCurrency(revenueSplit.noa, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((revenueSplit.noa / revenueSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-emerald-600">
                          {formatCurrency(revenueSplit.artist, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((revenueSplit.artist / revenueSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right font-semibold text-primary-900">
                          {formatCurrency(revenueSplit.total, 'CHF')}
                        </td>
                      </tr>
                    )}

                    {/* Potential Revenue Split */}
                    {potentialSplit.total > 0 && (
                      <tr>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-primary-900">
                          Potential Revenue
                          <div className="mt-1 flex h-2 w-24 overflow-hidden rounded-full bg-primary-100">
                            <div className="bg-sky-500" style={{ width: `${(potentialSplit.gallery / potentialSplit.total) * 100}%` }} />
                            <div className="bg-amber-500" style={{ width: `${(potentialSplit.noa / potentialSplit.total) * 100}%` }} />
                            <div className="bg-emerald-500" style={{ width: `${(potentialSplit.artist / potentialSplit.total) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-sky-600">
                          {formatCurrency(potentialSplit.gallery, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((potentialSplit.gallery / potentialSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-amber-600">
                          {formatCurrency(potentialSplit.noa, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((potentialSplit.noa / potentialSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-emerald-600">
                          {formatCurrency(potentialSplit.artist, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((potentialSplit.artist / potentialSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right font-semibold text-primary-900">
                          {formatCurrency(potentialSplit.total, 'CHF')}
                        </td>
                      </tr>
                    )}

                    {/* Confirmed Orders Revenue Split */}
                    {ordersSplit.total > 0 && (
                      <tr>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-primary-900">
                          Confirmed Orders
                          <div className="mt-1 flex h-2 w-24 overflow-hidden rounded-full bg-primary-100">
                            <div className="bg-sky-500" style={{ width: `${(ordersSplit.gallery / ordersSplit.total) * 100}%` }} />
                            <div className="bg-amber-500" style={{ width: `${(ordersSplit.noa / ordersSplit.total) * 100}%` }} />
                            <div className="bg-emerald-500" style={{ width: `${(ordersSplit.artist / ordersSplit.total) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-sky-600">
                          {formatCurrency(ordersSplit.gallery, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((ordersSplit.gallery / ordersSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-amber-600">
                          {formatCurrency(ordersSplit.noa, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((ordersSplit.noa / ordersSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right text-emerald-600">
                          {formatCurrency(ordersSplit.artist, 'CHF')}
                          <span className="ml-1 text-xs text-primary-400">
                            ({((ordersSplit.artist / ordersSplit.total) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-right font-semibold text-primary-900">
                          {formatCurrency(ordersSplit.total, 'CHF')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-primary-400">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Gallery</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> NOA</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Artist</span>
                <span className="ml-auto">Based on commission splits per gallery profile</span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Gallery Ranking — grouped by type */}
      {!loading && galleryRankings.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Gallery Ranking
          </h2>

          {(['primary_flagship', 'regional_partner', 'project_partner', 'sales_agent', 'terminated'] as const).map((galleryType) => {
            const sectionLabel =
              galleryType === 'primary_flagship'
                ? 'Primary Flagship Galleries'
                : galleryType === 'regional_partner'
                  ? 'Regional Partners'
                  : galleryType === 'project_partner'
                    ? 'Project Partners'
                    : galleryType === 'sales_agent'
                      ? 'Sales Agents / Intermediaries'
                      : 'Terminated Partners';
            const sectionGalleries = galleryRankings.filter((gr) => gr.type === galleryType);
            if (sectionGalleries.length === 0) return null;

            return (
              <div key={galleryType} className="mb-6">
                <h3 className="mb-2 font-display text-sm font-semibold text-primary-700">
                  {sectionLabel}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-primary-100 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-100 bg-primary-50/50">
                        <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-medium text-primary-500">#</th>
                        <th className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-primary-500">Gallery Name</th>
                        <th className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-primary-500">Total Revenue</th>
                        <th className="hidden px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-primary-500 sm:table-cell">Orders Revenue</th>
                        <th className="hidden px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-primary-500 md:table-cell">Potential Revenue</th>
                        <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-medium text-primary-500">Sold</th>
                        <th className="hidden px-2 py-2 sm:px-4 sm:py-3 text-center font-medium text-primary-500 sm:table-cell">Consigned</th>
                        <th className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-primary-500">Sell-Through</th>
                        <th className="hidden px-2 py-2 sm:px-4 sm:py-3 text-center font-medium text-primary-500 md:table-cell">Commission Split</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-50">
                      {sectionGalleries.map((gr, idx) => (
                        <tr
                          key={gr.id}
                          className={`cursor-pointer transition-colors hover:bg-primary-50/50 ${idx % 2 === 1 ? 'bg-primary-50/25' : ''}`}
                          onClick={() => navigate(`/galleries/${gr.id}`)}
                        >
                          <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-bold text-primary-400">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-primary-900">
                            {gr.name}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-emerald-600">
                            {gr.totalRevenue > 0 ? chfFmt.format(gr.totalRevenue) : '—'}
                          </td>
                          <td className="hidden px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-blue-600 sm:table-cell">
                            {gr.ordersRevenue > 0 ? chfFmt.format(gr.ordersRevenue) : '—'}
                          </td>
                          <td className="hidden px-2 py-2 sm:px-4 sm:py-3 text-right font-medium text-amber-600 md:table-cell">
                            {gr.potentialRevenue > 0 ? chfFmt.format(gr.potentialRevenue) : '—'}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-primary-600">
                            {gr.artworksSold}
                          </td>
                          <td className="hidden px-2 py-2 sm:px-4 sm:py-3 text-center text-primary-600 sm:table-cell">
                            {gr.artworksConsigned}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-10 sm:w-16 overflow-hidden rounded-full bg-primary-100">
                                <div
                                  className={`h-full rounded-full ${
                                    gr.sellThroughRate >= 60
                                      ? 'bg-emerald-500'
                                      : gr.sellThroughRate >= 30
                                        ? 'bg-amber-500'
                                        : 'bg-red-400'
                                  }`}
                                  style={{ width: `${Math.min(gr.sellThroughRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-primary-600">
                                {gr.sellThroughRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="hidden px-2 py-2 sm:px-4 sm:py-3 text-center text-xs text-primary-500 md:table-cell">
                            {gr.commissionSplit !== '—' ? (
                              <span className="inline-flex items-center gap-0.5">
                                <span className="font-medium text-sky-600">G</span>{gr.commissionSplit.split('/')[0]}%
                                <span className="mx-0.5 text-primary-300">/</span>
                                <span className="font-medium text-amber-600">N</span>{gr.commissionSplit.split('/')[1]}%
                                <span className="mx-0.5 text-primary-300">/</span>
                                <span className="font-medium text-emerald-600">A</span>{gr.commissionSplit.split('/')[2]}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <p className="mt-2 text-xs text-primary-400">
            Sorted by total revenue. Sell-through = Sold / (Sold + Consigned). Commission Split = Gallery / NOA / Artist.
          </p>
        </div>
      )}

      {/* Business Analyses Section */}
      {!loading && !analyticsLoading && analyticsData && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Business Analyses
          </h2>
          <div className="space-y-6">
            {/* Row 1: Profit & Loss + Sales Funnel */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ProfitLossCard data={analyticsData.profitLoss} />
              <SalesFunnelChart data={analyticsData.salesFunnel} />
            </div>

            {/* Row 2: Collector LTV + Price Intelligence */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CollectorLTVTable data={analyticsData.collectorLTV} />
              <PriceIntelligenceCard data={analyticsData.priceIntelligence} />
            </div>

            {/* Row 3: Cash Flow (full width) */}
            <CashFlowChart data={analyticsData.cashFlow} />

            {/* Row 4: Consignment Aging + Exhibition Impact */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ConsignmentAgingChart data={analyticsData.inventoryAging} />
              <ExhibitionImpactTable data={analyticsData.exhibitionImpact} />
            </div>

            {/* Row 5: Viewing Room Engagement + Geographic Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ViewingRoomEngagement data={analyticsData.viewingRoomEngagement} />
              <GeoDistributionChart data={analyticsData.geoDistribution} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
